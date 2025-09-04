import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

const BASE = 'http://192.168.0.19:8000';

// 自動帶 token；401 refresh 後重試一次
async function authPost<T>(url: string, data: any) {
  let access = await AsyncStorage.getItem('access');
  try {
    return await axios.post<T>(`${BASE}${url}`, data, {
      headers: { Authorization: `Bearer ${access}` },
      timeout: 10000,
    });
  } catch (err: any) {
    if (err?.response?.status === 401) {
      const refresh = await AsyncStorage.getItem('refresh');
      if (!refresh) throw err;
      const r = await axios.post(`${BASE}/api/account/token/refresh/`, { refresh });
      access = r.data.access;
      await AsyncStorage.setItem('access', access!);
      return await axios.post<T>(`${BASE}${url}`, data, {
        headers: { Authorization: `Bearer ${access}` },
        timeout: 10000,
      });
    }
    throw err;
  }
}

export default function FamilyAddHospital() {
  const route = useRoute<any>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // 參數 + 狀態
  const elderIdParam: number | undefined = route?.params?.elderId;
  const elderNameParam: string | undefined = route?.params?.elderName;

  const [elderId, setElderId] = useState<number | null>(
    typeof elderIdParam === 'number' ? elderIdParam : null
  );
  const [displayName, setDisplayName] = useState<string>(elderNameParam ?? '');

  const [clinicDate, setClinicDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [clinicPlace, setClinicPlace] = useState('');
  const [doctor, setDoctor] = useState('');
  const [loading, setLoading] = useState(false);
  const [num, setNum] = useState('');

  // Fallback：只跑一次 + log + NaN 檢查
  useEffect(() => {
    (async () => {
      try {
        console.log('[Add] route.params =', JSON.stringify(route?.params ?? {}));

        if (!displayName) {
          const savedName = await AsyncStorage.getItem('elder_name');
          if (savedName) {
            setDisplayName(savedName);
            console.log('[Add] fallback elder_name =', savedName);
          } else {
            console.log('[Add] no elder_name in storage');
          }
        }

        if (elderId === null) {
          const savedIdStr = await AsyncStorage.getItem('elder_id');
          console.log('[Add] elder_id in storage =', savedIdStr);
          const savedId = savedIdStr ? Number(savedIdStr) : NaN;
          if (!Number.isNaN(savedId)) {
            setElderId(savedId);
            console.log('[Add] fallback elder_id =', savedId);
          } else {
            console.log('[Add] elder_id is NaN or missing');
          }
        } else {
          console.log('[Add] elderId from params =', elderId);
        }
      } catch (e) {
        console.log('[Add] fallback error', e);
      }
    })();
  }, []); // ⬅ 只跑一次

  const openDate = () => setShowDate(true);
  const openTime = () => setShowTime(true);

  const handleAdd = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        Alert.alert('錯誤', '尚未登入');
        return;
      }

      let effElderId: number | null =
        typeof route?.params?.elderId === 'number' ? route.params.elderId :
        (elderId !== null ? elderId : null);

      if (effElderId === null) {
        const savedIdStr = await AsyncStorage.getItem('elder_id');
        const savedId = savedIdStr ? Number(savedIdStr) : NaN;
        if (!Number.isNaN(savedId)) effElderId = savedId;
      }

      console.log('[Add] effElderId=', effElderId, 'state elderId=', elderId, 'route=', route?.params);

      if (effElderId === null || Number.isNaN(effElderId)) {
        Alert.alert('提醒', '尚未指定要寫入的長者，將帶您回去選擇', [
          { text: '好', onPress: () => navigation.navigate('FamilyScreen', { mode: 'select' }) }
        ]);
        return;
      }

      if (!clinicPlace.trim()) {
        Alert.alert('提醒', '請填寫地點');
        return;
      }
      if (!doctor.trim()) {
        Alert.alert('提醒', '請填寫醫師');
        return;
      }

      const dateStr = clinicDate.toISOString().split('T')[0];

      // ✅ 改成用 query 的 user_id，且不要在 body 放 elder_id
      await authPost(`/api/hospital/create/?user_id=${effElderId}`, {
        ClinicDate: dateStr,                 // YYYY-MM-DD
        ClinicPlace: clinicPlace.trim(),
        Doctor: doctor.trim(),
        Num: Number(num) || 0
      });

      Alert.alert('成功', '新增成功');
      navigation.goBack();
    } catch (e: any) {
      console.log('status=', e?.response?.status);
      console.log('data=', e?.response?.data);
      const msg = e?.response?.data?.error || e?.response?.data?.detail || '新增失敗，請稍後再試';
      Alert.alert('錯誤', msg);
    } finally {
      setLoading(false);
    }
  };

  const dateLabel = clinicDate.toLocaleDateString();
  const hour = clinicDate.getHours().toString().padStart(2, '0');
  const minute = clinicDate.getMinutes().toString().padStart(2, '0');

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.brand}>CareMate</Text>
      </View>

      <View style={styles.titleRow}>
        <Image source={require('../img/childhome/image.png')} style={styles.avatar} />
        <View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{displayName || '未指定'}</Text>
          </View>
          <Text style={styles.title}>看診紀錄</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}><Text style={styles.cardTitle}>時間</Text></View>
        <View style={styles.timeRow}>
          <TouchableOpacity style={[styles.timeBox, styles.timeBoxWide]} onPress={openDate}>
            <Text style={styles.timeText}>{dateLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.timeBox} onPress={openTime}>
            <Text style={styles.timeText}>{hour}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.timeBox} onPress={openTime}>
            <Text style={styles.timeText}>{minute}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={require('../img/hospital/hospital.png')} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>地點</Text>
        </View>
        <TextInput style={styles.input} placeholder="臺大醫院" value={clinicPlace} onChangeText={setClinicPlace} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={require('../img/hospital/doctor.png')} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>醫師</Text>
        </View>
        <TextInput style={styles.input} placeholder="XXX" value={doctor} onChangeText={setDoctor} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={require('../img/hospital/doctor.png')} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>號碼</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="例如 25"
          keyboardType="numeric"
          value={num}
          onChangeText={setNum}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <>
          <TouchableOpacity style={[styles.btn, styles.btnBlue]} onPress={handleAdd}>
            <Text style={styles.btnText}>新增</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnOrange]} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>回首頁</Text>
          </TouchableOpacity>
        </>
      )}

      {showDate && (
        <DateTimePicker
          value={clinicDate}
          mode="date"
          onChange={(e, sel) => {
            setShowDate(false);
            if (sel) {
              const d = new Date(clinicDate);
              d.setFullYear(sel.getFullYear(), sel.getMonth(), sel.getDate());
              setClinicDate(d);
            }
          }}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={clinicDate}
          mode="time"
          onChange={(e, sel) => {
            setShowTime(false);
            if (sel) {
              const d = new Date(clinicDate);
              d.setHours(sel.getHours(), sel.getMinutes());
              setClinicDate(d);
            }
          }}
        />
      )}
    </View>
  );
}

