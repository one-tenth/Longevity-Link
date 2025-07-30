import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation, { GeoPosition, GeoError } from 'react-native-geolocation-service';

// 定義型別
export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  distanceFilter?: number;
  interval?: number;
  fastestInterval?: number;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

// 預設選項
const defaultOptions: Required<Pick<LocationOptions, 'enableHighAccuracy' | 'timeout' | 'maximumAge' | 'distanceFilter'>> = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 10000,
  distanceFilter: 50,
};

// 請求權限（Android）
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const fine = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      { title: '定位權限', message: 'App 需要使用精準定位', buttonPositive: '允許', buttonNegative: '拒絕' }
    );
    const coarse = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      { title: '定位權限', message: 'App 需要使用粗略定位', buttonPositive: '允許', buttonNegative: '拒絕' }
    );
    return fine === PermissionsAndroid.RESULTS.GRANTED && coarse === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}


// 一次性獲取座標（可選自訂選項）
export function getCurrentCoords(options: LocationOptions = {}): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos: GeoPosition) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err: GeoError) => reject(err),
      { ...defaultOptions, ...options }
    );
  });
}

//監聽位置（可選自訂選項）
export function watchPosition(
  onUpdate: (loc: LatLng) => void,
  onError: (error: GeoError) => void,
  options: LocationOptions = {}
): () => void {
  const id = Geolocation.watchPosition(
    (pos: GeoPosition) => onUpdate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
    onError,
    { ...defaultOptions, ...options }
  );
  return () => Geolocation.clearWatch(id);
}


//反查地址
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'YourAppName/1.0 (contact@yourdomain.com)' }
    });
    const data = await res.json();
    return data.display_name || '無法取得地址';
  } catch (error) {
    console.warn('reverseGeocode error', error);
    return '無法取得地址';
  }
}
