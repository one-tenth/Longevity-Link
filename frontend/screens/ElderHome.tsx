import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios'; // ✅ 需要
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ 需要
import { RootStackParamList } from '../App';

type ElderHomeNavProp = StackNavigationProp<RootStackParamList, 'ElderHome'>;

const BASE = 'http://192.168.0.19:8000';

type HospitalRecord = {
  HosId?: number;
  HosID?: number;
  id?: number;
  ClinicDate: string;     // 'YYYY-MM-DD'
  ClinicPlace: string;
  Doctor: string;
  Num: number;
};

export default function ElderHome() {
  const navigation = useNavigation<ElderHomeNavProp>();

  const [loading, setLoading] = useState(false);
  const [nextHos, setNextHos] = useState<HospitalRecord | null>(null);
  const [hint, setHint] = useState<string>('');

  const fetchNextHospital = useCallback(async () => {
    setLoading(true);
    setHint('');
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        setHint('尚未登入');
        setNextHos(null);
        return;
      }

      // ✅ 變更點：若有 elder_id（家人模式選過長者），帶上 user_id；否則讓後端用 request.user 決定
      const elderIdStr = await AsyncStorage.getItem('elder_id');
      const elderId = elderIdStr ? Number(elderIdStr) : NaN;
      const url = Number.isFinite(elderId)
        ? `${BASE}/api/hospital/list/?user_id=${elderId}`
        : `${BASE}/api/hospital/list/`;

      const res = await axios.get<HospitalRecord[]>(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });

      const list = (res.data ?? []).slice();

      if (list.length === 0) {
        setNextHos(null);
        setHint('暫無看診資料');
        return;
      }

      // 取「最近將來」的一筆；若沒有未來的，就取「最近過去」的一筆
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

      const upcoming = list
        .filter(x => (x.ClinicDate || '') >= todayStr)
        .sort((a, b) => a.ClinicDate.localeCompare(b.ClinicDate))[0];

      if (upcoming) {
        setNextHos(upcoming);
      } else {
        const latestPast = list
          .filter(x => (x.ClinicDate || '') < todayStr)
          .sort((a, b) => b.ClinicDate.localeCompare(a.ClinicDate))[0];
        setNextHos(latestPast ?? null);
      }
    } catch (e: any) {
      // ✅ 變更點：把真正錯誤打出來＋顯示後端訊息
      const status = e?.response?.status;
      const data = e?.response?.data;
      console.log('載入看診提醒失敗:', status, data, e?.message);
      setNextHos(null);
      setHint(data?.error || `載入失敗（${status ?? e?.code ?? '網路錯誤'}）`);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchNextHospital(); }, [fetchNextHospital]));

  const dateText = nextHos?.ClinicDate
    ? new Date(nextHos.ClinicDate + 'T00:00:00').toLocaleDateString()
    : '—';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Image source={require('../img/elderlyhome/home.png')} style={styles.settingIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/elderlyhome/logo.png')} style={styles.logo} />
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 藥物提醒（維持靜態示意） */}
        <View style={styles.boxGreen}>
          <Text style={styles.boxTitle}>吃藥提醒</Text>
          <View style={styles.row}>
            <Image source={require('../img/elderlyhome/clock.png')} style={styles.icon} />
            <Text style={styles.boxText}>早上8:00</Text>
          </View>
          <View style={styles.row}>
            <Image source={require('../img/elderlyhome/health.png')} style={styles.icon} />
            <Text style={styles.boxText}>保健品</Text>
          </View>
        </View>

        {/* 看診提醒（動態） */}
        <View style={styles.boxYellow}>
          <Text style={styles.boxTitle}>看診提醒</Text>

          {loading ? (
            <ActivityIndicator size="large" style={{ marginTop: 6 }} />
          ) : nextHos ? (
            <>
              <View style={styles.row}>
                <Image source={require('../img/elderlyhome/clock.png')} style={styles.icon} />
                <Text style={styles.boxText}>{dateText}</Text>
              </View>
              <View style={styles.row}>
                <Image source={require('../img/elderlyhome/location.png')} style={styles.icon} />
                <Text style={styles.boxText}>{nextHos.ClinicPlace || '—'}</Text>
              </View>
              <View style={styles.row}>
                <Image source={require('../img/elderlyhome/doctor.png')} style={styles.icon} />
                <Text style={styles.boxText}>
                  {nextHos.Doctor || '—'}{typeof nextHos.Num === 'number' ? `（號碼 ${nextHos.Num}）` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={{ marginTop: 6 }}
                onPress={() => navigation.navigate('FamilyHospitalList' as never)}
              >
                <Text style={{ fontSize: 18, fontWeight: '900', textDecorationLine: 'underline', color: '#000' }}>
                  查看全部回診資料
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.boxText, { marginTop: 6 }]}>{hint || '暫無看診資料'}</Text>
          )}
        </View>

        {/* 下方按鈕 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.buttonGreen}
            onPress={() => navigation.navigate('ElderlyUpload' as never)}
          >
            <Image source={require('../img/elderlyhome/add-photo.png')} style={styles.icon} />
            <Text style={styles.buttonText}>拍照上傳</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonOrange}
            onPress={() => navigation.navigate('ElderlyHealth' as never)}
          >
            <Image source={require('../img/elderlyhome/health-check.png')} style={styles.icon} />
            <Text style={styles.buttonText}>健康狀況</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // 🔸 全部沿用你的樣式（完全沒動）
  container: { flex: 1, backgroundColor: '#FCFEED' },
  scrollContent: { alignItems: 'center', paddingBottom: 30 },
  header: { width: '100%', height: 70, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#65B6E4', position: 'relative', marginBottom: 20, paddingLeft: 10, paddingRight: 10 },
  title: { fontSize: 50, fontWeight: '900', color: '#000' },
  logo: { width: 60, height: 60, marginTop: 15 },
  settingIcon: { width: 40, height: 40, marginTop: 15 },
  boxGreen: { width: '90%', backgroundColor: '#549D77', borderRadius: 10, padding: 16, marginBottom: 16, borderWidth: 3, borderColor: 'black' },
  boxYellow: { width: '90%', backgroundColor: '#F4C80B', borderRadius: 10, padding: 16, marginBottom: 16, borderWidth: 3, borderColor: 'black' },
  boxTitle: { fontSize: 30, fontWeight: '900', marginBottom: 12, color: 'black' },
  boxText: { fontSize: 30, fontWeight: '900', color: 'black' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { width: 62, height: 62, textAlign: 'center', marginTop: 2 },
  buttonRow: { width: '90%', flexDirection: 'row', justifyContent: 'space-between' },
  buttonGreen: { flex: 1, backgroundColor: '#7ac3a3', paddingVertical: 16, borderRadius: 10, marginRight: 8, borderWidth: 3, borderColor: 'black', alignItems: 'center' },
  buttonOrange: { flex: 1, backgroundColor: '#F58402', paddingVertical: 16, borderRadius: 10, marginLeft: 8, borderWidth: 3, borderColor: 'black', alignItems: 'center' },
  buttonText: { marginTop: 6, fontSize: 22, fontWeight: '900', color: 'white' },
});
