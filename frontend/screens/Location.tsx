import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reverseGeocode } from '../hooks/locationUtils';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
type Props = StackScreenProps<RootStackParamList, 'Location'>;

const BASE_URL = 'http://192.168.1.84:8000';

type LatestLocationResp = {
  UserID: number;
  UserName: string;
  FamilyID: number | null;
  Latitude: number;
  Longitude: number;
  Timestamp: string; // ISO
};

export default function Location({ route }: Props) {
  const elderId = route.params?.elderId;
  const [coord, setCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [address, setAddress] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchLatestLocation = useCallback(async () => {
    if (!elderId && elderId !== 0) {
      setLoading(false);
      Alert.alert('尚未選擇長者', '請先於家人首頁選擇要查看的長者');
      return;
    }
    setLoading(true);
    try {

      const token = await AsyncStorage.getItem('access');
      
      if (!token) throw new Error('Token 不存在，請先登入');

      const resp = await fetch(`${BASE_URL}/api/location/latest/${elderId}/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data: LatestLocationResp | any = await resp.json();
      if (!resp.ok) {
        throw new Error(data.detail || data.error || '取得長者位置失敗');
      }

      const lat = Number((data as LatestLocationResp).Latitude);
      const lng = Number((data as LatestLocationResp).Longitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) throw new Error('伺服器回傳的座標格式不正確');

      if (!mountedRef.current) return;
      setCoord({ latitude: lat, longitude: lng });
      setRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setUpdatedAt(new Date((data as LatestLocationResp).Timestamp).toLocaleString());

      try {
        const addr = await reverseGeocode(lat, lng);
        if (mountedRef.current) setAddress(addr);
      } catch {
        if (mountedRef.current) setAddress('');
      }
    } catch (err: any) {
      console.error('❌ 取得長者位置失敗', err);
      Alert.alert('錯誤', err?.message ?? '無法取得長者位置');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [elderId]);

  // 首次與 elderId 變更時抓取
  useEffect(() => {
    mountedRef.current = true;
    fetchLatestLocation();
    return () => { mountedRef.current = false; };
  }, [fetchLatestLocation]);

  // 畫面 regain focus 時自動刷新
  useFocusEffect(
    useCallback(() => {
      fetchLatestLocation();
    }, [fetchLatestLocation])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>載入中...</Text>
      </View>
    );
  }

  if (!coord || !region) {
    return (
      <View style={styles.center}>
        <Text>無法讀取位置資料</Text>
        <TouchableOpacity onPress={fetchLatestLocation} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>重新整理</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={setRegion}
      >
        <Marker coordinate={coord} title="長者位置" description={address || updatedAt} />
      </MapView>

      <View style={styles.infoPanel}>
        <Text style={styles.infoText}>
          經度: {coord.longitude.toFixed(6)}{'\n'}
          緯度: {coord.latitude.toFixed(6)}
        </Text>
        {!!address && <Text style={styles.addressText}>地址：{address}</Text>}
        {!!updatedAt && <Text style={styles.timeText}>更新時間：{updatedAt}</Text>}

        <TouchableOpacity onPress={fetchLatestLocation} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>重新整理</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height: height * 0.7 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  infoPanel: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  infoText: { fontSize: 16 },
  addressText: { fontSize: 14, color: '#555' },
  timeText: { fontSize: 14, color: '#333' },
  refreshBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  refreshText: { fontSize: 14, fontWeight: '600' },
});
