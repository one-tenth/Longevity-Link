// screens/CallLogScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  PermissionsAndroid, TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import CallLogs from 'react-native-call-log';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

<<<<<<< HEAD
const API_BASE = 'http://192.168.200.146:8000'; // ← 換成你的後端 IP
=======

const API_BASE = 'http://172.20.10.8:8000'; // ← 換成你的後端 IP

>>>>>>> 6db448bb5ef5b07aa982ef160ccbcdfe2403d882

// ===== 型別 =====
type DeviceCall = {
  phoneNumber?: string;
  name?: string;
  dateTime?: string;
  timestamp?: string | number;
  duration?: string | number;
  type?: string;
};

type ServerCall = {
  CallId: number;
  UserId: number;
  PhoneName: string;
  Phone: string;
  PhoneTime: string;
  IsScam: boolean;
};

// ===== 工具 =====
function typeLabel(t?: string) {
  switch ((t || '').toUpperCase()) {
    case 'INCOMING': return '來電';
    case 'OUTGOING': return '撥出';
    case 'MISSED': return '未接';
    case 'REJECTED': return '已拒接';
    default: return '未知';
  }
}

function fmt(ts?: string | number, dt?: string) {
  const d = ts != null ? new Date(Number(ts)) : (dt ? new Date(dt) : null);
  if (!d || isNaN(+d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

const safeStr = (v: any) => (v == null ? '' : String(v));

function toPayload(elderId: number, log: DeviceCall) {
  return {
    UserId: elderId,
    PhoneName: safeStr(log.name || '未知來電'),
    Phone: safeStr(log.phoneNumber || ''),
    PhoneTime: fmt(log.timestamp, log.dateTime),
    IsScam: false,
  };
}

const normalizePhone = (p: string) =>
  (p || '').replace(/\D/g, '').replace(/^886(?=\d{9,})/, '0');

const displayName = (n?: string) =>
  n && n.trim().length > 0 ? n.trim() : '未知來電';

const displayPhoneOrUnknown = (p?: string, n?: string) => {
  const phone = (p || '').trim();
  return phone || displayName(n);
};

// ===== JWT 自動刷新 =====
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
  const [deviceLogs, setDeviceLogs] = useState<DeviceCall[]>([]);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const [serverLogs, setServerLogs] = useState<ServerCall[]>([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const [autoSyncMsg, setAutoSyncMsg] = useState<string>('');
  const [scamMap, setScamMap] = useState<Record<string, string>>({});

  const goScamForm = () => {
    (navigation as any).navigate('ScamScreen');
  };

  async function loadSelectedElder() {
    const [eid, ename] = await Promise.all([
      AsyncStorage.getItem('elder_id'),
      AsyncStorage.getItem('elder_name'),
    ]);
    if (!eid) {
      setElderId(null);
      setErrorMsg('尚未選擇長者，請先至家庭頁面選擇。');
    } else {
      setElderId(Number(eid));
      setElderName(ename || '');
      setErrorMsg('');
    }
  }

  async function refreshScamFlags(logs: DeviceCall[]) {
    const phones = Array.from(
      new Set(
        logs.map(l => normalizePhone(l.phoneNumber || '')).filter(Boolean)
      )
    );
    if (!phones.length) { setScamMap({}); return; }

    try {
      const res = await axios.post(`${API_BASE}/api/scam/check_bulk/`, { phones });
      setScamMap(res.data?.matches || {});
    } catch (e) {
      console.error('check_bulk 失敗:', e);
    }
  }

  async function loadDeviceLogs() {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      { title: '需要通話紀錄權限', message: 'App 需要讀取通話紀錄', buttonPositive: '允許' },
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      setErrorMsg('未取得通話紀錄權限');
      return;
    }
    setLoadingDevice(true);
    try {
      const result = await CallLogs.load(100);
      const list = (result as DeviceCall[]) || [];
      setDeviceLogs(list);
      await refreshScamFlags(list);
      await autoSyncNewDeviceLogs(list);
    } finally {
      setLoadingDevice(false);
    }
  }

  async function loadServerLogs() {
    if (!elderId) return;
    setLoadingServer(true);
    try {
      const res = await authGet<ServerCall[]>(`${API_BASE}/api/callrecords/${elderId}/`);
      setServerLogs(res.data ?? []);
    } finally {
      setLoadingServer(false);
    }
  }

  async function autoSyncNewDeviceLogs(list: DeviceCall[]) {
    if (!elderId) return;
    try {
      setSyncing(true);
      const res = await authGet<ServerCall[]>(`${API_BASE}/api/callrecords/${elderId}/`);
      const exists = new Set((res.data || []).map(r => `${r.Phone}|${r.PhoneTime}`));
      const newOnDevice = list
        .map(it => toPayload(elderId, it))
        .filter(p => p.Phone && p.PhoneTime && !exists.has(`${p.Phone}|${p.PhoneTime}`));
      if (newOnDevice.length > 0) {
        await authPost(`${API_BASE}/api/callrecords/bulk_add/`, { items: newOnDevice });
        setAutoSyncMsg(`已同步 ${newOnDevice.length} 筆`);
      }
      await loadServerLogs();
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => { loadSelectedElder(); }, []);
  useEffect(() => { if (elderId) loadServerLogs(); }, [elderId]);
  useEffect(() => { loadDeviceLogs(); }, []);

  const renderDeviceItem = ({ item }: { item: DeviceCall }) => {
    const phoneNorm = normalizePhone(item.phoneNumber || '');
    const category = scamMap[phoneNorm];
    const hit = !!category;
    return (
      <View style={[styles.item, hit && styles.itemScam]}>
        <Text style={[styles.phone, hit && { color: '#B71C1C' }]}>
          {displayPhoneOrUnknown(item.phoneNumber, item.name)}
          {hit && <Text style={styles.scamTag}> {category}</Text>}
        </Text>
        <Text style={styles.detail}>
          {`${displayName(item.name)} · ${typeLabel(item.type)} · ${item.duration || 0}s`}
        </Text>
        <Text style={styles.time}>{fmt(item.timestamp, item.dateTime)}</Text>
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
        {/* { <TouchableOpacity style={styles.scamAddBtn} onPress={goScamForm}>
          <Feather name="shield" size={16} color="#fff" />
          <Text style={styles.scamAddText}>新增詐騙</Text>
        </TouchableOpacity> } */}
      </View>
      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
      {autoSyncMsg ? <Text style={styles.info}>{autoSyncMsg}</Text> : null}
      <FlatList
        data={deviceLogs}
        keyExtractor={(_, idx) => `d-${idx}`}
        renderItem={renderDeviceItem}
        refreshing={loadingDevice}
        onRefresh={loadDeviceLogs}
        ListEmptyComponent={<Text style={styles.empty}>目前沒有本機通話紀錄</Text>}
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
  scamAddBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  scamAddText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  error: { color: 'red', margin: 12 },
  info: { color: '#111', margin: 12 },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  itemScam: {
    borderWidth: 1.5, borderColor: '#E53935', backgroundColor: '#FFF4F4',
    borderRadius: 10, marginHorizontal: 12, marginVertical: 6,
  },
  phone: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  detail: { fontSize: 15, color: '#555', marginTop: 2 },
  time: { fontSize: 13, color: '#888', marginTop: 2 },
  empty: { textAlign: 'center', color: '#888', marginTop: 30 },
  scamTag: {
    fontSize: 12, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, marginLeft: 6, backgroundColor: '#FDECEC', color: '#C62828', fontWeight: 'bold',
  },
});