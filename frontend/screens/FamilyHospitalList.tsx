// screens/FamilyHospitalList.tsx — polished UI rev (unified palette)
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

import { setupNotificationChannel, ensureNotificationPermission, initVisitNotifications } from '../utils/initNotification';


const BASE = 'http://172.20.10.7:8000';

// ===== Types =====
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

// ===== Unified palette (as requested) =====
const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
  cream: '#FFFCEC',
  grayBox: '#F2F2F2',
} as const;

const R = 20;
const SPACING = 16;
const outerShadow = {
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
} as const;

// ========== Auth helper: auto Authorization; 401 -> try refresh ==========
async function requestWithAuth<T = any>(
  method: 'get' | 'delete' | 'post' | 'put' | 'patch',
  url: string,
  body?: any
) {
  let access = await AsyncStorage.getItem('access');
  const refresh = await AsyncStorage.getItem('refresh');
  if (!access) throw { code: 'NO_ACCESS' };
  const headers: Record<string, string> = { Authorization: `Bearer ${access}` };
  try {
    const resp = await axios.request<T>({ method, url, data: body, headers, timeout: 10000 });
    return resp;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status !== 401 || !refresh) throw err;

    const candidates = [
      `${BASE}/api/token/refresh/`,
      `${BASE}/api/auth/refresh/`,
      `${BASE}/auth/jwt/refresh/`,
    ];
    for (const ep of candidates) {
      try {
        const r = await axios.post<{ access: string }>(ep, { refresh }, { timeout: 10000 });
        if (r?.data?.access) {
          access = r.data.access;
          await AsyncStorage.setItem('access', access);
          const retryHeaders = { Authorization: `Bearer ${access}` };
          const retry = await axios.request<T>({ method, url, data: body, headers: retryHeaders, timeout: 10000 });
          return retry;
        }
      } catch {}
    }
    throw { code: 'REFRESH_FAIL', original: err };
  }
}

// ========== elderId resolver (multi-source; never use RelatedID) ==========
function toValidId(v: any): number | null { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; }
async function resolveElderIdDeep(routeParams: any): Promise<number | null> {
  const routeRaw = routeParams?.elderId ?? routeParams?.elderID;
  const routeId = toValidId(routeRaw);
  if (routeId) return routeId;
  const savedStr = await AsyncStorage.getItem('elder_id');
  const savedId = toValidId(savedStr);
  if (savedId) return savedId;
  const selStr = await AsyncStorage.getItem('selectedMember');
  if (selStr && selStr.trim()) {
    try {
      const obj = JSON.parse(selStr);
      const direct = toValidId(obj?.elderId ?? obj?.elder_id ?? obj?.ElderID ?? obj?.elder?.id);
      if (direct) return direct;
      const role = String(obj?.role || '').toLowerCase();
      const isElder = obj?.isElder === true || role === 'elder' || obj?.RelatedID != null;
      const uid = toValidId(obj?.UserID ?? obj?.id);
      if (isElder && uid) return uid;
    } catch {}
  }
  return null;
}

