// screens/CallLogScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  PermissionsAndroid, Platform, TouchableOpacity, Alert,
  StatusBar,
} from 'react-native';
import CallLogs from 'react-native-call-log';

type CallRecord = {
  phoneNumber?: string;
  name?: string;
  dateTime?: string;
  timestamp?: string | number;
  duration?: string | number;
  type?: string; // INCOMING/OUTGOING/MISSED/REJECTED
};

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
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export default function CallLogScreen() {
  const [logs, setLogs] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);

  async function requestPermission() {
    if (Platform.OS !== 'android') {
      Alert.alert('提示', '通話紀錄僅支援 Android');
      return false;
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      { title: '需要通話紀錄權限', message: 'App 需要讀取通話紀錄', buttonPositive: '允許' },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  async function fetchLogs() {
    const ok = await requestPermission();
    if (!ok) return;
    setLoading(true);
    try {
      const result = await CallLogs.load(20); // 最近 20 筆
      setLogs(result as CallRecord[]);
    } catch (err) {
      console.error('抓取失敗:', err);
      Alert.alert('錯誤', '無法讀取通話紀錄');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLogs(); }, []);

  const renderItem = ({ item }: { item: CallRecord }) => {
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Text style={styles.title}>通話紀錄</Text>
      <FlatList
        data={logs}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={fetchLogs}
        ListEmptyComponent={<Text style={styles.empty}>目前沒有通話紀錄</Text>}
      />
      <TouchableOpacity style={styles.refreshBtn} onPress={fetchLogs}>
        <Text style={styles.refreshText}>重新整理</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', paddingTop: 40, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  phone: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  detail: { fontSize: 16, color: '#555', marginTop: 2 },
  time: { fontSize: 14, color: '#888', marginTop: 2 },
  empty: { textAlign: 'center', color: '#888', marginTop: 30 },
  refreshBtn: { backgroundColor: '#4E6E62', padding: 12, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  refreshText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
