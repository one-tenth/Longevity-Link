// 為了要重新刷token
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function authFetch(url: string, options: any = {}) {
  const access = await AsyncStorage.getItem('access');
  const refresh = await AsyncStorage.getItem('refresh');

  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${access}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401 && refresh) {
    // access 過期，試著用 refresh token
    const refreshRes = await fetch('http://192.168.0.19:8000/api/token/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      await AsyncStorage.setItem('access', data.access);

      // 重送原本的請求
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${data.access}`,
          'Content-Type': 'application/json',
        },
      });
    } else {
      console.error('Refresh token 無效，請重新登入');
      throw new Error('Token expired, please login again.');
    }
  }

  return response;
}