export default function FamilyHospitalList({ route }: { route: HospitalListRoute }) {
  const navigation = useNavigation<HospitalListNav>();
  const [records, setRecords] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string>('');

  const loadElderInfo = useCallback(async () => {
    const id = await resolveElderIdDeep(route.params);
    if (id != null) await AsyncStorage.setItem('elder_id', String(id));
  }, [route.params]);

  const fetchRecords = useCallback(async () => {
    setLoading(true); setHint('');
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) { setHint('尚未登入，無法載入資料'); setRecords([]); return; }

      const id = await resolveElderIdDeep(route.params);
      if (!id) { setHint('尚未指定長者'); setRecords([]); return; }

      await AsyncStorage.setItem('elder_id', String(id));
      const url = `${BASE}/api/hospital/list/?user_id=${id}`;
      const res = await requestWithAuth<HospitalRecord[]>('get', url);
      const data = Array.isArray(res.data) ? res.data : [];
      setRecords(data);
      if (data.length === 0) setHint('還沒有新增過看診資料');
    } catch (e: any) {
      if (e?.code === 'NO_ACCESS') { setHint('請先登入'); setRecords([]); Alert.alert('需要登入', '請先登入'); navigation.navigate('LoginScreen' as never); return; }
      if (e?.code === 'REFRESH_FAIL' || e?.response?.status === 401) { setHint('登入已過期，請重新登入'); setRecords([]); Alert.alert('需要重新登入', '登入已過期或刷新失敗，請重新登入'); navigation.navigate('LoginScreen' as never); return; }
      setRecords([]); setHint('資料暫時載入失敗，請稍後下拉重新整理');
    } finally { setLoading(false); }
  }, [route.params, navigation]);

  useFocusEffect(useCallback(() => { (async () => { await loadElderInfo(); await fetchRecords(); })(); }, [loadElderInfo, fetchRecords]));

  const getPk = (r: HospitalRecord) => r.HosId ?? r.HosID ?? r.id;
  const getKey = (r: HospitalRecord) => String(getPk(r) ?? Math.random());

  const confirmDelete = (pk?: number) => {
    if (pk == null) return;
    Alert.alert('確認刪除', '確定要刪除這筆看診紀錄嗎？', [ { text: '取消' }, { text: '刪除', style: 'destructive', onPress: () => handleDelete(pk) } ]);
  };

  const handleDelete = async (pk: number) => {
    try {
      const id = await resolveElderIdDeep(route.params);
      if (!id) { Alert.alert('錯誤', '未指定長者'); return; }
      await requestWithAuth('delete', `${BASE}/api/hospital/${pk}/?user_id=${id}`);
      setRecords(prev => {
        const next = prev.filter(r => getPk(r) !== pk);
        if (next.length === 0) setHint('還沒有新增過看診資料');
        return next;
      });
      await initVisitNotifications();
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error || (status >= 500 ? '伺服器錯誤，請稍後再試' : '刪除失敗');
      Alert.alert('刪除失敗', msg);
    }
  };

  const goAddRecord = useCallback(async () => {
    const id = await resolveElderIdDeep(route.params);
    if (!Number.isFinite(id as number)) { Alert.alert('提醒', '請先選擇要照護的長者'); return; }
    await AsyncStorage.setItem('elder_id', String(id));
    navigation.navigate('FamilyAddHospital', { elderId: id } as never);
  }, [route.params, navigation]);

  const scheduleTestNotification = async (r: HospitalRecord) => {
    try {
      await setupNotificationChannel();
      await ensureNotificationPermission();
      const pk = getPk(r) ?? `${r.ClinicDate}-${r.ClinicPlace}`;
      const at = new Date(Date.now() + 60 * 1000);
      const notifId = `debug-visit::${pk}::${at.getTime()}`;
      await notifee.createTriggerNotification(
        {
          id: notifId,
          title: '🏥 回診測試通知（1 分鐘後）',
          body: `${r.ClinicDate}｜${r.ClinicPlace || ''}${r.Doctor ? `｜醫師：${r.Doctor}` : ''}${(r.Num ?? '') !== '' ? `｜號碼：${r.Num}` : ''}`,
          android: { channelId: 'appointments', smallIcon: 'ic_launcher', pressAction: { id: 'open-visit' } },
          data: { type: 'visit', visitId: String(pk), date: r.ClinicDate, place: String(r.ClinicPlace || ''), doctor: String(r.Doctor || ''), num: String(r.Num ?? '') },
        },
        { type: TriggerType.TIMESTAMP, timestamp: at.getTime(), alarmManager: true }
      );
      Alert.alert('已排程', '將在 1 分鐘後跳出這筆回診的測試通知。');
    } catch (e) { Alert.alert('排程失敗', '請確認通知權限與頻道設定。'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <FontAwesome name="arrow-left" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>回診清單</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRecords} tintColor={COLORS.textMid} />}
      >
        {records.length > 0 ? (
          records.map((r) => {
            const pk = getPk(r);
            return (
              <View key={getKey(r)} style={[styles.card, outerShadow]}>
                {/* Top row */}
                <View style={styles.cardRow}>
                  <Text style={styles.dateText}>{r.ClinicDate}</Text>
                  <View style={{ flexDirection: 'row' }}>
                    {pk != null && (
                      <TouchableOpacity style={styles.ghostBtn} onPress={() => confirmDelete(pk)}>
                        <Text style={styles.ghostBtnText}>刪除</Text>
                      </TouchableOpacity>
                    )}
                    {/* <TouchableOpacity style={[styles.ghostBtn, { marginLeft: 8 }]} onPress={() => scheduleTestNotification(r)}>
                      <Text style={styles.ghostBtnText}>測試通知</Text>
                    </TouchableOpacity> */}
                  </View>
                </View>

                {/* Info chips */}
                {Boolean(r.ClinicPlace) && (
                  <View style={styles.chip}><Text style={styles.chipLabel}>地點</Text><Text style={styles.chipText}>{r.ClinicPlace}</Text></View>
                )}
                {Boolean(r.Doctor) && (
                  <View style={styles.chip}><Text style={styles.chipLabel}>醫師</Text><Text style={styles.chipText}>{r.Doctor}</Text></View>
                )}
                <View style={styles.chip}><Text style={styles.chipLabel}>號碼</Text><Text style={styles.chipText}>{r.Num}</Text></View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyCard, outerShadow]}>
              <Text style={styles.emptyTitle}>暫無回診資料</Text>
              <Text style={styles.emptyDesc}>{hint || '點擊下方按鈕新增一筆回診資訊'}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, outerShadow]} onPress={goAddRecord} activeOpacity={0.85}>
        <FontAwesome name="plus" size={16} color={COLORS.cream} style={{ marginRight: 8 }} />
        <Text style={styles.fabText}>新增紀錄</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.black,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 14,
    paddingHorizontal: SPACING,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
  },

  card: { backgroundColor: COLORS.cream, width: '90%', padding: 16, borderRadius: R, marginBottom: 14 ,marginTop: 20},
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateText: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },

  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginTop: 8 },
  chipLabel: { fontSize: 12, color: COLORS.textMid, marginRight: 8 },
  chipText: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },

  emptyWrap: { width: '100%', alignItems: 'center', marginTop: 40 },
  emptyCard: { width: '85%', backgroundColor: COLORS.grayBox, padding: 20, borderRadius: R, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark },
  emptyDesc: { marginTop: 6, fontSize: 13, color: COLORS.textMid, textAlign: 'center' },

  fab: { position: 'absolute', bottom: 24, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, height: 54, borderRadius: 27, backgroundColor: COLORS.black },
  fabText: { fontSize: 16, fontWeight: '900', color: COLORS.cream },

  ghostBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.grayBox },
  ghostBtnText: { color: COLORS.textDark, fontWeight: '700', fontSize: 12 },
});