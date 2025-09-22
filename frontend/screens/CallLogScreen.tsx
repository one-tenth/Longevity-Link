import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, PermissionsAndroid,
  TouchableOpacity, Alert, StatusBar, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import CallLogs from 'react-native-call-log';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE = 'http://192.168.0.24:8000';

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
  Duration?: number;
  Type?: string;
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
  return d.toLocaleString();
}

const normalizePhone = (p: string) =>
  (p || '').replace(/\D/g, '').replace(/^886(?=\d{9,})/, '0');

const displayName = (n?: string) => (n && n.trim().length > 0 ? n.trim() : '未知來電');

// ===== 主畫面 =====
export default function CallLogScreen() {
  const navigation = useNavigation();

  const [elderId, setElderId] = useState<number | null>(null);
  const [elderName, setElderName] = useState<string>('');
  const [deviceLogs, setDeviceLogs] = useState<DeviceCall[]>([]);
  const [serverLogs, setServerLogs] = useState<ServerCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // === 讀取 elderId / elderName ===
  useEffect(() => {
    (async () => {
      const eid = await AsyncStorage.getItem('elder_id');
      const ename = await AsyncStorage.getItem('elder_name');
      if (eid) {
        setElderId(Number(eid));
        setElderName(ename || '');
      } else {
        setErrorMsg('尚未選擇長者，請回到家庭頁面選擇。');
      }
    })();
  }, []);

  // === 撈後端紀錄 ===
  async function loadServerLogs() {
    if (!elderId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access');
      const res = await axios.get(`${API_BASE}/api/call/elder/${elderId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServerLogs(res.data || []);
    } catch (e) {
      console.error('❌ 撈後端失敗:', e);
      setErrorMsg('無法讀取資料庫通話紀錄');
    } finally {
      setLoading(false);
    }
  }

  // === 撈本機紀錄 ===
  async function loadDeviceLogs() {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      { title: '需要通話紀錄權限', message: 'App 需要讀取通話紀錄', buttonPositive: '允許' }
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert('未授權', '無法讀取本機通話紀錄');
      return;
    }
    const result = await CallLogs.load(50); // 最多 50 筆
    setDeviceLogs(result as DeviceCall[]);
  }

  // === 手動同步本機 → 後端 ===
  async function syncDeviceToServer() {
    if (!elderId) {
      Alert.alert('提醒', '請先選擇要照護的長者');
      return;
    }
    if (!deviceLogs.length) {
      Alert.alert('提示', '沒有可上傳的本機紀錄');
      return;
    }
    setSyncing(true);
    try {
      const token = await AsyncStorage.getItem('access');
      const payload = deviceLogs.map((d) => ({
        phone: normalizePhone(d.phoneNumber || ''),
        name: displayName(d.name),
        type: d.type,
        timestamp: d.timestamp,
        duration: d.duration,
      }));
      await axios.post(`${API_BASE}/api/call/upload/`, {
        elder_id: elderId,
        records: payload,
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('完成', '已同步通話紀錄');
      await loadServerLogs();
    } catch (e) {
      console.error('❌ 上傳失敗:', e);
      Alert.alert('錯誤', '同步失敗，請稍後再試');
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadServerLogs();
    loadDeviceLogs();
  }, [elderId]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#111" />
          <Text style={styles.backText}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>通話紀錄 {elderName ? `(${elderName})` : ''}</Text>
      </View>

      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
        <FlatList
          data={serverLogs}
          keyExtractor={(item) => String(item.CallId)}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.phone}>{item.PhoneName || '未知'} ({item.Phone})</Text>
              <Text style={styles.detail}>{typeLabel(item.Type)} · {item.Duration || 0}s</Text>
              <Text style={styles.time}>{fmt(item.PhoneTime)}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>尚無通話紀錄</Text>}
        />
      )}

      <TouchableOpacity style={styles.syncBtn} onPress={syncDeviceToServer} disabled={syncing}>
        <Text style={styles.syncText}>{syncing ? '同步中…' : '同步本機通話紀錄'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 16, fontWeight: '600', color: '#111' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#111' },
  error: { color: 'red', margin: 12 },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  phone: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  detail: { fontSize: 14, color: '#555' },
  time: { fontSize: 13, color: '#888' },
  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
  syncBtn: {
    backgroundColor: '#111', padding: 14, margin: 16, borderRadius: 8, alignItems: 'center',
  },
  syncText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
