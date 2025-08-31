// 負責後端的API請求
import axios from 'axios';

const API_BASE = 'http://10.2.61.2:8000/api/account';

export interface RegisterData { Phone: string; Name: string; Gender: 'M' | 'F'; Borndate: string; password: string; }
export interface LoginData { Phone: string; password: string; }
export interface TokenData { refresh: string; }
export interface VerifyData { token: string; }

export const register = (data: RegisterData) => axios.post(`${API_BASE}/users/`, data);
export const login = (data: LoginData) => axios.post(`${API_BASE}/jwt/create/`, data);
export const refresh = (data: TokenData) => axios.post(`${API_BASE}/jwt/refresh/`, data);
export const verify = (data: VerifyData) => axios.post(`${API_BASE}/jwt/verify/`, data);
