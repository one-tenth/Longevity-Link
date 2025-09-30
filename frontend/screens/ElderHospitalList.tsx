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
} from 'react-native';
import { useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { RootStackParamList } from '../App';

const BASE = 'http://172.20.10.7:8000';

type HospitalRecord = {
  HosId?: number;
  HosID?: number;
  id?: number;
  ClinicDate: string;
  ClinicPlace: string;
  Doctor: string;
  Num: number | string | null;
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
  elevation: 4 as const,
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

  // 優先 route 的 elderId → 退而求其次用 AsyncStorage
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

  // 取清單（唯讀）
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

      const data = Array.isArray(res.data) ? res.data : [];
      setRecords(data);
      if (data.length === 0) setHint('目前沒有回診資料');
    } catch (e) {
      console.log('取得看診紀錄失敗:', e);
      setRecords([]);
      setHint('資料暫時載入失敗，請稍後下拉重新整理');
    } finally {
      setLoading(false);
    }
  }, [elderId]);

  // 聚焦時拉資料
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

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header（沿用你的樣式） */}
      <View className="headerRow" style={styles.headerRow}>
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
            <Text style={styles.bannerSub}>
              共 {records.length} 筆
            </Text>
          </View>
        </View>

        <View style={styles.sideSlot} />
      </View>

      {/* Content（唯讀卡片清單，無新增/刪除/測試） */}
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={{ alignItems: 'center' }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRecords} />}
      >
        {records.length > 0 ? (
          records.map((r) => (
            <View key={getKey(r)} style={[styles.card, outerShadow]}>
              <View style={styles.cardRow}>
                <Text style={styles.time}>日期：{r.ClinicDate}</Text>
              </View>
              <Text style={styles.place}>地點：{r.ClinicPlace || '—'}</Text>
              <Text style={styles.doctor}>醫師：{r.Doctor || '—'}</Text>
              <Text style={styles.num}>號碼：{r.Num ?? '—'}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.hint}>{hint}</Text>
        )}
      </ScrollView>
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
  bannerSub: { marginTop: 4, fontSize: 13, fontWeight: '800', color: COLORS.black },

  card: {
    backgroundColor: COLORS.cream,
    width: '85%',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  place: { fontSize: 14, marginTop: 6, color: COLORS.textDark },
  doctor: { fontSize: 14, marginTop: 4, color: COLORS.textDark },
  num: { fontSize: 14, marginTop: 4, color: COLORS.textDark },

  hint: { textAlign: 'center', color: COLORS.textMid, marginTop: 24 },
});
