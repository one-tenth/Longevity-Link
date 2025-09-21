import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, Image, Alert, ViewStyle, TextStyle, ImageStyle
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'http://192.168.1.106:8000';

type HospitalRecord = {
  HosId?: number;   // 兼容不同命名
  HosID?: number;
  id?: number;
  ClinicDate: string;
  ClinicPlace: string;
  Doctor: string;
  Num: number;
};

type RouteParams = { elderName?: string; elderId?: number };
type HospitalListNav = StackNavigationProp<RootStackParamList, 'FamilyHospitalList'>;

export default function FamilyHospitalList() {
  const [records, setRecords] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [elderName, setElderName] = useState<string>('');
  const [elderId, setElderId] = useState<number | null>(null);
  const [hint, setHint] = useState<string>('');

  const navigation = useNavigation<HospitalListNav>();
  const route = useRoute();

  const loadElderInfo = useCallback(async () => {
    const p = (route.params as RouteParams | undefined);
    const nameFromParams = p?.elderName;
    const nameFromStore  = await AsyncStorage.getItem('elder_name');
    const name = (nameFromParams && nameFromParams.trim()) ? nameFromParams : (nameFromStore || '');
    setElderName(name);
    if ((nameFromParams && nameFromParams.trim())) {
      await AsyncStorage.setItem('elder_name', nameFromParams);
    }

    if (typeof p?.elderId === 'number' && !Number.isNaN(p.elderId)) {
      setElderId(p.elderId);
      await AsyncStorage.setItem('elder_id', String(p.elderId));
    } else {
      const savedId = await AsyncStorage.getItem('elder_id');
      const n = savedId ? Number(savedId) : NaN;
      setElderId(!Number.isNaN(n) ? n : null);
    }
  }, [route.params]);

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
        timeout: 10000
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

  useFocusEffect(useCallback(() => { loadElderInfo(); fetchRecords(); }, [loadElderInfo, fetchRecords]));

  const goToAdd = async () => {
    let id = elderId;
    if (id == null || Number.isNaN(id)) {
      const saved = await AsyncStorage.getItem('elder_id');
      id = saved ? Number(saved) : NaN;
    }
    const name = elderName || (await AsyncStorage.getItem('elder_name')) || '';

    if (id == null || Number.isNaN(id)) {
      Alert.alert('提醒', '請先選擇長者', [
        { text: '去選擇', onPress: () => navigation.navigate('FamilyScreen', { mode: 'select' } as never) },
        { text: '取消' }
      ]);
      return;
    }

    navigation.navigate('FamilyAddHospital', { elderId: id, elderName: name });
  };

  const getPk = (r: HospitalRecord) => r.HosId ?? r.HosID ?? r.id;
  const getKey = (r: HospitalRecord) => String(getPk(r) ?? Math.random());

  // ⛔️ 刪除（含確認框）
  const confirmDelete = (pk?: number) => {
    if (pk == null) return; // 僅防呆
    Alert.alert('確認刪除', '確定要刪除這筆看診紀錄嗎？', [
      { text: '取消' },
      { text: '刪除', style: 'destructive', onPress: () => handleDelete(pk) }
    ]);
  };

  const handleDelete = async (pk: number) => {
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) { Alert.alert('錯誤', '尚未登入'); return; }

      // 取得當前 elderId（後端需要 user_id 來識別目標老人）
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
        timeout: 10000
      });

      setRecords(prev => {
        const next = prev.filter(r => getPk(r) !== pk);
        if (next.length === 0) setHint('還沒有新增過看診資料');
        return next;
      });
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error || (status >= 500 ? '伺服器錯誤，請稍後再試' : '刪除失敗');
      console.log('刪除失敗:', status, e?.response?.data);
      Alert.alert('刪除失敗', msg);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../img/childhome/image.png')} style={styles.avatar} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={styles.badge}><Text style={styles.badgeText}>{elderName || '未指定'}</Text></View>
          <Text style={styles.headerText}>看診紀錄</Text>
        </View>
      </View>

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={{ alignItems: 'center' }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRecords} />}
      >
        {records.map((r) => {
          const pk = getPk(r);
          return (
            <View key={getKey(r)} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.time}>日期：{r.ClinicDate}</Text>
                {pk != null && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(pk)}>
                    <Text style={styles.deleteText}>刪除</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.place}>地點：{r.ClinicPlace}</Text>
              <Text style={styles.doctor}>醫師：{r.Doctor}</Text>
              <Text style={styles.num}>號碼：{r.Num}</Text>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={[styles.button, { backgroundColor: '#4FC3F7' }]} onPress={goToAdd}>
        <Text style={styles.btnText}>新增紀錄</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { backgroundColor: '#FF9800' }]} onPress={() => navigation.goBack()}>
        <Text style={styles.btnText}>回首頁</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create<{
  container: ViewStyle;
  header: ViewStyle;
  avatar: ImageStyle;
  badge: ViewStyle;
  badgeText: TextStyle;
  headerText: TextStyle;
  hint: TextStyle;
  card: ViewStyle;
  cardRow: ViewStyle;
  time: TextStyle;
  place: TextStyle;
  doctor: TextStyle;
  num: TextStyle;
  button: ViewStyle;
  btnText: TextStyle;
  deleteBtn: ViewStyle;
  deleteText: TextStyle;
}>({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 20, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 15, width: '100%' },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#111' },
  badge: { alignSelf: 'flex-start', backgroundColor: '#EEE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: '#111', marginBottom: 2 },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#111' },
  headerText: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  hint: { width: '85%', color: '#666', marginBottom: 6 },
  card: { backgroundColor: '#FFD54F', width: '85%', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 3 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 16, fontWeight: 'bold' },
  place: { fontSize: 14, marginTop: 4 },
  doctor: { fontSize: 14, marginTop: 4 },
  num: { fontSize: 14, marginTop: 4 },
  button: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginTop: 10, width: '85%', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#E53935', borderRadius: 6, borderWidth: 2, borderColor: '#111' },
  deleteText: { color: '#fff', fontWeight: 'bold', fontSize: 12 }
});
