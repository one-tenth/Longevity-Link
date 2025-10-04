import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';



const API_BASE = 'http://192.168.31.126:8000'; // ← 換成你的後端 IP



// ===== 型別 =====
type DeviceCall = {
  phoneNumber?: string;
  name?: string;
  dateTime?: string;
  timestamp?: string | number;
  duration?: string | number;
  type?: string;
};

type ServerCall = {
  CallId: number;
  UserId: number;
  PhoneName: string;
  Phone: string;
  PhoneTime: string;
  Type: string;  // 這裡新增 Type 屬性，表示通話類型
  IsScam: boolean;  // 詐騙標註
};

// 工具函數：處理通話類型顯示
function typeLabel(t?: string) {
  if (!t) {
    return '未知';  // 如果沒有傳遞 Type，則顯示「未知」
  }

  switch (t.toUpperCase()) {
    case 'INCOMING':
      return '來電';
    case 'OUTGOING':
      return '撥出';
    case 'MISSED':
      return '未接';
    case 'REJECTED':
      return '已拒接';
    default:
      return '未知';
  }
}

// 更新的 fmt 函數，處理時間格式
function fmt(ts?: string | number, dt?: string) {
  let timestamp = ts;

  if (typeof ts === 'string' && !isNaN(Date.parse(ts))) {
    timestamp = Date.parse(ts);
  }

  const d = timestamp != null ? new Date(timestamp) : (dt ? new Date(dt) : null);

  if (!d || isNaN(+d)) return '無效時間';  // 如果時間無效則返回錯誤訊息

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${y}-${m}-${day}`;  // 返回格式化的日期（年-月-日）
}

const safeStr = (v: any) => (v == null ? '' : String(v));

// 正規化電話號碼，移除非數字字符，並根據台灣的區域號碼格式進行格式化
const normalizePhone = (p: string) =>
  (p || '').replace(/\D/g, '').replace(/^886(?=\d{9,})/, '0');

// 顯示電話號碼或名稱
const displayName = (n?: string) => (n && n.trim().length > 0 ? n.trim() : '未知來電');

const displayPhoneOrUnknown = (p?: string, n?: string) => {
  const phone = (p || '').trim();
  return phone || displayName(n);  // 如果電話號碼為空，顯示名稱，若名稱也為空則顯示「未知來電」
};

// 自動刷新 Token
async function refreshAccessToken() {
  try {
    const refresh = await AsyncStorage.getItem('refresh');
    if (!refresh) return false;
    const r = await axios.post(`${API_BASE}/api/token/refresh/`, { refresh });
    const newAccess = r.data?.access;
    if (!newAccess) return false;
    await AsyncStorage.setItem('access', newAccess);
    return true;
  } catch {
    return false;
  }
}

// 帶有身份驗證的 GET 請求
async function authGet<T = any>(url: string) {
  let access = await AsyncStorage.getItem('access');
  try {
    if (!access) throw { response: { status: 401 } };
    return await axios.get<T>(url, { headers: { Authorization: `Bearer ${access}` } });
  } catch (e: any) {
    if (e?.response?.status === 401 && (await refreshAccessToken())) {
      access = await AsyncStorage.getItem('access');
      return await axios.get<T>(url, { headers: { Authorization: `Bearer ${access}` } });
    }
    throw e;
  }
}

async function authPost<T = any>(url: string, data: any) {
  let access = await AsyncStorage.getItem('access');
  try {
    if (!access) throw { response: { status: 401 } };
    return await axios.post<T>(url, data, { headers: { Authorization: `Bearer ${access}` } });
  } catch (e: any) {
    if (e?.response?.status === 401 && (await refreshAccessToken())) {
      access = await AsyncStorage.getItem('access');
      return await axios.post<T>(url, data, { headers: { Authorization: `Bearer ${access}` } });
    }
    throw e;
  }
}

export default function CallLogScreen() {
  const navigation = useNavigation();
  const [elderId, setElderId] = useState<number | null>(null);
  const [elderName, setElderName] = useState<string>('');  
  const [scamMap, setScamMap] = useState<Record<string, string>>({});  // 用來標註詐騙號碼的映射
  const [serverLogs, setServerLogs] = useState<ServerCall[]>([]);  // 伺服器端通話紀錄
  const [loadingServer, setLoadingServer] = useState(false);

  // 加載長者ID和名稱
  async function loadSelectedElder() {
    const [eid, ename] = await Promise.all([ 
      AsyncStorage.getItem('elder_id'), 
      AsyncStorage.getItem('elder_name') 
    ]);
    if (!eid) {
      setElderId(null);
    } else {
      setElderId(Number(eid));
      setElderName(ename || '');
    }
  }

  // 加載伺服器端的通話紀錄（最多100筆，按時間排序）
  async function loadServerLogs() {
    const elderId = await AsyncStorage.getItem('elder_id');
    if (!elderId) return;
    setLoadingServer(true);
    try {
      const res = await authGet<ServerCall[]>(`${API_BASE}/api/callrecords/${elderId}/`);
      console.log("Server logs received:", res.data);  // 打印返回的資料，檢查 Type 欄位
      setServerLogs(res.data ?? []);  // 儲存伺服器端的通話紀錄
    } catch (error) {
      console.error('[uploadRecentCalls] error:', error);
    } finally {
      setLoadingServer(false);
    }
  }

  useEffect(() => {
    loadSelectedElder();
  }, []);

  useEffect(() => {
    if (elderId) loadServerLogs();  // 在有長者ID時才加載伺服器端通話紀錄
  }, [elderId]);

  // 更新 scamMap 用來標記詐騙號碼
  useEffect(() => {
    async function fetchScamData() {
      const phones = serverLogs.map((log) => normalizePhone(log.Phone));
      if (!phones.length) return;

      try {
        const res = await axios.post(`${API_BASE}/api/scam/check_bulk/`, { phones });
        const scamData = res.data?.matches || {};

        console.log('詐騙資料:', scamData);  // 輸出詐騙資料，查看是否正確

        // 更新 scamMap，這裡是用來標註詐騙號碼的映射
        setScamMap(scamData);  // 確保 scamMap 被正確更新
      } catch (error) {
        console.error('Error fetching scam data:', error);
      }
    }

    if (serverLogs.length > 0) {
      fetchScamData();  // 只有當通話紀錄有內容時才進行詐騙檢查
    }
  }, [serverLogs]);  // 在 serverLogs 更新時觸發詐騙檢查

  // 渲染每個通話紀錄項目
  const renderDeviceItem = ({ item }: { item: ServerCall }) => {
    const phoneNorm = normalizePhone(item.Phone || '');
    const category = scamMap[phoneNorm];  // 從 scamMap 中查詢是否該電話號碼是詐騙
    const hit = !!category;

    return (
      <View style={[styles.item, hit && styles.itemScam]}>
        <Text style={[styles.phone, hit && { color: '#B71C1C' }]}>
          {displayPhoneOrUnknown(item.Phone, item.PhoneName)}
          {hit && <Text style={styles.scamTag}> {category}</Text>}  {/* 顯示詐騙標註 */}
        </Text>

        <Text style={styles.detail}>
          {`名稱: ${item.PhoneName || '未知來電'}  · 通話時間: ${item.PhoneTime || "0s"}`}
        </Text>
      </View>
    );
  };

  // 定義 goScamForm 函數，點擊後跳轉到 ScamFormScreen
  const goScamForm = () => {
    navigation.navigate('ScamScreen');  // 確保 ScamFormScreen 已經在導航設定中註冊
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#111" />
          <Text style={styles.backText}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>通話紀錄 {elderName && `(${elderName})`}</Text>
        {/* <TouchableOpacity style={styles.scamAddBtn} onPress={goScamForm}>
          <Feather name="shield" size={16} color="#fff" />
          <Text style={styles.scamAddText}>新增詐騙</Text>
        </TouchableOpacity> */}
      </View>
      <FlatList
        data={serverLogs}  // 顯示伺服器端的通話紀錄
        keyExtractor={(_, idx) => `d-${idx}`}
        renderItem={renderDeviceItem}  // 渲染每個通話紀錄項目
        refreshing={loadingServer}  // 顯示伺服器端通話紀錄的加載狀態
        onRefresh={loadServerLogs}  // 這裡改為加載伺服器端的資料
        ListEmptyComponent={<Text style={styles.empty}>目前沒有通話紀錄</Text>}
      />
    </View>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 64 },
  backText: { color: '#111', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#111' },
  scamAddBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  scamAddText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  error: { color: 'red', margin: 12 },
  info: { color: '#111', margin: 12 },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  itemScam: {
    borderWidth: 1.5, borderColor: '#E53935', backgroundColor: '#FFF4F4',
    borderRadius: 10, marginHorizontal: 12, marginVertical: 6,
  },
  phone: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  detail: { fontSize: 15, color: '#555', marginTop: 2 },
  time: { fontSize: 13, color: '#888', marginTop: 2 },
  empty: { textAlign: 'center', color: '#888', marginTop: 30 },
  scamTag: {
    fontSize: 12, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, marginLeft: 6, backgroundColor: '#FDECEC', color: '#C62828', fontWeight: 'bold',
  },
});
