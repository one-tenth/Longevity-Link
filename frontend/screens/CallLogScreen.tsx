import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE = 'http://192.168.0.24:8000';

// ===== 型別 =====
type ServerCall = {
  CallId: number;
  UserId: number;
  PhoneName: string;
  Phone: string;
  PhoneTime: string;         // 後端 UTC 或 ISO
  PhoneTime_tw?: string;     // 若後端有回台灣時間就用它
  status?: string;           // 新版欄位
  Type?: string | number;    // 舊版/可能數字（相容）
  duration_sec?: number;     // 秒數
  IsScam: boolean;
};

const safeStr = (v: any) => (v == null ? '' : String(v).trim());

// 正規化電話號碼（+886 -> 0，去非數字）
const normalizePhone = (p: string) =>
  (p || '').replace(/\D/g, '').replace(/^886(?=\d{9,})/, '0');

// 顯示名稱（空則顯示「未知來電」）
const displayName = (n?: string) => (n && n.trim().length > 0 ? n.trim() : '未知來電');

// 顯示電話或名稱
const displayPhoneOrUnknown = (p?: string, n?: string) => {
  const phone = safeStr(p);
  return phone || displayName(n);
};

// 把 status / Type 正規化成標準字串
function normalizeType(input?: string | number) {
  const s = safeStr(input).toUpperCase();
  if (!s) return 'UNKNOWN';
  // 數字映射（Android CallLog.Calls.TYPE）
  if (s === '1') return 'INCOMING';
  if (s === '2') return 'OUTGOING';
  if (s === '3') return 'MISSED';
  if (s === '4') return 'VOICEMAIL';
  if (s === '5') return 'REJECTED';
  if (s === '6') return 'BLOCKED';
  if (s === '7') return 'ANSWERED_EXTERNALLY';
  // 字面
  const allow = new Set([
    'INCOMING','OUTGOING','MISSED','REJECTED','BLOCKED','VOICEMAIL','ANSWERED_EXTERNALLY'
  ]);
  return allow.has(s) ? s : 'UNKNOWN';
}

// 類型中文
function typeLabel(input?: string | number) {
  switch (normalizeType(input)) {
    case 'INCOMING': return '來電';
    case 'OUTGOING': return '撥出';
    case 'MISSED': return '未接';
    case 'REJECTED': return '已拒接';
    case 'BLOCKED': return '已封鎖';
    case 'VOICEMAIL': return '語音信箱';
    case 'ANSWERED_EXTERNALLY': return '其他裝置接聽';
    default: return '未知';
  }
}

// 秒數 → 人類可讀
function fmtDuration(sec?: number) {
  const s = Number(sec || 0);
  if (!isFinite(s) || s <= 0) return '0s';
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}

/* ===========================
   時間：強韌解析 → 固定輸出 "YYYY-MM-DD HH:MM:SS"（台灣）
   =========================== */

