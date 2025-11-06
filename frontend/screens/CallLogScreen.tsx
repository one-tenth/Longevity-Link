import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE = 'http://192.168.0.24:8000';

type ServerCall = {
  [key: string]: any;
  CallId: number;
  UserId: number;
  PhoneName: string;
  Phone: string;
  PhoneTime: string;
  PhoneTime_tw?: string;
  status?: string;
  Type?: string | number;
  duration_sec?: number;
  IsScam: boolean;
};

const safeStr = (v: any) => (v == null ? '' : String(v).trim());
const normalizePhone = (p: string) =>
  (p || '').replace(/\D/g, '').replace(/^886(?=\d{9,})/, '0');
const displayName = (n?: string) => (n && n.trim().length > 0 ? n.trim() : '未知來電');
const displayPhoneOrUnknown = (p?: string, n?: string) => {
  const phone = safeStr(p);
  return phone || displayName(n);
};

function pick<T = any>(obj: Record<string, any>, ...names: string[]): T | undefined {
  for (const n of names) {
    if (n in obj && obj[n] !== undefined && obj[n] !== null && String(obj[n]) !== '') {
      return obj[n] as T;
    }
  }
  return undefined;
}

function normalizeType(input?: string | number) {
  const s = safeStr(input).toUpperCase();
  if (!s) return 'UNKNOWN';
  if (s === '1') return 'INCOMING';
  if (s === '2') return 'OUTGOING';
  if (s === '3') return 'MISSED';
  if (s === '4') return 'VOICEMAIL';
  if (s === '5') return 'REJECTED';
  if (s === '6') return 'BLOCKED';
  if (s === '7') return 'ANSWERED_EXTERNALLY';
  const allow = new Set(['INCOMING', 'OUTGOING', 'MISSED', 'REJECTED', 'BLOCKED', 'VOICEMAIL']);
  return allow.has(s) ? s : 'UNKNOWN';
}

function typeLabel(input?: string | number) {
  switch (normalizeType(input)) {
    case 'INCOMING': return '來電';
    case 'OUTGOING': return '撥出';
    case 'MISSED': return '未接';
    case 'REJECTED': return '已拒接';
    case 'BLOCKED': return '已封鎖';
    case 'VOICEMAIL': return '語音信箱';
    default: return '未知';
  }
}

