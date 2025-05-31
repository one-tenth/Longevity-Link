import axios from 'axios';

// 設置 API 基本 URL
const API_BASE_URL = 'http://192.168.220.243:8000/api';  // 更新為你的後端 URL

// 創建家庭
export async function createFamily(data: { Fcode: string; FamilyName: string }, token: string) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/family/create/`,  
      data,  
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,  // 傳遞 token 用於身份驗證
        },
      }
    );
    return response.data;  
  } catch (error: any) {

    throw new Error(error?.response?.data?.message || '創建家庭失敗');
  }
}


// 加入家庭
export const joinFamily = async (familyData: { Fcode: string }, token: string) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/join/family/`, 
      familyData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,  // 傳遞 token 用於身份驗證
        },
      }
    );
    return response.data;  // 返回成功訊息
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || '加入家庭失敗');
  }
};
