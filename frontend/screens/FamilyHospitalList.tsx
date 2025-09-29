// FamilyHospitalList.tsx
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
import FontAwesome from 'react-native-vector-icons/FontAwesome'; // ★ 修正：補上 import
import { RootStackParamList } from '../App';

const BASE = 'http://192.168.0.24:8000';

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

export default function FamilyHospitalList({ route }: { route: HospitalListRoute }) {
  const navigation = useNavigation<HospitalListNav>();

  const [records, setRecords] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [elderId, setElderId] = useState<number | null>(null);
  const [hint, setHint] = useState<string>('');

  // 讀 elderId（優先 route → 再 AsyncStorage）
  const loadElderInfo = useCallback(async () => {
    if (typeof route.params?.elderId === 'number' && !Number.isNaN(route.params.elderId)) {
      setElderId(route.params.elderId);
      await AsyncStorage.setItem('elder_id', String(route.params.elderId));
    } else {
      const savedId = await AsyncStorage.getItem('elder_id');
      const n = savedId ? Number(savedId) : NaN;
      setElderId(!Number.isNaN(n) ? n : null);
    }
  }, [route.params]);

  // 取清單
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setHint('');
    try {
      const token = await AsyncStorage.getItem('access');
      let id = elderId;
      if (id == null || Number.isNaN(id)) {
        const saved = await AsyncStorage.getItem('elder_id');
        id = saved ? Number(saved) : NaN;
      }

      if (!token) {
        setHint('尚未登入，無法載入資料');
        setRecords([]);
        return;
      }
      if (id == null || Number.isNaN(id)) {
        setHint('尚未指定長者');
        setRecords([]);
        return;
      }

      const url = `${BASE}/api/hospital/list/?user_id=${id}`;
      const res = await axios.get<HospitalRecord[]>(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const data = res.data ?? [];
      setRecords(data);
      if (data.length === 0) setHint('還沒有新增過看診資料');
    } catch (e) {
      console.log('取得看診紀錄失敗:', e);
      setRecords([]);
      setHint('資料暫時載入失敗，請稍後下拉重新整理');
    } finally {
      setLoading(false);
    }
  }, [elderId]);

  // 畫面聚焦→同步 elderId 並拉資料
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
      { text: '刪除', style: 'destructive', onPress: () => handleDelete(pk) },
    ]);
  };

  const handleDelete = async (pk: number) => {
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        Alert.alert('錯誤', '尚未登入');
        return;
      }

      let id = elderId;
      if (id == null || Number.isNaN(id)) {
        const saved = await AsyncStorage.getItem('elder_id');
        id = saved ? Number(saved) : NaN;
      }
      if (id == null || Number.isNaN(id)) {
        Alert.alert('錯誤', '未指定長者');
        return;
      }

      await axios.delete(`${BASE}/api/hospital/${pk}/?user_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      setRecords(prev => {
        const next = prev.filter(r => getPk(r) !== pk);
        if (next.length === 0) setHint('還沒有新增過看診資料');
        return next;
      });
    } catch (e: any) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.error ||
        (status >= 500 ? '伺服器錯誤，請稍後再試' : '刪除失敗');
      console.log('刪除失敗:', status, e?.response?.data);
      Alert.alert('刪除失敗', msg);
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
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchRecords} />
        }
      >
        {records.length > 0 ? (
          records.map((r) => {
            const pk = getPk(r);
            return (
              <View key={getKey(r)} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.time}>日期：{r.ClinicDate}</Text>
                  {pk != null && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => confirmDelete(pk)}
                    >
                      <Text style={styles.deleteText}>刪除</Text>
                    </TouchableOpacity>
                  )}
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
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('FamilyAddHospital' as never)}
      >
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
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E53935',
    borderRadius: 6,
  },
  deleteText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});
