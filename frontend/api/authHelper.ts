// 處理 Token 存取與驗證邏輯
import AsyncStorage from '@react-native-async-storage/async-storage';
import { refresh, verify } from '../api/authApi';

export const storeTokens = async (access: string, refreshToken: string) => {
  await AsyncStorage.setItem('access', access);
  await AsyncStorage.setItem('refresh', refreshToken);
};

export const getAccessToken = async () => {
  return await AsyncStorage.getItem('access');
};

export const refreshAccessToken = async () => {
  const refreshToken = await AsyncStorage.getItem('refresh');
  if (!refreshToken) throw new Error('No refresh token');
  const response = await refresh({ refresh: refreshToken });
  await AsyncStorage.setItem('access', response.data.access);
  return response.data.access;
};

export const isTokenValid = async () => {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    await verify({ token });
    return true;
  } catch {
    return false;
  }
};
