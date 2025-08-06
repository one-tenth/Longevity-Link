// Location.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reverseGeocode } from '../hooks/locationUtils';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

const { width, height } = Dimensions.get('window');
type Props = StackScreenProps<RootStackParamList, 'Location'>;
const BASE_URL = 'http://192.168.1.84:8000';

export default function Location({ route }: Props) {
  const [coord,   setCoord]   = useState<{ latitude: number; longitude: number } | null>(null);
  const [region,  setRegion]  = useState<Region | null>(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);

  const elderId = route.params.elderId;

  useEffect(() => {
    handleFetchLocation();
  }, [elderId]);

  async function handleFetchLocation() {
    try {
      // 1. 取 token (key 'access')
      const token = await AsyncStorage.getItem('access');
      console.log('🔐 access:', token);
      if (!token) throw new Error('Token 不存在，請先登入');

      // 2. 呼叫 API
       const resp = await fetch(
         `http://192.168.1.84:8000/api/location/latest/${elderId}/`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const text = await resp.text();
      let data: { latitude: number; longitude: number; error?: string };
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('伺服器回傳格式錯誤');
      }

      if (!resp.ok) {
        throw new Error(data.error || '取得長者位置失敗');
      }

      // 3. 更新地圖座標
      const { latitude, longitude } = data;
      setCoord({ latitude, longitude });
      setRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });

      // 4. 反查地址
      const addr = await reverseGeocode(latitude, longitude);
      setAddress(addr);

    } catch (err: any) {
      console.error('❌ 取得長者位置失敗', err);
      Alert.alert('錯誤', err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>載入中...</Text>
      </View>
    );
  }
  if (!coord || !region) {
    return (
      <View style={styles.center}>
        <Text>無法讀取位置資料</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={region}>
        <Marker coordinate={coord} title="長者位置" />
      </MapView>
      <View style={styles.infoPanel}>
        <Text style={styles.infoText}>
          經度: {coord.longitude.toFixed(6)}{"\n"}
          緯度: {coord.latitude.toFixed(6)}
        </Text>
        {!!address && <Text style={styles.addressText}>{address}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height: height * 0.7 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoPanel: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  infoText: { fontSize: 16, marginBottom: 8 },
  addressText: { fontSize: 14, color: '#555' },
});
