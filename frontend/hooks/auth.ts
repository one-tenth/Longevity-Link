//用來統一管理 API 呼叫
import axios from 'axios';

const API_BASE = 'http://192.168.0.24:8000/api/account';


interface RegisterData { //註冊要傳給後端的資訊
  phone: string;
  name: string;
  gender: 'M' | 'F';
  borndate: string;
  password: string;
}

interface LoginData { //登入時要傳給後端的資訊
  phone: string;
  password: string;
}

interface TokenData { //refresh 用來拿新 token
  refresh: string;
}

interface VerifyData { //verify 是用來驗證 token 是否有效
  token: string;
}

export const Register = (data: RegisterData) => axios.post(`${API_BASE}/users/`, data);

export const Login = (data: LoginData) => axios.post(`${API_BASE}/jwt/create/`, data);

export const refresh = (data: TokenData) => axios.post(`${API_BASE}/jwt/refresh/`, data);

export const verify = (data: VerifyData) => axios.post(`${API_BASE}/jwt/verify/`, data);