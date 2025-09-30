import React, { useEffect, useRef, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import {
  requestLocationPermissions,
  getCurrentCoords,
  watchCoords,
  Coords,
  formatTs,
  reverseGeocode,
} from '../utils/locationUtils';

const BASE_URL = 'http://172.20.10.8:8000';

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  green: '#A6CFA1',
};

export default function ElderLocation({ navigation }: any) {
  // 狀態管理
  const [uploading, setUploading] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [lastUploadedAt, setLastUploadedAt] = useState<string>('');
  const [address, setAddress] = useState<string>('尚未取得地址');

  const [userName, setUserName] = useState<string>('使用者');
  const [isTracking, setIsTracking] = useState(false);

  const stopRef = useRef<null | (() => void)>(null);
  const mountedRef = useRef(true);

  // 初始化
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

        const addr = await reverseGeocode(c.latitude, c.longitude, 'zh-TW', BASE_URL);
        if (mountedRef.current && addr) setAddress(addr);
      } catch (e: any) {
        console.warn('getCurrentCoords error', e?.message ?? e);
      }
    })();

    // 抓使用者名稱
    (async () => {
      try {
        const storedName = await AsyncStorage.getItem('user_name');
        if (storedName) {
          setUserName(storedName);
        } else {
          const token = await AsyncStorage.getItem('access');
          if (token) {
            const res = await axios.get(`${BASE_URL}/api/account/me/`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data?.Name) {
              setUserName(res.data.Name);
              await AsyncStorage.setItem('user_name', res.data.Name);
            }
          }
        }
      } catch (err) {
        console.log('❌ 抓使用者名稱失敗:', err);
      }
    })();

    return () => {
      mountedRef.current = false;
      stopRef.current?.();
    };
  }, []);

  // 上傳 API
  async function upload(c: Coords) {
    console.log("上傳位置:", c); // 檢查是否進入上傳邏輯
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

  // 按鈕事件-上傳一次位置
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

  // 持續定位
  const startWatching = async () => {
    if (stopRef.current) {
      Alert.alert('提示', '已在持續上傳中');
      return;
    }
    // 每1分鐘更新一次
    stopRef.current = watchCoords(
      async (c) => {
        if (!mountedRef.current) return;
        setCoords(c);
        console.log("正在上傳位置:", c);
        await upload(c); // 更新時上傳位置
      },
      (e) => console.warn('watch error', e?.message ?? e),
      15 * 60 * 1000, // 每15分鐘更新一次
      
    );
    setIsTracking(true); // 更新為定位中
    Alert.alert('已開始', '持續上傳定位中');
  };

  // 停止定位
  const stopWatching = () => {
    stopRef.current?.();
    stopRef.current = null;
    setIsTracking(false); // 停止定位
    Alert.alert('已停止', '停止上傳位址');
  };

  // UI 畫面
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* 上半：使用者列 */}
      <View style={styles.topArea}>
        <View style={styles.userCard}>
          <Image source={require('../img/elderlyhome/grandpa.png')} style={styles.userIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{userName}</Text>
          </View>
        </View>
      </View>

      {/* 下半：白色圓角面板 */}
      <View style={styles.panel}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
          <Text style={styles.pageTitle}> 定位資訊</Text>

          {/* 按鈕 */}
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#A6CFA1' }]} onPress={handleUploadOnce} disabled={uploading}>
            <Text style={styles.btnText}>{uploading ? '上傳中…' : '上傳目前位置'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, { backgroundColor: '#7FB77E' }]} onPress={startWatching} disabled={isTracking || uploading}>
            <Text style={styles.btnText}>{isTracking ? '定位中' : '持續定位'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.stop,]} onPress={stopWatching}>
            <Text style={styles.btnText}>停止定位</Text>
          </TouchableOpacity>

          {/* 定位卡片 */}
          <View style={[styles.infoCard, styles.cardShadow, { backgroundColor: COLORS.cream }]}>
            <Text style={styles.cardText}>
              緯度：{coords ? coords.latitude.toFixed(6) : '尚未取得'}
            </Text>
            <Text style={styles.cardText}>
              經度：{coords ? coords.longitude.toFixed(6) : '尚未取得'}
            </Text>
            <Text style={styles.cardText}>
              上傳時間：{lastUploadedAt || '—'}
            </Text>
            <Text style={styles.cardText}>
              地址：{address || '尚未取得地址'}
            </Text>
          </View>

          {uploading && <ActivityIndicator style={{ marginTop: 8 }} size="large" color="#333" />}
        </ScrollView>
      </View>

      {/* 底部圓形回首頁按鈕 */}
      <View pointerEvents="box-none" style={styles.fabWrap}>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('ElderHome' as never)}
        >
          <MaterialIcons name="home" size={80} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const IMAGE_SIZE = 80;

// 樣式
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  topArea: { padding: 20, paddingTop: 40 },
  userCard: { flexDirection: 'row', alignItems: 'center' },
  userIcon: { width: IMAGE_SIZE, height: IMAGE_SIZE, marginRight: 15, resizeMode: 'contain' },
  userName: { fontSize: 35, fontWeight: 'bold', color: COLORS.white },

  panel: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  pageTitle: { fontSize: 38, fontWeight: 'bold', marginBottom: 20, color: COLORS.black },

  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardText: { fontSize: 24, color: COLORS.black, marginBottom: 6 },

  btn: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  btnText: { color: COLORS.white, fontSize: 28, fontWeight: '600' },

  stop: { backgroundColor: '#444' },

  fabWrap: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.black,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});
