import React, { useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { requestLocationPermission, getCurrentCoords } from '../hooks/locationUtils';

const BASE_URL = 'http://192.168.1.84:8000';
const INTERVAL_MS = 5 * 60 * 1000; // 5 分鐘

export default function ElderLocation() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastUploadRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const uploadOnce = async () => {
    const now = Date.now();
    if (now - lastUploadRef.current < 60 * 1000) return; // 1 分鐘節流
    lastUploadRef.current = now;

    const token = await AsyncStorage.getItem('access');
    if (!token) throw new Error('No token');

    const coords = await getCurrentCoords({});
    await axios.post(
      `${BASE_URL}/api/location/upload/`,
      { Latitude: Number(coords.latitude), Longitude: Number(coords.longitude) },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
  };

  const startInterval = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      uploadOnce().catch((e) => console.warn('❌ 定期上傳失敗：', e?.message || e));
    }, INTERVAL_MS);
  };

  const stopInterval = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      const ok = await requestLocationPermission(false); // 若要背景上傳，改 true 並加權限
      if (!ok) {
        Alert.alert('權限錯誤', '請先開啟定位權限');
        return;
      }
      try { await uploadOnce(); } catch (e: any) { console.warn('❌ 首次上傳失敗：', e?.message || e); }
      startInterval();
    })();

    const sub = AppState.addEventListener('change', async (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev.match(/inactive|background/) && next === 'active') {
        try { await uploadOnce(); } catch (e: any) { console.warn('❌ 回前景上傳失敗：', e?.message || e); }
        startInterval();
      }
      if (next.match(/inactive|background/)) {
        // 背景立刻停用計時器，避免重複與耗電
        stopInterval();
      }
    });

    return () => {
      mountedRef.current = false;
      sub.remove();
      stopInterval();
    };
  }, []);

  return null; // 無 UI
}
