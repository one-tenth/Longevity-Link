//Location.tsx
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
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  Region,
  Circle,
} from 'react-native-maps';
import { useRoute } from '@react-navigation/native';
import { reverseGeocode, formatTs } from '../utils/locationUtils';

type LatestLocationResp = {
  ok: boolean;
  user: number;
  lat: number;
  lon: number;
  ts: string;
};

const BASE_URL = 'http://192.168.1.106:8000'; // 後端 IP
const CACHE_KEY = (id: number) => `last_location_${id}`;

export default function LocationScreen() {
  const route = useRoute<any>();
  const mapRef = useRef<MapView>(null);

  const [elderId, setElderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [latest, setLatest] = useState<LatestLocationResp | null>(null);
  const [address, setAddress] = useState<string>('尚未取得地址');

  const initialRegion: Region = {
    latitude: 25.033964,       //預設： 台北市政府
    longitude: 121.564468,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };
  const [elderName, setElderName] = useState<string>('');

  // 取得 elderId
  useEffect(() => {
    (async () => {
      try {
        // 1) 優先用 selectedMember（你家人端切換成員時常用的資料）
        const raw = await AsyncStorage.getItem('selectedMember');
        if (raw) {
          const obj = JSON.parse(raw);
          const isElder = obj?.is_elder === true || obj?.RelatedID != null;
          if (isElder && typeof obj?.UserID === 'number' && !Number.isNaN(obj.UserID)) {
            setElderId(obj.UserID);
            if (typeof obj?.Name === 'string') setElderName(obj.Name);
            return;
          }
        }

        // 2) 其次用你常存的 elder_id / elder_name
        const savedId = await AsyncStorage.getItem('elder_id');
        const savedName = await AsyncStorage.getItem('elder_name');
        const n = savedId ? Number(savedId) : NaN;
        if (!Number.isNaN(n)) {
          setElderId(n);
          if (savedName) setElderName(savedName);
          return;
        }

        // 3) 路由帶進來（如果有）
        const fromRouteId = route?.params?.elderId;
        const fromRouteName = route?.params?.elderName;
        if (typeof fromRouteId === 'number' && !Number.isNaN(fromRouteId)) {
          setElderId(fromRouteId);
          if (typeof fromRouteName === 'string') setElderName(fromRouteName);
          return;
        }

        setElderId(null);
        setElderName('');
      } catch {
        setElderId(null);
        setElderName('');
      }
    })();
  }, [route?.params]);



  // 進頁面先快取（先有針再說）
  useEffect(() => {
    (async () => {
      if (elderId == null) return;
      const cached = await AsyncStorage.getItem(CACHE_KEY(elderId));
      if (!cached) return;
      try {
        const c = JSON.parse(cached);
        if (Number.isFinite(c.lat) && Number.isFinite(c.lon)) {
          setLatest({ ok: true, user: elderId, lat: c.lat, lon: c.lon, ts: c.ts || '' });
          setAddress(c.address || '—');
          setTimeout(() => {
            mapRef.current?.animateCamera(
              { center: { latitude: c.lat, longitude: c.lon }, zoom: 16 },
              { duration: 600 }
            );
          }, 0);
        }
      } catch {}
    })();
  }, [elderId]);

  // 進頁面抓一次最新定位
  useEffect(() => {
    if (elderId != null && !Number.isNaN(elderId)) fetchLatest();
  }, [elderId]);

  // 最新座標
  useEffect(() => {
    if (!latest) return;
    mapRef.current?.animateCamera(
      { center: { latitude: latest.lat, longitude: latest.lon }, zoom: 16 },
      { duration: 600 }
    );
  }, [latest]);

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
      const { data } = await axios.get<LatestLocationResp>(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      if (!data?.ok) throw new Error('後端回傳失敗');

      const lat = Number(data.lat);
      const lon = Number(data.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('無定位資料');

      const normalized: LatestLocationResp = { ...data, lat, lon };
      setLatest(normalized);

      const addr = await reverseGeocode(lat, lon, 'zh-TW', BASE_URL);
      setAddress(addr || '無法取得地址');

      await AsyncStorage.setItem(
        CACHE_KEY(elderId),
        JSON.stringify({ lat, lon, ts: data.ts, address: addr || '' })
      );
    } catch (e: any) {
      console.log('❌ 取定位失敗:', e?.message);
      Alert.alert('錯誤', String(e?.response?.data?.error || e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const hasCoord = Number.isFinite(latest?.lat) && Number.isFinite(latest?.lon);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{elderName ? `${elderName}` : '   '}  目前位址</Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={fetchLatest}
        disabled={loading || elderId == null}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>{loading ? '更新中…' : '重新整理'}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator style={{ marginTop: 8 }} />}

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          key={hasCoord ? 'has-marker' : 'no-marker'}
          provider={PROVIDER_GOOGLE}
          liteMode={false}
          cacheEnabled={false}
          initialRegion={initialRegion}
        >
          {/* 永遠顯示的測試針：確認環境能畫 Marker */}
          <Marker
            identifier="test-pin"
            coordinate={{ latitude: 25.033964, longitude: 121.564468 }}
            title="測試針（台北市府）"
          />

          {hasCoord && (
            <>
              {/* 自訂 Marker（避免系統針在某些機型不顯示） */}
              <Marker
                identifier="elder-pin"
                coordinate={{ latitude: latest!.lat, longitude: latest!.lon }}
                zIndex={999}
                tracksViewChanges={true}
              >
                <View style={styles.pinWrap} renderToHardwareTextureAndroid={true}>
                  <View style={styles.pinDot} />
                  <Text style={styles.pinLabel}>長者</Text>
                </View>
              </Marker>

              {/* 疊一個小圓，雙保險看得到位置 */}
              <Circle
                center={{ latitude: latest!.lat, longitude: latest!.lon }}
                radius={12}
                strokeWidth={1}
                strokeColor="rgba(0,0,0,0.6)"
                fillColor="rgba(0,0,0,0.25)"
              />
            </>
          )}
        </MapView>
      </View>

      {hasCoord && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>緯度：{latest!.lat}</Text>
          <Text style={styles.infoText}>經度：{latest!.lon}</Text>
          <Text style={styles.infoText}>時間：{formatTs(latest!.ts)}</Text>
          <Text style={styles.infoText}>地址：{address}</Text>
        </View>
      )}
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F4F5F7' },
  title: { color: '#000', fontSize: 22, fontWeight: '900', marginBottom: 10 },
  btn: {
    padding: 14,
    backgroundColor: '#A6CFA1',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  mapContainer: { flex: 1, marginTop: 10 },
  map: { width: width - 40, height: height * 0.55 }, // 固定高度
  infoCard: {
    marginTop: 14,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  infoText: { color: '#000', fontSize: 16, marginBottom: 6 },
  // 自訂 Marker 樣式
  pinWrap: { alignItems: 'center' },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff4d4f',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 6, 
  },
  pinLabel: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    color: '#fff',
    fontSize: 12,
  },
});
