import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, StatusBar, ScrollView, Image, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Geolocation from 'react-native-geolocation-service';
import BackgroundFetch from 'react-native-background-fetch';

import { requestLocationPermissions, reverseGeocode, formatTs } from '../utils/locationUtils';

const BASE_URL = 'http://192.168.1.106:8000';

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  green: '#A6CFA1',
};

export default function ElderLocation({ navigation }: any) {
  const [uploading, setUploading] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lastUploadedAt, setLastUploadedAt] = useState<string>(''); // 記錄上傳時間
  const [address, setAddress] = useState<string>('尚未取得地址');
  const [userName, setUserName] = useState<string>('使用者');
  const mountedRef = useRef(true);
  const watchId = useRef<number | null>(null); // 用來儲存 watchPosition id，方便停止

  // 上傳位置API
  async function uploadLocation(latitude: number, longitude: number) {
    const token = await AsyncStorage.getItem('access');
    if (!token) {
      console.log('尚未登入，無法上傳位置');
      return;
    }

    try {
      setUploading(true);
      await axios.post(
        `${BASE_URL}/api/location/upload/`,
        { lat: latitude, lon: longitude },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      const nowIso = new Date().toISOString();
      if (mountedRef.current) setLastUploadedAt(formatTs(nowIso));

      const addr = await reverseGeocode(latitude, longitude, 'zh-TW', BASE_URL);
      if (mountedRef.current && addr) setAddress(addr);

      console.log('位置上傳成功:', latitude, longitude);
    } catch (e: any) {
      console.warn('位置上傳失敗:', e.message || e);
    } finally {
      if (mountedRef.current) setUploading(false);
    }
  }

  // 初始化背景定位任務和權限
  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      const ok = await requestLocationPermissions();
      if (!ok) {
        Alert.alert('提示', '需要定位權限才能啟用背景定位');
        return;
      }

      // 抓使用者名稱
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
        console.log('抓使用者名稱失敗:', err);
      }

      // 初始化背景 fetch
      BackgroundFetch.configure(
        {
          minimumFetchInterval: 15, // 15 分鐘喚醒一次
          stopOnTerminate: false, // 保持背景運行
          startOnBoot: true, // 啟動後自動啟動
          enableHeadless: true, // 支援頭像模式
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
          debug: true,
        } as any,  // 把整個 config 物件斷言成 any
        backgroundFetchTask,
        error => {
          console.warn('[BackgroundFetch] failed to start:', error);
        }
      );

      // 啟動背景 fetch
      BackgroundFetch.start();

      // app 啟動先做一次定位並上傳
      Geolocation.getCurrentPosition(
        async position => {
          const { latitude, longitude } = position.coords;
          if (!mountedRef.current) return;
          setCoords({ latitude, longitude });
          await uploadLocation(latitude, longitude);
        },
        error => {
          console.warn('初次定位錯誤:', error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

      // 持續定位(距離)
      watchId.current = Geolocation.watchPosition(
        async position => {
          const { latitude, longitude } = position.coords;
          if (!mountedRef.current) return;
          setCoords({ latitude, longitude });
          await uploadLocation(latitude, longitude);
        },
        error => {
          console.warn('持續定位錯誤:', error);
        },
        { enableHighAccuracy: true, distanceFilter: 3 } // 每當移動一定距離就更新
      );
    })();

    return () => {
      mountedRef.current = false;
      // 停止定位
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
      BackgroundFetch.stop(); // 停止背景定位
    };
  }, []);

  // 背景任務中取得位置並上傳
  async function backgroundFetchTask(taskId: string) {
    console.log('[BackgroundFetch] task start:', taskId);
    //首次定位
    Geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude } = position.coords;
        if (!mountedRef.current) {
          BackgroundFetch.finish(taskId);
          return;
        }
        setCoords({ latitude, longitude });
        await uploadLocation(latitude, longitude);
        BackgroundFetch.finish(taskId);
      },
      error => {
        console.warn('[BackgroundFetch] getCurrentPosition error:', error);
        BackgroundFetch.finish(taskId);
      },
      {
        enableHighAccuracy: true,
        timeout: 3000,
        maximumAge: 10000,
        forceRequestLocation: true,
      }
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />
      <View style={styles.topArea}>
        <View style={styles.userCard}>
          <Image source={require('../img/elderlyhome/grandpa.png')} style={styles.userIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{userName}</Text>
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
          <Text style={styles.pageTitle}> 定位資訊</Text>

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

      <View pointerEvents="box-none" style={styles.fabWrap}>
        <MaterialIcons name="home" size={80} color={COLORS.white} />
      </View>
    </View>
  );
}

const IMAGE_SIZE = 80;

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

  fabWrap: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
