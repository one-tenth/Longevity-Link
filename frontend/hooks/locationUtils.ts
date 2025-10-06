import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation, { GeoPosition, GeoError } from 'react-native-geolocation-service';

// 型別
export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;          // 超時(ms)
  maximumAge?: number;       // 允許的快取(ms)
  distanceFilter?: number;   // 位移才觸發
  interval?: number;         // 更新間隔(ms)
  fastestInterval?: number;  // 更新間隔
  showLocationDialog?: boolean;     
  forceRequestLocation?: boolean;  
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

// 預設選項
const defaultOptions: Required<
  Pick<
    LocationOptions,
    'enableHighAccuracy' | 'timeout' | 'maximumAge' | 'distanceFilter' | 'showLocationDialog' | 'forceRequestLocation'
  >
> = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 10000,
  distanceFilter: 50,
  showLocationDialog: true,
  forceRequestLocation: true,
};

// 請求權限（Android）
export async function requestLocationPermission(requireBackground = false): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    { title: '定位權限', message: '長照通 需要使用精準定位', buttonPositive: '允許', buttonNegative: '拒絕' }
  );

  const coarse = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    { title: '定位權限', message: '長照通 需要使用粗略定位', buttonPositive: '允許', buttonNegative: '拒絕' }
  );

  let backgroundOK = true;
  if (requireBackground && Platform.Version >= 29) {
    backgroundOK =
      (await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        { title: '背景定位權限', message: '長照通 需要在背景持續定位', buttonPositive: '允許', buttonNegative: '拒絕' }
      )) === PermissionsAndroid.RESULTS.GRANTED;
  }

  return (
    fine === PermissionsAndroid.RESULTS.GRANTED &&
    coarse === PermissionsAndroid.RESULTS.GRANTED &&
    backgroundOK
  );
}


// 一次性定位
export function getCurrentCoords(options: LocationOptions = {}): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos: GeoPosition) =>
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err: GeoError) => reject(err),
      { ...defaultOptions, ...options }
    );
  });
}

// 監聽位置（
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


// 反查地址
export async function reverseGeocode(lat: number, lng: number, lang: string = 'zh-TW'): Promise<string> {
  try {
    const url = `http://192.168.1.106/api/reverse_geocode/?lat=${lat}&lng=${lng}&lang=${lang}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.address || '無法取得地址';
  } catch (error) {
    console.warn('reverseGeocode error', error);
    return '無法取得地址';
  }
}