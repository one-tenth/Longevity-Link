import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  PermissionsAndroid, Platform, TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import CallLogs from 'react-native-call-log';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE = 'http://192.168.0.24:8000'; // ← 換成你的後端 IP

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
  IsScam: boolean; // 新增詐騙標記
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
    PhoneName: safeStr(log.name || '未知'),
    Phone: safeStr(log.phoneNumber || ''),
    PhoneTime: fmt(log.timestamp, log.dateTime),  // 使用時間戳與時間來做比較
    IsScam: false,
  };
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
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        setErrorMsg('尚未登入，無法讀取資料庫通話紀錄。');
        setServerLogs([]);
        return;
      }
      const res = await axios.get<ServerCall[]>(`${API_BASE}/api/callrecords/${elderId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServerLogs(res.data ?? []);
      if (!res.data || res.data.length === 0) {
        setErrorMsg('資料庫目前沒有通話紀錄。');
      }
    } catch (err: any) {
      console.error('撈後端失敗:', err);
      setErrorMsg('連線資料庫失敗，請稍後重試。');
      Alert.alert('錯誤', err?.message ?? '讀取資料庫通話紀錄失敗');
    } finally {
      setLoadingServer(false);
    }
  }

  async function autoSyncNewDeviceLogs(list: DeviceCall[]) {
    setAutoSyncMsg('');
    if (!elderId) return;
    const token = await AsyncStorage.getItem('access');
    if (!token) return;

    try {
      setSyncing(true);
      setAutoSyncMsg('自動同步中…');

      const res = await axios.get<ServerCall[]>(`${API_BASE}/api/callrecords/${elderId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
        await axios.post(`${API_BASE}/api/callrecords/bulk_add/`, { items: newOnDevice }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e: any) {
        await Promise.allSettled(
          newOnDevice.map((payload) =>
            axios.post(`${API_BASE}/api/callrecords/add/`, payload, {
              headers: { Authorization: `Bearer ${token}` },
            })
          )
        );
      }

      setAutoSyncMsg(`已同步 ${newOnDevice.length} 筆`);
      await loadServerLogs();
    } catch (e: any) {
      console.error('自動同步失敗:', e);
      setErrorMsg('自動同步失敗，請稍後再試。');
      setAutoSyncMsg('');
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

  const renderDeviceItem = ({ item }: { item: DeviceCall }) => {
    const dur = typeof item.duration === 'string' ? item.duration : String(item.duration ?? 0);
    return (
      <View style={styles.item}>
        <Text style={styles.phone}>{item.phoneNumber || '未知號碼'}</Text>
        <Text style={styles.detail}>
          {(item.name ? `${item.name} · ` : '') + typeLabel(item.type)} · {dur}s
        </Text>
        <Text style={styles.time}>{fmt(item.timestamp, item.dateTime)}</Text>
      </View>
    );
  };

  const renderServerItem = ({ item }: { item: ServerCall }) => (
    <View style={styles.item}>
      <Text style={styles.phone}>{item.Phone || '未知號碼'}</Text>
      <Text style={styles.detail}>
        {(item.PhoneName ? `${item.PhoneName} · ` : '') + (item.IsScam ? '（疑似詐騙）' : '正常')}
      </Text>
      <Text style={styles.time}>{item.PhoneTime || ''}</Text>
    </View>
  );

  const renderSyncButton = () => (
    <View style={styles.bottomBar}>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: '#111' }]}
        onPress={syncDeviceToServer}
        disabled={syncing || !elderId}
      >
        <Text style={styles.actionText}>
          {syncing ? '上傳中…' : '同步到後端'}
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
        <View style={{ width: 64 }} />
      </View>

      {/* 顯示錯誤訊息 */}
      {errorMsg && (
        <View style={styles.errorBar}>
          <Feather name="alert-circle" size={18} color="#fff" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* 顯示同步狀態訊息 */}
      {autoSyncMsg && (
        <View style={styles.infoBar}>
          <Feather name="cloud" size={16} color="#111" />
          <Text style={styles.infoText}>{autoSyncMsg}</Text>
        </View>
      )}

      {/* 顯示通話紀錄列表 */}
      <FlatList
        data={deviceLogs}
        keyExtractor={(_, idx) => `d-${idx}`}
        renderItem={renderDeviceItem}
        refreshing={loadingDevice}
        onRefresh={loadDeviceLogs}
        ListEmptyComponent={<Text style={styles.empty}>目前沒有本機通話紀錄</Text>}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {/* 顯示同步按鈕 */}
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

  item: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
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
});
