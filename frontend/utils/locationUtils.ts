import { Platform, PermissionsAndroid } from 'react-native';
import axios from 'axios';
import Geolocation from 'react-native-geolocation-service';

// 時間格式：YYYY-MM-DD HH:mm:ss 
export function formatTs(iso: string | number | Date) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 後端取中文地址
export async function reverseGeocode(
  lat: number,
  lon: number,
  lang: 'zh-TW' | 'zh-CN' | 'ja' = 'zh-TW',
  baseUrl: string,
) {
  const instance = axios.create(); 

  const { data } = await instance.get(`${baseUrl}/api/reverse_geocode/`, {
    params: { lat, lng: lon, lang }, 
    timeout: 8000,
  });

  return (data?.address as string) || null;
}


// 權限
export async function requestLocationPermissions() {
  if (Platform.OS !== 'android') return true;
  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  const coarse = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  );
  return (
    fine === PermissionsAndroid.RESULTS.GRANTED &&
    coarse === PermissionsAndroid.RESULTS.GRANTED
  );
}

export type Coords = { latitude: number; longitude: number };

// 單次定位
export function getCurrentCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      e => reject(e),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

// 連續監聽
export function watchCoords(
  onChange: (c: Coords) => void,
  onError?: (e: any) => void,
  interval: number = 60000  // 默認為 1 分鐘
) {
  const id = Geolocation.watchPosition(
    p => onChange({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
    e => onError?.(e),
    { enableHighAccuracy: true, distanceFilter: 5, interval },
  );
  return () => Geolocation.clearWatch(id);
}