// 盡可能把各種輸入轉成「UTC 毫秒」
function parseAnyDateToUTCms(input?: string | number): number | null {
  if (input == null) return null;

  // 數字或數字字串：epoch 秒/毫秒
  if (typeof input === 'number' || /^\d+$/.test(String(input))) {
    const n = Number(input);
    if (!isFinite(n)) return null;
    return n > 10_000_000_000 ? n : n * 1000; // 13位毫秒 / 10位秒
  }

  const s = String(input).trim();

  // 原生 Date.parse（ISO: 2025-10-07T15:12:22Z / +08:00）
  const p = Date.parse(s);
  if (!Number.isNaN(p)) return p; // 已是 UTC 毫秒

  // 嘗試常見非 ISO：YYYY-MM-DD HH:MM[:SS] 或 YYYY/MM/DD ...
  const m = s.match(
    /(\d{4})\D?(\d{1,2})\D?(\d{1,2})(?:\D+(\d{1,2}))?(?::?(\d{1,2}))?(?::?(\d{1,2}))?/
  );
  if (m) {
    const Y = Number(m[1]),
      M = Math.max(1, Math.min(12, Number(m[2] || 1))),
      D = Math.max(1, Math.min(31, Number(m[3] || 1))),
      HH = Number(m[4] || 0),
      mm = Number(m[5] || 0),
      ss = Number(m[6] || 0);
    // 無時區 → 視為台灣本地時間；換算成 UTC 毫秒：TW(UTC+8) → 減 8 小時
    const utcMs = Date.UTC(Y, M - 1, D, HH, mm, ss) - 8 * 3600 * 1000;
    return utcMs;
  }

  return null;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

// 最終輸出：台灣時間 "YYYY-MM-DD HH:MM:SS"
function formatTW(input?: string | number) {
  const utcMs = parseAnyDateToUTCms(input);
  if (utcMs == null) return '無效時間';
  // 台灣 = UTC+8（無 DST）
  const tw = new Date(utcMs + 8 * 3600 * 1000);
  const y = tw.getUTCFullYear();
  const m = pad2(tw.getUTCMonth() + 1);
  const d = pad2(tw.getUTCDate());
  const hh = pad2(tw.getUTCHours());
  const mm = pad2(tw.getUTCMinutes());
  const ss = pad2(tw.getUTCSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

// ====== Auth helpers ======
async function refreshAccessToken() {
  try {
    const refresh = await AsyncStorage.getItem('refresh');
    if (!refresh) return false;
    const r = await axios.post(`${API_BASE}/api/token/refresh/`, { refresh });
    const newAccess = r.data?.access;
    if (!newAccess) return false;
    await AsyncStorage.setItem('access', newAccess);
    return true;
  } catch {
    return false;
  }
}

async function authGet<T = any>(url: string) {
  let access = await AsyncStorage.getItem('access');
  try {
    if (!access) throw { response: { status: 401 } };
    return await axios.get<T>(url, { headers: { Authorization: `Bearer ${access}` } });
  } catch (e: any) {
    if (e?.response?.status === 401 && (await refreshAccessToken())) {
      access = await AsyncStorage.getItem('access');
      return await axios.get<T>(url, { headers: { Authorization: `Bearer ${access}` } });
    }
    throw e;
  }
}

async function authPost<T = any>(url: string, data: any) {
  let access = await AsyncStorage.getItem('access');
  try {
    if (!access) throw { response: { status: 401 } };
    return await axios.post<T>(url, data, { headers: { Authorization: `Bearer ${access}` } });
  } catch (e: any) {
    if (e?.response?.status === 401 && (await refreshAccessToken())) {
      access = await AsyncStorage.getItem('access');
      return await axios.post<T>(url, data, { headers: { Authorization: `Bearer ${access}` } });
    }
    throw e;
  }
}

export default function CallLogScreen() {
  const navigation = useNavigation();
  const [elderId, setElderId] = useState<number | null>(null);
  const [elderName, setElderName] = useState<string>('');
  const [scamMap, setScamMap] = useState<Record<string, string>>({});
  const [serverLogs, setServerLogs] = useState<ServerCall[]>([]);
  const [loadingServer, setLoadingServer] = useState(false);

  async function loadSelectedElder() {
    const [eid, ename] = await Promise.all([
      AsyncStorage.getItem('elder_id'),
      AsyncStorage.getItem('elder_name')
    ]);
    setElderId(eid ? Number(eid) : null);
    setElderName(ename || '');
  }

  async function loadServerLogs() {
    const elderId = await AsyncStorage.getItem('elder_id');
    if (!elderId) return;
    setLoadingServer(true);
    try {
      const res = await authGet<ServerCall[]>(`${API_BASE}/api/callrecords/${elderId}/`);
      setServerLogs(res.data ?? []);
    } catch (error) {
      console.error('[loadServerLogs] error:', error);
    } finally {
      setLoadingServer(false);
    }
  }

  useEffect(() => { loadSelectedElder(); }, []);
  useEffect(() => { if (elderId) loadServerLogs(); }, [elderId]);

  // 取詐騙標註
  useEffect(() => {
    async function fetchScamData() {
      const phones = serverLogs.map((log) => normalizePhone(log.Phone));
      if (!phones.length) return;
      try {
        const res = await axios.post(`${API_BASE}/api/scam/check_bulk/`, { phones });
        const scamData = res.data?.matches || {};
        setScamMap(scamData);
      } catch (error) {
        console.error('Error fetching scam data:', error);
      }
    }
    if (serverLogs.length > 0) fetchScamData();
  }, [serverLogs]);

  // 單筆項目
  const renderServerItem = ({ item }: { item: ServerCall }) => {
    const phoneNorm = normalizePhone(item.Phone || '');
    const category = scamMap[phoneNorm];
    const hit = !!category;

    // 類型：優先 status；沒有就用 Type（數字/字面）
    const type = typeLabel(item.status ?? item.Type);

    // 時間（台灣，含秒）："YYYY-MM-DD HH:MM:SS"
    const twTime = formatTW(item.PhoneTime_tw || item.PhoneTime);

    const durationText = fmtDuration(item.duration_sec);

    return (
      <View style={[styles.item, hit && styles.itemScam]}>
        <Text style={[styles.phone, hit && { color: '#B71C1C' }]}>
          {displayPhoneOrUnknown(item.Phone, item.PhoneName)}
          {hit && <Text style={styles.scamTag}> {category}</Text>}
        </Text>

        <Text style={styles.detail}>
          {`名稱：${displayName(item.PhoneName)} · 類型：${type} · 時間：${twTime} · 時長：${durationText}`}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#111" />
          <Text style={styles.backText}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>通話紀錄 {elderName && `(${elderName})`}</Text>
      </View>

      <FlatList
        data={serverLogs}
        keyExtractor={(item) => String(item.CallId ?? Math.random())}
        renderItem={renderServerItem}
        refreshing={loadingServer}
        onRefresh={loadServerLogs}
        ListEmptyComponent={<Text style={styles.empty}>目前沒有通話紀錄</Text>}
      />
    </View>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 64 },
  backText: { color: '#111', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#111' },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  itemScam: {
    borderWidth: 1.5, borderColor: '#E53935', backgroundColor: '#FFF4F4',
    borderRadius: 10, marginHorizontal: 12, marginVertical: 6,
  },
  phone: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  detail: { fontSize: 15, color: '#555', marginTop: 4, lineHeight: 22 },
  empty: { textAlign: 'center', color: '#888', marginTop: 30 },
  scamTag: {
    fontSize: 12, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, marginLeft: 6, backgroundColor: '#FDECEC', color: '#C62828', fontWeight: 'bold',
  },
});
