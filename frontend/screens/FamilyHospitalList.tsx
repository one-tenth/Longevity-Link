import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

type HospitalRecord = {
  HosId: number;
  ClinicDate: string;
  ClinicPlace: string;
  Doctor: string;
  Num: number;
};

export default function FamilyHospitalList() {
  const [records, setRecords] = useState<HospitalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        Alert.alert('錯誤', '尚未登入');
        return;
      }
      const res = await axios.get<HospitalRecord[]>(
        'http://192.168.0.19:8000/api/hospital/list/',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecords(res.data ?? []);
    } catch (err) {
      console.error('取得看診紀錄失敗:', err);
      Alert.alert('錯誤', '無法取得看診紀錄');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRecords(); }, []));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../img/childhome/image.png')} // 你的老人頭像圖片
          style={styles.avatar}
        />
        <Text style={styles.headerText}>看診紀錄</Text>
      </View>

      {/* 列表 */}
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={{ alignItems: 'center' }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchRecords} />
        }
      >
        {records.length === 0 ? (
          <Text style={{ marginTop: 20 }}>目前沒有紀錄</Text>
        ) : (
          records.map((r) => (
            <View key={r.HosId} style={styles.card}>
              <Text style={styles.time}>日期：{r.ClinicDate}</Text>
              <Text style={styles.place}>地點：{r.ClinicPlace}</Text>
              <Text style={styles.doctor}>醫師：{r.Doctor}</Text>
              <Text style={styles.num}>號碼：{r.Num}</Text>
            </View>
          ))
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 15,
    justifyContent: 'space-between',
    width: '100%'
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  headerText: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  icon: { width: 40, height: 40 },
  card: {
    backgroundColor: '#FFD54F',
    width: '85%',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3
  },
  time: { fontSize: 16, fontWeight: 'bold' },
  place: { fontSize: 14, marginTop: 4 },
  doctor: { fontSize: 14, marginTop: 4 },
  num: { fontSize: 14, marginTop: 4 },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    width: '85%',
    alignItems: 'center'
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
