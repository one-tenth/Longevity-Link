// screens/LocationScreen.tsx
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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useRoute } from '@react-navigation/native';
import { reverseGeocode, formatTs } from '../utils/locationUtils';
import Config from 'react-native-config';



type LatestLocationResp = {
  ok: boolean;
  user: number;
  lat: number;
  lon: number;
  ts: string;
};

const BASE_URL = 'http://192.168.1.106:8000';   



type HistPoint = { lat: number; lon: number; ts: string };

export default function LocationScreen() {
  const route = useRoute<any>();
  const mapRef = useRef<MapView>(null);

  const [elderId, setElderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [latest, setLatest] = useState<any | null>(null);
  const [address, setAddress] = useState<string>('尚未取得地址');

  // 歷史點
  const [history, setHistory] = useState<HistPoint[]>([]);

  //state
  const [overlayVer, setOverlayVer] = useState(0);  // 強制重掛載 Marker/Polyline
  const [mapReady, setMapReady] = useState(false);  // 地圖 ready 後再渲染 overlays

  const [region] = useState<Region>({
    latitude: 25.033964, // 預設位置
    longitude: 121.564468,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // 讀 elderId
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('selectedMember');
        if (raw) {
          const obj = JSON.parse(raw);
          if (obj?.is_elder === true || obj?.RelatedID != null) {
            setElderId(Number(obj.UserID));
            return;
          }
        }
        const saved = await AsyncStorage.getItem('elder_id');
        const n = saved ? Number(saved) : NaN;
        if (!Number.isNaN(n)) {
          setElderId(n);
          return;
        }
        const fromRoute = route?.params?.elderId;
        if (typeof fromRoute === 'number' && !Number.isNaN(fromRoute)) {
          setElderId(fromRoute);
          return;
        }
        setElderId(null);
      } catch {
        setElderId(null);
      }
    })();
  }, [route?.params]);

  // elderId
  useEffect(() => {
    if (elderId != null && !Number.isNaN(elderId)) {
      fetchLatest();
    }
  }, [elderId]);

  // 取得最新定位
  const fetchLatest = async () => {
    if (elderId == null || Number.isNaN(elderId)) {
      Alert.alert('提示', '尚未選擇長者');
      return;
    }
    const token = await AsyncStorage.getItem('access');
    if (!token) {
      Alert.alert('提示', '尚未登入');
      return;
    }

    try {
      setLoading(true);
      const url = `${BASE_URL}/api/location/latest/${elderId}/`;
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      if (!data?.ok) throw new Error('後端回傳失敗');

      const lat = Number(data.lat);
      const lon = Number(data.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('無定位資料');

      const payload = { ...data, lat, lon };
      setLatest(payload);

      
      // 地圖移動到最新點
      mapRef.current?.animateToRegion(
        { latitude: lat, longitude: lon, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        500
      );

      // 取地址
      setAddress('取得中…');
      const addr = await reverseGeocode(lat, lon, 'zh-TW', BASE_URL);
      setAddress(addr || '無法取得地址');

      // 取得歷史軌跡
      await fetchHistory(payload);

      // 強制重掛載
      setOverlayVer(v => v + 1);
    } catch (e: any) {
      Alert.alert('錯誤', String(e?.response?.data?.error || e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  // 過去24小時定位歷史 
  const fetchHistory = async (latestPoint?: { lat: number; lon: number }) => {
    if (elderId == null) return;
    const token = await AsyncStorage.getItem('access');
    if (!token) return;

    try {
      const url = `${BASE_URL}/api/location/history/${elderId}/?hours=24`;
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const points: HistPoint[] = (Array.isArray(data) ? data : [])
        .map((item: any) => {
          const lat = Number(item.lat ?? item.Latitude ?? item.latitude);
          const lon = Number(item.lon ?? item.Longitude ?? item.longitude);
          const ts = item.ts ?? item.Timestamp ?? item.time ?? '';
          return { lat, lon, ts };
        })
        .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));

      setHistory(points);

      const coords = [
        ...points.map(p => ({ latitude: p.lat, longitude: p.lon })),
        ...(Number.isFinite(latestPoint?.lat) && Number.isFinite(latestPoint?.lon)
          ? [{ latitude: Number(latestPoint!.lat), longitude: Number(latestPoint!.lon) }]
          : []),
      ];

      if (coords.length > 0) {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        });
      }

    
      setOverlayVer(v => v + 1);
    } catch {
      Alert.alert('錯誤', '無法取得歷史資料');
      setHistory([]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>家人端定位</Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={fetchLatest}
        disabled={loading || elderId == null}
      >
        <Text style={styles.btnText}>{loading ? '更新中…' : '重新整理'}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator style={{ marginTop: 8 }} />}

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}                 
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          moveOnMarkerPress={false}
          onMapReady={() => setMapReady(true)} 
        >
          {/* 歷史路徑 */}
          {mapReady && history.length > 1 && (
            <Polyline
              key={`poly-${overlayVer}`}  
              coordinates={history
                .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
                .map(p => ({ latitude: p.lat, longitude: p.lon }))}
              strokeWidth={3}
              geodesic
              zIndex={2}
            />
          )}

          {/* 最新位置 Marker */}
          {mapReady && Number.isFinite(latest?.lat) && Number.isFinite(latest?.lon) && (
            <Marker
              key={`marker-${overlayVer}`} // 每次 overlayVer 變更 → 重新掛載
              coordinate={{
                latitude: Number(latest!.lat),
                longitude: Number(latest!.lon),
              }}
              title="長者位置"
              description={address || `更新時間：${formatTs(latest!.ts)}`}
              tracksViewChanges={false}
              zIndex={3}
            />
          )}
        </MapView>
      </View>

      {latest && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>緯度：{latest.lat}</Text>
          <Text style={styles.infoText}>經度：{latest.lon}</Text>
          <Text style={styles.infoText}>時間：{formatTs(latest.ts)}</Text>
          <Text style={styles.infoText}>地址：{address}</Text>
        </View>
      )}
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F4F5F7',
  },
  title: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  btn: {
    padding: 14,
    backgroundColor: '#A6CFA1',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
  },
  
  mapContainer: {
    flex: 1,
    marginTop: 10,
  },

  map: {
    flex: 1,
    borderRadius: 12,
    minHeight: height * 0.5,
  },
  infoContainer: { marginTop: 20 },
  infoText: { color: '#000', fontSize: 16, marginBottom: 10 },
});
