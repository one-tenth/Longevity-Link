import React, { useEffect } from 'react';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import BackgroundTimer from 'react-native-background-timer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function ElderLocation() {
  useEffect(() => {
    const startLocationUpload = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('權限錯誤', '請開啟定位權限');
        return;
      }

      BackgroundTimer.runBackgroundTimer(async () => {
        try {
          Geolocation.getCurrentPosition(
            async position => {
              const token = await AsyncStorage.getItem('accessToken');
              await axios.post('http://192.168.196.180:8000/api/location/upload/', {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }, {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
              console.log('✅ 定位已上傳');
            },
            error => {
              console.log('❌ 定位失敗', error);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
          );
        } catch (e) {
          console.log('❌ 上傳失敗', e);
        }
      }, 5 * 60 * 1000); // 每 5 分鐘
    };

    startLocationUpload();

    return () => {
      BackgroundTimer.stopBackgroundTimer();
    };
  }, []);

  return null;
}

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
    ]);
    return (
      granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
    );
  }
  return true; 
}
