import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

type HospitalRecord = {
  HosId: number;
  ClinicDate: string;   // 後端是 DateField，前端收到會是字串
  ClinicPlace: string;
  Doctor: string;
  Num: number;
  // UserID?: number;   // 需要就加
};

export default function FamilyHospitalList() {
  const [records, setRecords] = useState<HospitalRecord[]>([]);
  const navigation = useNavigation();

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    const token = await AsyncStorage.getItem('access_token');
    const res = await axios.get<HospitalRecord[]>(
      'http://192.168.0.19:8000/api/hospital/list/',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setRecords(res.data ?? []);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>看診紀錄</Text>
      <ScrollView>
        {records.map((r) => (
          <View key={r.HosId} style={styles.card}>
            <Text style={styles.time}>{r.ClinicDate}</Text>
            <Text style={styles.place}>{r.ClinicPlace}</Text>
            <Text style={styles.doctor}>{r.Doctor}</Text>
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('FamilyAddHospital' as never)}>
        <Text style={styles.btnText}>新增記錄</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.btnText}>回首頁</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', paddingTop: 20 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  card: { backgroundColor: '#FFD54F', width: 300, padding: 15, borderRadius: 10, marginBottom: 10 },
  time: { fontSize: 16, fontWeight: 'bold' },
  place: { fontSize: 14, marginTop: 5 },
  doctor: { fontSize: 14, marginTop: 5 },
  addBtn: { backgroundColor: '#FF9800', padding: 10, borderRadius: 8, marginTop: 10 },
  backBtn: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 8, marginTop: 10 },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
