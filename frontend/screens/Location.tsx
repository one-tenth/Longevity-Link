// screens/Location.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useRoute } from '@react-navigation/native';
import { reverseGeocode, formatTs } from '../utils/locationUtils';

type LatestLocationResp = {
  ok: boolean;
  user: number;
  lat: number;
  lon: number;
  ts: string;
};

const BASE_URL = 'http://192.168.0.24:8000'; 

export default function LocationScreen() {
  const route = useRoute<any>();
  const mapRef = useRef<MapView>(null);

  const [elderId, setElderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [latest, setLatest] = useState<LatestLocationResp | null>(null);
  const [address, setAddress] = useState<string>('尚未取得地址');


  const initialRegion: Region = {
    latitude: 35.681236,
    longitude: 139.767125,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // 取得 elderId
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('selectedMember');
        if (raw) {
          const obj = JSON.parse(raw);
          const isElder = obj?.is_elder === true || obj?.RelatedID != null;
          if (isElder && typeof obj?.UserID === 'number' && !Number.isNaN(obj.UserID)) {
            setElderId(obj.UserID);
            return;
          }
        }
        const saved = await AsyncStorage.getItem('elder_id');
        const n = saved ? Number(saved) : NaN;
        if (!Number.isNaN(n)) { setElderId(n); return; }
        const fromRoute = route?.params?.elderId;
        if (typeof fromRoute === 'number' && !Number.isNaN(fromRoute)) { setElderId(fromRoute); return; }
        setElderId(null);
      } catch { setElderId(null); }
    })();
  }, [route?.params]);

  // 進頁面後自動抓一次
  useEffect(() => {
    if (elderId != null && !Number.isNaN(elderId)) {
      fetchLatest();
    }
    
  }, [elderId]);

  const fetchLatest = async () => {
    if (elderId == null || Number.isNaN(elderId)) {
      Alert.alert('提示', '尚未選擇長者'); return;
    }
    const token = await AsyncStorage.getItem('access');
    if (!token) { Alert.alert('提示', '尚未登入'); return; }

    try {
      setLoading(true);
      const url = `${BASE_URL}/api/location/latest/${elderId}/`;
      const { data } = await axios.get<LatestLocationResp>(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      console.log('API 回傳:', data);

      if (!data?.ok) {
        throw new Error('後端回傳失敗');
      }

      const lat = Number(data.lat);
      const lon = Number(data.lon);

      console.log('解析後座標:', lat, lon);

      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        throw new Error('無定位資料');
      }

      setLatest({ ...data, lat, lon });

      // 長者座標
      mapRef.current?.animateToRegion({
        latitude: lat, longitude: lon, latitudeDelta: 0.01, longitudeDelta: 0.01,
      }, 500);

      // 反向地理
      const addr = await reverseGeocode(lat, lon, 'zh-TW', BASE_URL);

      console.log('反查地址結果:', addr);
      console.log('fetchLatest 反查地址:', addr);

      setAddress(addr || '無法取得地址');
    } catch (e: any) {
      Alert.alert('錯誤', String(e?.response?.data?.error || e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>家人端定位</Text>

      <TouchableOpacity style={styles.btn} onPress={fetchLatest} disabled={loading || elderId == null}>
        <Text style={styles.btnText}>{loading ? '更新中…' : '重新整理'}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator style={{ marginTop: 8 }} />}

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
        >
          {latest && (
            <Marker
              key={`${latest.lat},${latest.lon}`} // 強制重繪
              coordinate={{ latitude: latest.lat, longitude: latest.lon }}
              title="長者位置"
              description={address || `更新時間：${formatTs(latest.ts)}`}
            />
          )}
        </MapView>
      </View>

      {latest && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.infoText}>緯度：{latest.lat}</Text>
          <Text style={styles.infoText}>經度：{latest.lon}</Text>
          <Text style={styles.infoText}>時間：{formatTs(latest.ts)}</Text> 
          <Text style={styles.infoText}>地址：{address}</Text>
        </View>
      )}
    </View>
  );
}
            



const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F4F5F7' },
  title: { color: '#000', fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  btn: {
    padding: 14, backgroundColor: '#A6CFA1', borderRadius: 12,
    alignItems: 'center', marginBottom: 12,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  mapContainer: { flex: 1, marginTop: 10, borderRadius: 12, overflow: 'hidden' },
  map: { width: width - 40, height: height * 0.7 },
  infoText: { color: '#000', fontSize: 16, marginBottom: 4 },
});
