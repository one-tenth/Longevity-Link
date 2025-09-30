// screens/FamilyHospitalList.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import notifee, { TriggerType } from '@notifee/react-native';
import { RootStackParamList } from '../App';
import {
  setupNotificationChannel,
  ensureNotificationPermission,
  initVisitNotifications,
} from '../utils/initNotification';

const BASE = 'http://192.108.1.106:8000';


type HospitalRecord = {
  HosId?: number;
  HosID?: number;
  id?: number;
  ClinicDate: string;
  ClinicPlace: string;
  Doctor: string;
  Num: number;
};

type HospitalListNav = StackNavigationProp<RootStackParamList, 'FamilyHospitalList'>;
type HospitalListRoute = RouteProp<RootStackParamList, 'FamilyHospitalList'>;

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
  cream: '#FFFCEC',
};

const R = 22;
const outerShadow = {
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
};

// ========== Auth 輔助：自動帶 Authorization；401 嘗試 refresh ==========
async function requestWithAuth<T = any>(
  method: 'get' | 'delete' | 'post' | 'put' | 'patch',
  url: string,
  body?: any
) {
  let access = await AsyncStorage.getItem('access');
  const refresh = await AsyncStorage.getItem('refresh');

  if (!access) {
    console.log('[AUTH] no access token');
    throw { code: 'NO_ACCESS' };
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${access}` };

  try {
    console.log('[AUTH] request', method.toUpperCase(), url);
    const resp = await axios.request<T>({ method, url, data: body, headers, timeout: 10000 });
    return resp;
  } catch (err: any) {
    const status = err?.response?.status;
    console.log('[AUTH] first try fail:', status, err?.response?.data);

    if (status !== 401 || !refresh) throw err;

    const candidates = [
      `${BASE}/api/token/refresh/`,
      `${BASE}/api/auth/refresh/`,
      `${BASE}/auth/jwt/refresh/`,
    ];

    for (const ep of candidates) {
      try {
        console.log('[AUTH] try refresh:', ep);
        const r = await axios.post<{ access: string }>(ep, { refresh }, { timeout: 10000 });
        if (r?.data?.access) {
          access = r.data.access;
          await AsyncStorage.setItem('access', access);
          const retryHeaders = { Authorization: `Bearer ${access}` };
          console.log('[AUTH] refresh ok, retry:', method.toUpperCase(), url);
          const retry = await axios.request<T>({
            method,
            url,
            data: body,
            headers: retryHeaders,
            timeout: 10000,
          });
          return retry;
        }
      } catch {
        console.log('[AUTH] refresh failed on', ep);
      }
    }
    throw { code: 'REFRESH_FAIL', original: err };
  }
}

// ========== elderId 強韌解析（多來源；永遠不用 RelatedID） ==========
function toValidId(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function resolveElderIdDeep(routeParams: any): Promise<number | null> {
  try {
    console.log('================= [ELDER] resolve start =================');

    // 1) route.params.elderId / elderID
    const routeRaw = routeParams?.elderId ?? routeParams?.elderID;
    const routeId = toValidId(routeRaw);
    console.log('[ELDER] route.params -> raw:', routeRaw, ' parsed:', routeId);
    if (routeId) return routeId;

    // 2) AsyncStorage.elder_id
    const savedStr = await AsyncStorage.getItem('elder_id');
    const savedId = toValidId(savedStr);
    console.log('[ELDER] storage elder_id -> raw:', savedStr, ' parsed:', savedId);
    if (savedId) return savedId;

    // 3) AsyncStorage.selectedMember（僅取長者的 UserID 或明確 elderId 欄位）
    const selStr = await AsyncStorage.getItem('selectedMember');
    console.log('[ELDER] storage selectedMember (raw string) =', selStr);
    if (selStr && selStr.trim()) {
      try {
        const obj = JSON.parse(selStr);
        console.log('[ELDER] selectedMember parsed =', obj);

        // 3a) 明確 elderId 欄位
        const direct = toValidId(obj?.elderId ?? obj?.elder_id ?? obj?.ElderID ?? obj?.elder?.id);
        console.log('[ELDER] try direct elderId =', direct);
        if (direct) return direct;

        // 3b) 若物件本身就是長者，使用其 UserID
        const role = String(obj?.role || '').toLowerCase();
        const isElder = obj?.isElder === true || role === 'elder' || obj?.RelatedID != null;
        const uid = toValidId(obj?.UserID ?? obj?.id);
        console.log('[ELDER] infer isElder =', isElder, ' uid =', uid);
        if (isElder && uid) return uid;

        // ⚠️ 不使用 RelatedID（多半是指向家人）
      } catch (e) {
        console.log('[ELDER] parse selectedMember failed:', e);
      }
    }

    console.log('[ELDER] all sources failed → null');
    return null;
  } finally {
    console.log('================= [ELDER] resolve end =================');
  }
}

export default function FamilyHospitalList({ route }: { route: HospitalListRoute }) {
  const navigation = useNavigation<HospitalListNav>();

  const [records, setRecords] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [elderId, setElderId] = useState<number | null>(null);
  const [hint, setHint] = useState<string>('');

  // 讀 elderId（優先 route → 再 AsyncStorage）→ 換成強韌解析並寫回 storage
  const loadElderInfo = useCallback(async () => {
    const id = await resolveElderIdDeep(route.params);
    console.log('[ELDER] loadElderInfo resolved id =', id);
    if (id != null) {
      setElderId(id);
      await AsyncStorage.setItem('elder_id', String(id));
    } else {
      setElderId(null);
    }
  }, [route.params]);

  // 取清單（每次重新解析，避免 state race）
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setHint('');
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        setHint('尚未登入，無法載入資料');
        setRecords([]);
        return;
      }

      const id = await resolveElderIdDeep(route.params);
      console.log('[ELDER] fetchRecords resolved id =', id);

      if (!id) {
        setHint('尚未指定長者');
        setRecords([]);
        return;
      }

      // 同步回寫，其他頁可備援使用
      await AsyncStorage.setItem('elder_id', String(id));
      setElderId(id);

      const url = `${BASE}/api/hospital/list/?user_id=${id}`;
      console.log('[ELDER] GET', url);

      const res = await requestWithAuth<HospitalRecord[]>('get', url);
      const data = Array.isArray(res.data) ? res.data : [];

      setRecords(data);
      if (data.length === 0) setHint('還沒有新增過看診資料');
    } catch (e: any) {
      if (e?.code === 'NO_ACCESS') {
        setHint('請先登入');
        setRecords([]);
        Alert.alert('需要登入', '請先登入');
        navigation.navigate('LoginScreen' as never);
        return;
      }
      if (e?.code === 'REFRESH_FAIL' || e?.response?.status === 401) {
        setHint('登入已過期，請重新登入');
        setRecords([]);
        Alert.alert('需要重新登入', '登入已過期或刷新失敗，請重新登入');
        navigation.navigate('LoginScreen' as never);
        return;
      }
      console.log('取得看診紀錄失敗:', e?.response?.status, e?.response?.data || e);
      setRecords([]);
      setHint('資料暫時載入失敗，請稍後下拉重新整理');
    } finally {
      setLoading(false);
    }
  }, [route.params, navigation]);

  // 畫面聚焦→先解析 id 再拉資料
  useFocusEffect(
    useCallback(() => {
      (async () => {
        await loadElderInfo();
        await fetchRecords();
      })();
    }, [loadElderInfo, fetchRecords])
  );

  const getPk = (r: HospitalRecord) => r.HosId ?? r.HosID ?? r.id;
  const getKey = (r: HospitalRecord) => String(getPk(r) ?? Math.random());

  const confirmDelete = (pk?: number) => {
    if (pk == null) return;
    Alert.alert('確認刪除', '確定要刪除這筆看診紀錄嗎？', [
      { text: '取消' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () => handleDelete(pk),
      },
    ]);
  };

  const handleDelete = async (pk: number) => {
    try {
      const id = await resolveElderIdDeep(route.params);
      if (!id) {
        Alert.alert('錯誤', '未指定長者');
        return;
      }

      await requestWithAuth('delete', `${BASE}/api/hospital/${pk}/?user_id=${id}`);

      setRecords((prev) => {
        const next = prev.filter((r) => getPk(r) !== pk);
        if (next.length === 0) setHint('還沒有新增過看診資料');
        return next;
      });

      await initVisitNotifications();
    } catch (e: any) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.error ||
        (status >= 500 ? '伺服器錯誤，請稍後再試' : '刪除失敗');
      console.log('刪除失敗:', status, e?.response?.data);
      Alert.alert('刪除失敗', msg);
    }
  };

  // ★ 新增紀錄：把 elderId 一路帶到 FamilyAddHospital，並寫進 AsyncStorage 備援
  const goAddRecord = useCallback(async () => {
    const id = await resolveElderIdDeep(route.params);
    if (!Number.isFinite(id as number)) {
      Alert.alert('提醒', '請先選擇要照護的長者');
      // 可導至選人頁：navigation.navigate('FamilyScreen', { mode: 'select' } as never);
      return;
    }
    await AsyncStorage.setItem('elder_id', String(id));
    console.log('[ELDER] goAddRecord with id =', id);
    navigation.navigate('FamilyAddHospital', { elderId: id } as never);
  }, [route.params, navigation]);

  // ★ 測試：為某筆回診建立「1 分鐘後」的通知（保留）
  const scheduleTestNotification = async (r: HospitalRecord) => {
    try {
      await setupNotificationChannel();
      await ensureNotificationPermission();

      const pk = getPk(r) ?? `${r.ClinicDate}-${r.ClinicPlace}`;
      const inMs = 1 * 60 * 1000; // 1 分鐘
      const at = new Date(Date.now() + inMs);
      const notifId = `debug-visit::${pk}::${at.getTime()}`;

      await notifee.createTriggerNotification(
        {
          id: notifId,
          title: '🏥 回診測試通知（1 分鐘後）',
          body: `${r.ClinicDate}｜${r.ClinicPlace || ''}${r.Doctor ? `｜醫師：${r.Doctor}` : ''}${
            (r.Num ?? '') !== '' ? `｜號碼：${r.Num}` : ''
          }`,
          android: {
            channelId: 'appointments',
            smallIcon: 'ic_launcher',
            pressAction: { id: 'open-visit' },
          },
          data: {
            type: 'visit',
            visitId: String(pk),
            date: r.ClinicDate,
            time: '測試+1分鐘',
            place: String(r.ClinicPlace || ''),
            doctor: String(r.Doctor || ''),
            num: String(r.Num ?? ''),
          },
        },
        { type: TriggerType.TIMESTAMP, timestamp: at.getTime(), alarmManager: true }
      );

      Alert.alert('已排程', '將在 1 分鐘後跳出這筆回診的測試通知。');
    } catch (e) {
      console.log('scheduleTestNotification error:', e);
      Alert.alert('排程失敗', '請確認通知權限與頻道設定。');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.sideSlot}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FontAwesome name="arrow-left" size={22} color={COLORS.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.centerSlot}>
          <View style={[styles.featureBanner, outerShadow]}>
            <Text style={styles.bannerTitle}>回診功能</Text>
          </View>
        </View>

        <View style={styles.sideSlot} />
      </View>

      {/* Content */}
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={{ alignItems: 'center' }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRecords} />}
      >
        {records.length > 0 ? (
          records.map((r) => {
            const pk = getPk(r);
            return (
              <View key={getKey(r)} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.time}>日期：{r.ClinicDate}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {/* 測試通知保留（如需啟用，把按鈕打開）
                    <TouchableOpacity style={styles.testBtn} onPress={() => scheduleTestNotification(r)}>
                      <Text style={styles.testText}>測試通知</Text>
                    </TouchableOpacity> */}
                    {pk != null && (
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(pk)}>
                        <Text style={styles.deleteText}>刪除</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text style={styles.place}>地點：{r.ClinicPlace}</Text>
                <Text style={styles.doctor}>醫師：{r.Doctor}</Text>
                <Text style={styles.num}>號碼：{r.Num}</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.hint}>{hint}</Text>
        )}
      </ScrollView>

      {/* 新增紀錄 FAB */}
      <TouchableOpacity style={styles.fab} onPress={goAddRecord}>
        <FontAwesome name="plus" size={18} color={COLORS.cream} style={{ marginRight: 8 }} />
        <Text style={styles.fabText}>新增紀錄</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    minHeight: 76,
  },
  sideSlot: { width: 48, alignItems: 'center', justifyContent: 'center' },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  centerSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  featureBanner: {
    width: '90%',
    minHeight: 64,
    backgroundColor: COLORS.green,
    borderRadius: R,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.black, letterSpacing: 0.3 },

  card: {
    backgroundColor: COLORS.cream,
    width: '85%',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 16, fontWeight: 'bold' },
  place: { fontSize: 14, marginTop: 4 },
  doctor: { fontSize: 14, marginTop: 4 },
  num: { fontSize: 14, marginTop: 4 },
  hint: { textAlign: 'center', color: COLORS.textMid, marginTop: 24 },

  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.black,
    ...outerShadow,
  },
  fabText: { fontSize: 16, fontWeight: '900', color: COLORS.cream },

  testBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1976D2',
    borderRadius: 6,
  },
  testText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E53935',
    borderRadius: 6,
  },
  deleteText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});