const black = '#111';
const yellow = '#FFC928';
const blue = '#7EC8FF';
const orange = '#FFA948';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 8 },
  topbar: {
    height: 40, backgroundColor: '#E7F7FF', borderRadius: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, borderWidth: 2, borderColor: black, marginBottom: 8
  },
  brand: { fontSize: 18, fontWeight: 'bold', color: black },

  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 56, height: 56, borderRadius: 8, borderWidth: 2, borderColor: black, marginRight: 10 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#DDD', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: black, marginBottom: 2 },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: black },
  title: { fontSize: 20, fontWeight: 'bold', color: black },

  card: {
    width: '100%', backgroundColor: yellow, borderRadius: 10,
    borderWidth: 3, borderColor: black, padding: 10, marginTop: 10
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardIcon: { width: 22, height: 22, marginRight: 6, resizeMode: 'contain' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: black },

  timeRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  timeBox: {
    flex: 1, height: 36, backgroundColor: '#fff',
    borderWidth: 2, borderColor: black, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center'
  },
  timeBoxWide: { flex: 2 },
  timeText: { fontSize: 14, color: black },

  input: {
    backgroundColor: '#fff', borderWidth: 2, borderColor: black,
    borderRadius: 6, paddingHorizontal: 10, height: 36, marginTop: 6
  },

  btn: {
    width: '100%', height: 40, borderRadius: 10, borderWidth: 3, borderColor: black,
    alignItems: 'center', justifyContent: 'center', marginTop: 12
  },
  btnBlue: { backgroundColor: blue },
  btnOrange: { backgroundColor: orange },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
