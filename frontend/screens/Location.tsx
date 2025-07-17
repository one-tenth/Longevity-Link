import React, { useEffect, useState } from 'react';
import { View,Text,StyleSheet,TouchableOpacity,Dimensions,Alert,ActivityIndicator,} from 'react-native';
import { useNavigation,DrawerActions,NavigationProp,} from '@react-navigation/native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import moment from 'moment';
import {requestLocationPermission,getCurrentCoords,reverseGeocode,} from '../src/services/location';

const { width } = Dimensions.get('window');

export default function LocationScreen() {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      //先請求定位權限
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert('定位權限未開啟', '請至系統設定中允許定位後再試');
        setLoading(false);
        return;
      }

      try {
        // 經緯度和反編碼
        const c = await getCurrentCoords();
        setCoords(c);
        const addr = await reverseGeocode(c.lat, c.lng);
        setAddress(addr);
      } catch (e: any) {
        Alert.alert('定位失敗', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const timeStr = moment().format('HH:mm');

  return (
    <View style={styles.container}>
      {/* Header：純文字選單按鈕 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        >
          <Text style={styles.headerButton}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CareMate</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* 主內容 */}
      <View style={styles.content}>
        <Text style={styles.pageTitle}>即時位置</Text>

        {/* 資訊卡片 */}
        <View style={styles.card}>
          <Text style={styles.cardTime}>🕒 時間：{timeStr}</Text>
          <Text style={styles.cardAddr}>
            📍 現在位置：{loading ? '取得中…' : address}
          </Text>
        </View>

        {/* 地圖 or 載入指示 */}
        {loading ? (
          <ActivityIndicator
            style={{ marginTop: 20 }}
            size="large"
            color="#65B6E4"
          />
        ) : coords ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: coords.lat,
              longitude: coords.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{ latitude: coords.lat, longitude: coords.lng }}
              pinColor="blue"
            />
            <Polyline
              coordinates={[
                { latitude: coords.lat - 0.0003, longitude: coords.lng - 0.0003 },
                { latitude: coords.lat, longitude: coords.lng },
              ]}
              strokeWidth={4}
            />
          </MapView>
        ) : null}

        {/* 回首頁按鈕 */}
        <TouchableOpacity
          style={styles.btnBack}
          onPress={() => navigation.navigate('ElderHome')}
        >
          <Text style={styles.btnText}>回首頁</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCFEED' },
  header: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#65B6E4',
  },
  headerButton: {
    fontSize: 24,
    color: '#000',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  headerPlaceholder: { width: 24 },
  content: { flex: 1, alignItems: 'center', paddingTop: 16 },
  pageTitle: { fontSize: 28, fontWeight: '900', marginBottom: 12 },
  card: {
    width: width * 0.9,
    backgroundColor: '#F58402',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  cardTime: { color: '#fff', fontSize: 18, fontWeight: '600' },
  cardAddr: { color: '#fff', fontSize: 16, marginTop: 8 },
  map: {
    width: width * 0.9,
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  btnBack: {
    backgroundColor: '#65B6E4',
    paddingVertical: 14,
    width: width * 0.6,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
