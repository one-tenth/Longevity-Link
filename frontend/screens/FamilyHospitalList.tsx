import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, Image
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

type HospitalRecord = {
  HosId: number;
  ClinicDate: string;
  ClinicPlace: string;
  Doctor: string;
  Num: number;
};

type RouteParams = { elderName?: string };

export default function FamilyHospitalList() {
  const [records, setRecords] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [elderName, setElderName] = useState<string>('');
  const [hint, setHint] = useState<string>(''); // 顯示非阻斷訊息
  const navigation = useNavigation();
  const route = useRoute();

  const loadElderName = useCallback(async () => {
    const fromParam = (route.params as RouteParams | undefined)?.elderName;
    if (fromParam) {
      setElderName(fromParam);
      await AsyncStorage.setItem('elder_name', fromParam);
      return;
    }
    const saved = await AsyncStorage.getItem('elder_name');
    if (saved) setElderName(saved);
  }, [route.params]);

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
      const res = await axios.get<HospitalRecord[]>(
        'http://192.168.0.19:8000/api/hospital/list/',
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      const data = res.data ?? [];
      setRecords(data);
      if (data.length === 0) {
        setHint('還沒有新增過看診資料');
      }
    } catch (err) {
      console.log('取得看診紀錄失敗:', err);
      setRecords([]);
      setHint('資料暫時載入失敗，請稍後下拉重新整理');
    } finally {
      setLoading(false);
    }
  }, []);

  // 回到此頁時：載入老人姓名 + 抓資料
  useFocusEffect(
    useCallback(() => {
      loadElderName();
      fetchRecords();
    }, [loadElderName, fetchRecords])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../img/childhome/image.png')} style={styles.avatar} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{elderName || '未指定'}</Text>
          </View>
          <Text style={styles.headerText}>看診紀錄</Text>
        </View>
      </View>

      {/* 提示（不阻斷） */}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {/* 列表 */}
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={{ alignItems: 'center' }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRecords} />}
      >
        {records.map((r) => (
          <View key={r.HosId} style={styles.card}>
            <Text style={styles.time}>日期：{r.ClinicDate}</Text>
            <Text style={styles.place}>地點：{r.ClinicPlace}</Text>
            <Text style={styles.doctor}>醫師：{r.Doctor}</Text>
            <Text style={styles.num}>號碼：{r.Num}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 按鈕 */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#4FC3F7' }]}
        onPress={() => navigation.navigate('FamilyAddHospital' as never)}
      >
        <Text style={styles.btnText}>新增紀錄</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#FF9800' }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.btnText}>回首頁</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 20, alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    paddingHorizontal: 15, width: '100%'
  },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#111' },
  badge: {
    alignSelf: 'flex-start', backgroundColor: '#EEE',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 2, borderColor: '#111', marginBottom: 2
  },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#111' },
  headerText: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  hint: { width: '85%', color: '#666', marginBottom: 6 },
  card: {
    backgroundColor: '#FFD54F', width: '85%', padding: 15, borderRadius: 12,
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3
  },
  time: { fontSize: 16, fontWeight: 'bold' },
  place: { fontSize: 14, marginTop: 4 },
  doctor: { fontSize: 14, marginTop: 4 },
  num: { fontSize: 14, marginTop: 4 },
  button: {
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8,
    marginTop: 10, width: '85%', alignItems: 'center'
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
