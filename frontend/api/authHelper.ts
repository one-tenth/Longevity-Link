import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// 設置 API 基本 URL
const API_BASE = 'http://192.168.0.91:8000'; // 請根據你的伺服器地址進行更改

// 儲存 access 和 refresh token 到 AsyncStorage
export const storeTokens = async (access: string, refreshToken: string) => {
  await AsyncStorage.setItem('access', access);
  await AsyncStorage.setItem('refresh', refreshToken);
};

// 從 AsyncStorage 中獲取 access token
export const getAccessToken = async () => {
  return await AsyncStorage.getItem('access');
};

// 刷新 access token（如果過期）並儲存新的 token
export const refreshAccessToken = async () => {
  const refreshToken = await AsyncStorage.getItem('refresh');
  if (!refreshToken) throw new Error('No refresh token');
  // 假設 refresh 函數會處理 refresh token 的請求
  const response = await axios.post(`${API_BASE}/api/token/refresh/`, { refresh: refreshToken });
  const newAccess = response.data.access;
  await AsyncStorage.setItem('access', newAccess); // 儲存新的 access token
  return newAccess;
};

// 檢查 token 是否有效
export const isTokenValid = async () => {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    // 假設 verify 函數會檢查 token 的有效性
    await axios.post(`${API_BASE}/api/token/verify/`, { token });
    return true;
  } catch {
    return false;
  }
};
