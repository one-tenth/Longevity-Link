import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { reverseGeocode } from '../hooks/locationUtils.ts';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../App';


const { width, height } = Dimensions.get('window');
type Props = StackScreenProps<RootStackParamList, 'Location'>;
// 定義 BASE_URL，確保在此檔案可使用
const BASE_URL = 'http://192.168.196.180:8000'; // 換成後端位址

const Location: React.FC<Props> = ({ route }) => {
  const [coord, setCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const elderId = route.params.elderId;

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) throw new Error('Token 不存在');

        const res = await axios.get(
          `${BASE_URL}/api/location/latest/${elderId}/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const { latitude, longitude } = res.data;
        setCoord({ latitude, longitude });

        const addr = await reverseGeocode(latitude, longitude);
        setAddress(addr);
      } catch (err) {
        console.error('❌ 取得長者位置失敗', err);
        Alert.alert('錯誤', '無法取得長者位置');
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [elderId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>載入中...</Text>
      </View>
    );
  }

  if (!coord) {
    return (
      <View style={styles.center}>
        <Text>找不到位置資料</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{ latitude: coord.latitude, longitude: coord.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
      >
        <Marker coordinate={coord} title="長者位置" />
      </MapView>
      <View style={styles.infoPanel}>
        <Text style={styles.infoText}>經度: {coord.longitude.toFixed(6)}{"\n"}緯度: {coord.latitude.toFixed(6)}</Text>
        {address.length > 0 && <Text style={styles.addressText}>{address}</Text>}
      </View>
    </View>
  );
};

export default Location;

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
  infoText: {
    fontSize: 16,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#555',
  },
});
