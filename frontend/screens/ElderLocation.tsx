import React, { useEffect } from 'react';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import BackgroundTimer from 'react-native-background-timer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function ElderLocation() {
  useEffect(() => {
    startLocationUpload();

    return () => {
      BackgroundTimer.stopBackgroundTimer();
    };
  }, []);

  async function startLocationUpload() {
    const ok = await requestLocationPermission();
    if (!ok) {
      Alert.alert('權限錯誤', '請先開啟定位權限');
      return;
    }

    // 5 分鐘一次
    BackgroundTimer.runBackgroundTimer(() => {
      Geolocation.getCurrentPosition(
        async position => {
          try {
            const token = await AsyncStorage.getItem('access');
            await axios.post(
              'http://192.168.1.84:8000/api/location/upload/',
              {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            console.log('✅ 定位已上傳');
          } catch (e) {
            console.log('❌ 上傳失敗', e);
          }
        },
        error => {
          console.log('❌ 定位失敗', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 10000,
        }
      );
    }, 5 * 60 * 1000);
  }

  async function requestLocationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    const fg = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
   
    const sdkInt = Platform.constants?.Version || 0;
    if (sdkInt >= 29) {
      const bg = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
      );
      return bg === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  }

  return null;
}
