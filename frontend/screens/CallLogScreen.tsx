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

const API_BASE = 'http://192.168.0.55:8000'; // ← 換成你的後端 IP

// ===== 型別 =====
type DeviceCall = {
  phoneNumber?: string;
  name?: string;
  dateTime?: string;
  timestamp?: string | number;
  duration?: string | number;
  type?: string; // INCOMING/OUTGOING/MISSED/REJECTED
};

type ServerCall = {
  CallId: number;
  UserId: number;
  PhoneName: string;
  Phone: string;
  PhoneTime: string;
  IsScam: boolean;
};

type TabKey = 'device' | 'server';

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

// 號碼正規化（去非數字，+886 → 0）
const normalizePhone = (p: string) =>
  (p || '').replace(/\D/g, '').replace(/^886(?=\d{9,})/, '0');

// 顯示用：姓名若無 → 顯示「未知來電」
const displayName = (n?: string) =>
  n && n.trim().length > 0 ? n.trim() : '未知來電';

// 顯示用：標題列優先顯示號碼；若無號碼 → 顯示姓名或「未知來電」
const displayPhoneOrUnknown = (p?: string, n?: string) => {
  const phone = (p || '').trim();
  if (phone) return phone;
  return displayName(n);
};

// === JWT 自動刷新與帶 Token 的請求封裝 ===
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
  const [tab, setTab] = useState<TabKey>('server');
  const [deviceLogs, setDeviceLogs] = useState<DeviceCall[]>([]);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const [serverLogs, setServerLogs] = useState<ServerCall[]>([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const [autoSyncMsg, setAutoSyncMsg] = useState<string>('');

  // 電話 → 分類 的 map（如 { "0905....":"推銷" }）
  const [scamMap, setScamMap] = useState<Record<string, string>>({});

  // 前往新增詐騙表單
  const goScamForm = () => {
    (navigation as any).navigate('ScamScreen');
  };

  async function loadSelectedElder() {
    try {
      const [eid, ename] = await Promise.all([
        AsyncStorage.getItem('elder_id'),
        AsyncStorage.getItem('elder_name'),
      ]);
      if (!eid) {
        setElderId(null);
        setElderName('');
        setErrorMsg('尚未選擇長者，請先至家庭頁面選擇。');
      } else {
        setElderId(Number(eid));
        setElderName(ename || '');
        setErrorMsg('');
      }
    } catch {
      setErrorMsg('讀取長者資料失敗。');
    }
  }

  // 把本機清單的唯一電話丟去後端比對，取得「分類」
  async function refreshScamFlags(logs: DeviceCall[]) {
    const phones = Array.from(
      new Set(
        logs.map(l => normalizePhone(l.phoneNumber || '')).filter(Boolean)
      )
    );
    if (phones.length === 0) { setScamMap({}); return; }

    try {
      // 不帶 Authorization（請確保後端此路徑是 AllowAny）
      const res = await axios.post(`${API_BASE}/api/scam/check_bulk/`, { phones });
      // 後端回：{ matches: { "0905...": "推銷", "0912...": "詐騙" } }
      setScamMap(res.data?.matches || {});
    } catch (e) {
      console.error('check_bulk 失敗:', e);
    }
  }

  async function loadDeviceLogs() {
    setErrorMsg('');
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      { title: '需要通話紀錄權限', message: 'App 需要讀取通話紀錄', buttonPositive: '允許' },
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      setErrorMsg('未取得通話紀錄權限，無法讀取本機紀錄。');
      return;
    }

    setLoadingDevice(true);
    try {
      const result = await CallLogs.load(100);
      const list = (result as DeviceCall[]) || [];
      setDeviceLogs(list);

      // 立刻比對 SCAM（拿分類）
      await refreshScamFlags(list);

      if (!list.length) {
        setErrorMsg('本機沒有可顯示的通話紀錄。');
      }
      await autoSyncNewDeviceLogs(list);
    } catch (err: any) {
      console.error('抓本機失敗:', err);
      setErrorMsg('無法讀取本機通話紀錄，請稍後再試。');
      Alert.alert('錯誤', err?.message ?? '讀取本機通話紀錄失敗');
    } finally {
      setLoadingDevice(false);
    }
  }

  async function loadServerLogs() {
    setErrorMsg('');
    if (!elderId) {
      setServerLogs([]);
      setErrorMsg('尚未選擇長者，請先至家庭頁面選擇。');
      return;
    }
    setLoadingServer(true);
    try {
      const res = await authGet<ServerCall[]>(`${API_BASE}/api/callrecords/${elderId}/`);
      setServerLogs(res.data ?? []);
      if (!res.data || res.data.length === 0) {
        setErrorMsg('資料庫目前沒有通話紀錄。');
      }
    } catch (err: any) {
      console.error('撈後端失敗:', err);
      if (err?.response?.status === 401) {
        Alert.alert('登入逾時', '請重新登入');
        (navigation as any).navigate('LoginScreen');
      } else {
        setErrorMsg('連線資料庫失敗，請稍後重試。');
        Alert.alert('錯誤', err?.message ?? '讀取資料庫通話紀錄失敗');
      }
    } finally {
      setLoadingServer(false);
    }
  }

  async function autoSyncNewDeviceLogs(list: DeviceCall[]) {
    setAutoSyncMsg('');
    if (!elderId) return;

    try {
      setSyncing(true);
      setAutoSyncMsg('自動同步中…');

      const res = await authGet<ServerCall[]>(`${API_BASE}/api/callrecords/${elderId}/`);
      const exists = new Set(
        (res.data || []).map((r) => `${r.Phone}|${r.PhoneTime}`)
      );

      const newOnDevice = list
        .map((it) => toPayload(elderId, it))
        .filter((p) => p.Phone && p.PhoneTime && !exists.has(`${p.Phone}|${p.PhoneTime}`));

      if (newOnDevice.length === 0) {
        setAutoSyncMsg('無需同步（已最新）');
        return;
      }

      try {
        await authPost(`${API_BASE}/api/callrecords/bulk_add/`, { items: newOnDevice });
      } catch (e: any) {
        await Promise.allSettled(
          newOnDevice.map((payload) => authPost(`${API_BASE}/api/callrecords/add/`, payload))
        );
      }

      setAutoSyncMsg(`已同步 ${newOnDevice.length} 筆`);
      await loadServerLogs();
    } catch (e: any) {
      console.error('自動同步失敗:', e);
      if (e?.response?.status === 401) {
        Alert.alert('登入逾時', '請重新登入');
        (navigation as any).navigate('LoginScreen');
      } else {
        setErrorMsg('自動同步失敗，請稍後再試。');
        setAutoSyncMsg('');
      }
    } finally {
      setSyncing(false);
    }
  }

  async function syncDeviceToServer() {
    if (!elderId) {
      Alert.alert('提醒', '請先於家庭頁面選擇要同步的長者');
      return;
    }
    if (deviceLogs.length === 0) {
      Alert.alert('提示', '沒有可上傳的本機通話紀錄');
      return;
    }
    await autoSyncNewDeviceLogs(deviceLogs);
    setTab('server');
  }

  useEffect(() => {
    (async () => {
      await loadSelectedElder();
    })();
  }, []);
  useEffect(() => {
    if (elderId) loadServerLogs();
  }, [elderId]);
  useEffect(() => {
    loadDeviceLogs();
  }, []);

  // === Render（本機）— 命中 → 整列紅框＋淡紅底；缺資料時顯示「未知來電」 ===
  const renderDeviceItem = ({ item }: { item: DeviceCall }) => {
    const dur = typeof item.duration === 'string' ? item.duration : String(item.duration ?? 0);
    const phoneRaw = item.phoneNumber || '';
    const phoneNorm = normalizePhone(phoneRaw);
    const category = scamMap[phoneNorm];     // "推銷" / "詐騙" / undefined
    const hit = !!category;

    const titleText = displayPhoneOrUnknown(phoneRaw, item.name);

    return (
      <View style={[styles.item, hit && styles.itemScam]}>
        <Text style={[styles.phone, hit && { color: '#B71C1C' }]}>
          {titleText}
          {hit && <Text style={styles.scamTag}>  {category}</Text>}
        </Text>
        <Text style={styles.detail}>
          {`${displayName(item.name)} · ${typeLabel(item.type)} · ${dur}s`}
        </Text>
        <Text style={styles.time}>{fmt(item.timestamp, item.dateTime)}</Text>
      </View>
    );
  };

  // === Render（後端）— 同樣整列紅框＋淡紅底；缺資料時顯示「未知來電」 ===
  const renderServerItem = ({ item }: { item: ServerCall }) => {
    const phoneRaw = item.Phone || '';
    const category = scamMap[normalizePhone(phoneRaw)];
    const hit = !!category;

    const titleText = displayPhoneOrUnknown(phoneRaw, item.PhoneName);

    return (
      <View style={[styles.item, hit && styles.itemScam]}>
        <Text style={[styles.phone, hit && { color: '#B71C1C' }]}>
          {titleText}
          {hit && <Text style={styles.scamTag}>  {category}</Text>}
        </Text>
        <Text style={styles.detail}>
          {`${displayName(item.PhoneName)} · ${item.IsScam ? '（疑似詐騙）' : '正常'}`}
        </Text>
        <Text style={styles.time}>{item.PhoneTime || ''}</Text>
      </View>
    );
  };

  const renderSyncButton = () => (
    <View style={styles.bottomBar}>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: '#111' }]}
        onPress={syncDeviceToServer}
        disabled={syncing || !elderId}
      >
        <Text style={styles.actionText}>
          {syncing ? '上傳中…' : '重新整理'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#111" />
          <Text style={styles.backText}>返回</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          通話紀錄{elderName ? `（${elderName}）` : ''}
        </Text>

        {/* 右側「新增詐騙」按鈕 */}
        <TouchableOpacity style={styles.scamAddBtn} onPress={goScamForm}>
          <Feather name="shield" size={16} color="#fff" />
          <Text style={styles.scamAddText}>新增詐騙</Text>
        </TouchableOpacity>
      </View>

      {/* 錯誤訊息 */}
      {errorMsg && (
        <View style={styles.errorBar}>
          <Feather name="alert-circle" size={18} color="#fff" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* 同步訊息 */}
      {autoSyncMsg && (
        <View style={styles.infoBar}>
          <Feather name="cloud" size={16} color="#111" />
          <Text style={styles.infoText}>{autoSyncMsg}</Text>
        </View>
      )}

      {/* 清單（目前顯示本機；若要顯示 serverLogs -> 換成 data={serverLogs} renderItem={renderServerItem}） */}
      <FlatList
        data={deviceLogs}
        keyExtractor={(_, idx) => `d-${idx}`}
        renderItem={renderDeviceItem}
        refreshing={loadingDevice}
        onRefresh={loadDeviceLogs}
        ListEmptyComponent={<Text style={styles.empty}>目前沒有本機通話紀錄</Text>}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {autoSyncMsg && renderSyncButton()}
    </View>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 64 },
  backText: { color: '#111', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#111' },

  // 右上角按鈕
  scamAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scamAddText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 12,
    borderRadius: 8,
  },
  errorText: { color: '#fff', fontSize: 14, flex: 1 },

  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F2F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 8,
  },
  infoText: { color: '#111', fontSize: 13 },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: '#F4F4F4',
    padding: 4,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 15, color: '#666', fontWeight: '700' },
  tabTextActive: { color: '#111' },

  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },

  // ✅ 命中列：紅框＋淡紅底＋卡片效果
  itemScam: {
    borderBottomWidth: 0,
    borderWidth: 1.5,
    borderColor: '#E53935',
    backgroundColor: '#FFF4F4',
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  phone: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  detail: { fontSize: 15, color: '#555', marginTop: 2 },
  time: { fontSize: 13, color: '#888', marginTop: 2 },
  empty: { textAlign: 'center', color: '#888', marginTop: 30 },

  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    justifyContent: 'space-between',
  },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 8 },
  actionText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // 分類標籤樣式
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
});
