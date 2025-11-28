import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE = 'https://caremate.ntub.edu.tw';

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

// 👇 新增：判斷這個名字是不是「真的聯絡人」
const isRealContactName = (n?: string) => {
  const s = safeStr(n);
  if (!s) return false;
  // 這裡列出後端可能給的 placeholder 名稱
  const placeholders = ['未知來電', 'unknown', 'Unknown', 'UNKNOWN', '未儲存', '未儲存來電'];
  return !placeholders.includes(s);
};

const displayName = (n?: string) =>
  isRealContactName(n) ? safeStr(n) : '未知來電';

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
function analyzeCallPatterns(logs: ServerCall[]) {
  const sorted = [...logs].sort((a, b) => {
    const ta = parseAnyDateToUTCms(a.PhoneTime_tw || a.PhoneTime) ?? 0;
    const tb = parseAnyDateToUTCms(b.PhoneTime_tw || b.PhoneTime) ?? 0;
    return tb - ta;
  });

  const phoneInfo: Record<string, { times: number[]; hasName: boolean }> = {};

  for (const item of sorted) {
    const pn = normalizePhone(item.Phone || '');
    const t = parseAnyDateToUTCms(item.PhoneTime_tw || item.PhoneTime);
    if (!pn || t == null) continue;

    const hasNameHere = isRealContactName(item.PhoneName); // 👈 改用新判斷

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

    if (hasName) continue;

    if (times.length === 1) {
      newNumbers[phone] = true;
    }

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

  useEffect(() => {
    async function fetchScamData() {
      const phones = Array.from(
        new Set(serverLogs.map((log) => normalizePhone(log.Phone || '')).filter(Boolean))
      );
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

    const hasName = isRealContactName(item.PhoneName); // 👈 同樣用新判斷
    const isNewNumber = !hasName && !!newNumberSet[phoneNorm];
    const isBurst = !hasName && !!burstNumberSet[phoneNorm];

    const type = typeLabel(
      pick(item, 'status', 'Type', 'CallType', 'Direction', 'call_type', 'type_text')
    );
    const durationText = fmtDuration(Number(pick(item, 'duration_sec', 'Duration') || 0));
    const twTime = formatTW(item.PhoneTime_tw || item.PhoneTime);

    let itemStyle = styles.item;
    let phoneStyle = styles.phone;
    if (hitScamDB) {
      itemStyle = [styles.item, styles.itemScam];
      phoneStyle = [styles.phone, { color: '#B71C1C' }];
    } else if (!hasName) {
      // ⭐ 只要不是「真正的聯絡人名稱」 → 黃色
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
        keyExtractor={(item) => {
          const t = parseAnyDateToUTCms(item.PhoneTime_tw || item.PhoneTime) ?? 0;
          const id = item.CallId ?? `${normalizePhone(item.Phone || '')}-${t}`;
          return String(id);
        }}
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