function fmtDuration(sec?: number) {
  const s = Number(sec || 0);
  if (!isFinite(s) || s <= 0) return '0s';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function parseAnyDateToUTCms(input?: string | number): number | null {
  if (input == null) return null;
  if (typeof input === 'number' || /^\d+$/.test(String(input))) {
    const n = Number(input);
    return n > 10_000_000_000 ? n : n * 1000;
  }
  const s = String(input).trim();
  const p = Date.parse(s);
  if (!Number.isNaN(p)) return p;
  const m = s.match(
    /(\d{4})\D?(\d{1,2})\D?(\d{1,2})(?:\D+(\d{1,2}))?(?::?(\d{1,2}))?(?::?(\d{1,2}))?/,
  );
  if (m) {
    const [_, Y, M, D, HH, mm, ss] = m;
    const utcMs =
      Date.UTC(+Y, +M - 1, +D, +(HH || 0), +(mm || 0), +(ss || 0)) - 8 * 3600 * 1000;
    return utcMs;
  }
  return null;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
function formatTW(input?: string | number) {
  const utcMs = parseAnyDateToUTCms(input);
  if (utcMs == null) return '無效時間';
  const tw = new Date(utcMs + 8 * 3600 * 1000);
  return `${tw.getUTCFullYear()}-${pad2(tw.getUTCMonth() + 1)}-${pad2(tw.getUTCDate())} ${pad2(
    tw.getUTCHours(),
  )}:${pad2(tw.getUTCMinutes())}:${pad2(tw.getUTCSeconds())}`;
}

/* ---------- Token ---------- */
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

/* ---------- 分析：新號碼 / 短時間連續 ---------- */
/**
 * 規則：
 * 1. 有聯絡人名稱 → 直接跳過，不標任何一種風險
 * 2. 新號碼 = 這支號碼在這批 logs 裡只出現一次 && 沒有任何一筆有 PhoneName
 * 3. 短時間連續 = 同一號碼兩通通話時間差 <= 10 分鐘（也只針對沒名字的）
 */
function analyzeCallPatterns(logs: ServerCall[]) {
  // 時間新→舊
  const sorted = [...logs].sort((a, b) => {
    const ta = parseAnyDateToUTCms(a.PhoneTime_tw || a.PhoneTime) ?? 0;
    const tb = parseAnyDateToUTCms(b.PhoneTime_tw || b.PhoneTime) ?? 0;
    return tb - ta;
  });

  // 收集每支號碼的時間 & 是否有名字
  const phoneInfo: Record<string, { times: number[]; hasName: boolean }> = {};

  for (const item of sorted) {
    const pn = normalizePhone(item.Phone || '');
    const t = parseAnyDateToUTCms(item.PhoneTime_tw || item.PhoneTime);
    if (!pn || t == null) continue;
    const hasNameHere = !!(item.PhoneName && item.PhoneName.trim().length > 0);

    if (!phoneInfo[pn]) {
      phoneInfo[pn] = { times: [], hasName: false };
    }
    phoneInfo[pn].times.push(t);
    if (hasNameHere) {
      phoneInfo[pn].hasName = true;
    }
  }

  const newNumbers: Record<string, boolean> = {};
  const burstNumbers: Record<string, boolean> = {};
  const BURST_WINDOW_MS = 10 * 60 * 1000;

  for (const [phone, info] of Object.entries(phoneInfo)) {
    const { times, hasName } = info;

    // ✅ 有名字就不用看了
    if (hasName) {
      continue;
    }

    // ✅ 新號碼：只出現一次 & 沒有名字（上面已經確保沒名字）
    if (times.length === 1) {
      newNumbers[phone] = true;
    }

    // 🔁 短時間連續：只做在沒名字的號碼上
    for (let i = 0; i < times.length - 1; i++) {
      if (Math.abs(times[i] - times[i + 1]) <= BURST_WINDOW_MS) {
        burstNumbers[phone] = true;
        break;
      }
    }
  }

  return { newNumbers, burstNumbers };
}

/* ---------- 主畫面 ---------- */
export default function CallLogScreen() {
  const navigation = useNavigation();
  const [elderId, setElderId] = useState<number | null>(null);
  const [elderName, setElderName] = useState<string>('');
  const [scamMap, setScamMap] = useState<Record<string, string>>({});
  const [serverLogs, setServerLogs] = useState<ServerCall[]>([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [newNumberSet, setNewNumberSet] = useState<Record<string, boolean>>({});
  const [burstNumberSet, setBurstNumberSet] = useState<Record<string, boolean>>({});

  async function loadSelectedElder() {
    const [eid, ename] = await Promise.all([
      AsyncStorage.getItem('elder_id'),
      AsyncStorage.getItem('elder_name'),
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
      const logs = res.data ?? [];
      setServerLogs(logs);
      const { newNumbers, burstNumbers } = analyzeCallPatterns(logs);
      setNewNumberSet(newNumbers);
      setBurstNumberSet(burstNumbers);
    } finally {
      setLoadingServer(false);
    }
  }

  useEffect(() => { loadSelectedElder(); }, []);
  useEffect(() => { if (elderId) loadServerLogs(); }, [elderId]);

  // 查 scam 資料表
  useEffect(() => {
    async function fetchScamData() {
      const phones = serverLogs.map((log) => normalizePhone(log.Phone));
      if (!phones.length) return;
      try {
        const res = await axios.post(`${API_BASE}/api/scam/check_bulk/`, { phones });
        setScamMap(res.data?.matches || {});
      } catch (e) {
        console.error('fetchScamData error', e);
      }
    }
    if (serverLogs.length) fetchScamData();
  }, [serverLogs]);

  const renderServerItem = ({ item }: { item: ServerCall }) => {
    const phoneNorm = normalizePhone(item.Phone || '');
    const category = scamMap[phoneNorm];
    const hitScamDB = !!category;

    // 這兩個 set 現在只會裝「沒名字」的號碼
    const isNewNumber = !!newNumberSet[phoneNorm];
    const isBurst = !!burstNumberSet[phoneNorm];

    const type = typeLabel(
      pick(item, 'status', 'Type', 'CallType', 'Direction', 'call_type', 'type_text')
    );
    const durationText = fmtDuration(Number(pick(item, 'duration_sec', 'Duration') || 0));
    const twTime = formatTW(item.PhoneTime_tw || item.PhoneTime);

    // 顏色優先順序：scam(紅) > 新號碼/短時間(黃) > 其他(白)
    let itemStyle = styles.item;
    let phoneStyle = styles.phone;
    if (hitScamDB) {
      itemStyle = [styles.item, styles.itemScam];
      phoneStyle = [styles.phone, { color: '#B71C1C' }];
    } else if (isNewNumber || isBurst) {
      itemStyle = [styles.item, styles.itemWarn];
      phoneStyle = [styles.phone, { color: '#E65100' }];
    }

    return (
      <View style={itemStyle}>
        <Text style={phoneStyle}>
          {displayPhoneOrUnknown(item.Phone, item.PhoneName)}
          {hitScamDB && <Text style={styles.scamTag}> {category}</Text>}
          {isNewNumber && <Text style={styles.infoTag}> 新號碼</Text>}
          {isBurst && <Text style={styles.warnTag}> 短時間連續來電</Text>}
        </Text>
        <Text style={styles.detail}>
          名稱：{displayName(item.PhoneName)} · 類型：{type}{'\n'}
          時間：{twTime} · 時長：{durationText}
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

/* ---------- 樣式 ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 64 },
  backText: { color: '#111', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#111' },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  itemScam: {
    borderWidth: 1.5,
    borderColor: '#E53935',
    backgroundColor: '#FFF4F4',
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 6,
  },
  itemWarn: {
    borderWidth: 1.5,
    borderColor: '#FFB300',
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 6,
  },
  phone: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  detail: { fontSize: 15, color: '#555', marginTop: 4, lineHeight: 22 },
  empty: { textAlign: 'center', color: '#888', marginTop: 30 },
  scamTag: {
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
    backgroundColor: '#FDECEC',
    color: '#C62828',
    fontWeight: 'bold',
  },
  infoTag: {
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
    backgroundColor: '#FFF3E0',
    color: '#FFB300',
    fontWeight: 'bold',
  },
  warnTag: {
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
    backgroundColor: '#FFE0B2',
    color: '#E65100',
    fontWeight: 'bold',
  },
});
