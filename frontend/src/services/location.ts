import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import Geocoder from 'react-native-geocoding';

// 填入你的 Geocoding API Key
Geocoder.init('YOUR_GOOGLE_MAPS_API_KEY');

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: '定位權限',
        message: 'App 需要存取您的定位',
        buttonPositive: '好',             
        buttonNegative: '取消',         
        buttonNeutral: '稍後再說',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

export function getCurrentCoords(): Promise<{ lat: number; lng: number }> {
  return new Promise((res, rej) => {
    Geolocation.getCurrentPosition(
      pos => res({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => rej(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const json = await Geocoder.from(lat, lng);
  return json.results[0]?.formatted_address ?? '無法取得地址';
}
