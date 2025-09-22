// screens/ElderLocation.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import {
  requestLocationPermissions,
  getCurrentCoords,
  watchCoords,
  Coords,
  formatTs,
  reverseGeocode,
} from '../utils/locationUtils';

const BASE_URL = 'http://172.20.10.4:8000';

export default function ElderLocation() {
  const [uploading, setUploading] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [lastUploadedAt, setLastUploadedAt] = useState<string>('');
  const [address, setAddress] = useState<string>('尚未取得地址');

  // 監聽停止
  const stopRef = useRef<null | (() => void)>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      const ok = await requestLocationPermissions();
      if (!ok) {
        Alert.alert('提示', '需要定位權限才能上傳位置');
        return;
      }
      try {
        const c = await getCurrentCoords();
        if (!mountedRef.current) return;
        setCoords(c);

        // 顯示目前位址的中文地址
        const addr = await reverseGeocode(c.latitude, c.longitude, 'zh-TW', BASE_URL);
        if (mountedRef.current && addr) setAddress(addr);
      } catch (e: any) {
        console.warn('getCurrentCoords error', e?.message ?? e);
      }
    })();

    return () => {
      mountedRef.current = false;
      stopRef.current?.();
    };
  }, []);

  async function upload(c: Coords) {
    const token = await AsyncStorage.getItem('access');
    if (!token) {
      Alert.alert('錯誤', '尚未登入');
      return;
    }

    try {
      setUploading(true);
      await axios.post(
        `${BASE_URL}/api/location/upload/`,
        { lat: Number(c.latitude), lon: Number(c.longitude) },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );

      const nowIso = new Date().toISOString();
      if (mountedRef.current) setLastUploadedAt(formatTs(nowIso));

      // 上傳成功後再反查一次地址
      const addr = await reverseGeocode(c.latitude, c.longitude, 'zh-TW', BASE_URL);
      if (mountedRef.current && addr) setAddress(addr);

    } catch (e: any) {

      const status = e?.response?.status;
      if (status === 401) {
        Alert.alert('驗證失敗', '請重新登入（401）');
      } else if (status === 403) {
        Alert.alert('權限不足', '此帳號不是長者或無權上傳（403）');
      } else {
        Alert.alert('上傳失敗', String(e?.message ?? e));
      }
      console.warn('位址上傳失敗', e?.message ?? e);
    } finally {
      if (mountedRef.current) setUploading(false);
    }
  }

  const handleUploadOnce = async () => {
    try {
      const c = await getCurrentCoords();
      if (!mountedRef.current) return;
      setCoords(c);
      await upload(c);
      Alert.alert('完成', `已上傳：${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`);
    } catch (e: any) {
      Alert.alert('錯誤', String(e?.message ?? e));
    }
  };

  const startWatching = async () => {
    // ✅ 防止重複監聽
    if (stopRef.current) {
      Alert.alert('提示', '已在持續上傳中');
      return;
    }
  
    stopRef.current = watchCoords(
      async (c) => {
        if (!mountedRef.current) return;
        setCoords(c);

        await upload(c);
      },
      (e) => console.warn('watch error', e?.message ?? e)
    );
    Alert.alert('已開始', '持續上傳定位中（每 60 秒）');
  };

  const stopWatching = () => {
    stopRef.current?.();
    stopRef.current = null;
    Alert.alert('已停止', '停止持續上傳位址');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>長者定位上傳</Text>

      <Text style={styles.coord}>
        經緯度：{coords ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` : '尚未取得'}
      </Text>

      
      <Text style={styles.info}>最近上傳時間：{lastUploadedAt || '—'}</Text>

      <TouchableOpacity style={styles.btn} onPress={handleUploadOnce} disabled={uploading}>
        <Text style={styles.btnText}>{uploading ? '上傳中…' : '定位目前位址並上傳'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={startWatching}>
        <Text style={styles.btnText}>持續定位</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.stop]} onPress={stopWatching}>
        <Text style={styles.btnText}>停止定位</Text>
      </TouchableOpacity>

      {uploading && <ActivityIndicator style={{ marginTop: 8 }} />}
    </View>
  );
}


     //<Text style={styles.info}>地址：{address || '尚未取得地址'}</Text>

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  coord: { fontSize: 16, marginBottom: 8 },
  info: { fontSize: 14, color: '#333', marginBottom: 6 },
  btn: {
    padding: 14,
    backgroundColor: '#A6CFA1',
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  stop: { backgroundColor: '#444' },
  btnText: { color: '#fff', fontWeight: '600' },
});
