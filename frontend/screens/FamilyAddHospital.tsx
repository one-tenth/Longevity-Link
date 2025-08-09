// screens/FamilyAddHospital.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function FamilyAddHospital() {
  const [clinicDate, setClinicDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [clinicPlace, setClinicPlace] = useState('');
  const [doctor, setDoctor] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const openDate = () => setShowDate(true);
  const openTime = () => setShowTime(true);

  const handleAdd = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) { Alert.alert('錯誤', '尚未登入'); return; }

      const d = clinicDate;
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');

      await axios.post(
        'http://192.168.0.19:8000/api/hospital/create/',
        {
          ClinicDate: `${dateStr} ${hh}:${mm}`,
          ClinicPlace: clinicPlace,
          Doctor: doctor,
          Num: 0
        },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
      );

      Alert.alert('成功', '新增成功');
      navigation.goBack(); // 列表頁用 useFocusEffect 會自動刷新
    } catch (e) {
      console.error(e);
      Alert.alert('錯誤', '新增失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 顯示用
  const dateLabel = clinicDate.toLocaleDateString();
  const hour = clinicDate.getHours().toString().padStart(2, '0');
  const minute = clinicDate.getMinutes().toString().padStart(2, '0');

  return (
    <View style={styles.container}>
      {/* 頂部 Header */}
      <View style={styles.topbar}>
        <Text style={styles.brand}>CareMate</Text>
      </View>

      {/* 標題列：頭像＋文字 */}
      <View style={styles.titleRow}>
        <Image source={require('../img/childhome/image.png')} style={styles.avatar} />
        <View>
          <View style={styles.badge}><Text style={styles.badgeText}>爺爺</Text></View>
          <Text style={styles.title}>看診紀錄</Text>
        </View>
      </View>

      {/* 時間卡片 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>時間</Text>
        </View>

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

      {/* 地點卡片 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={require('../img/hospital/hospital.png')} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>地點</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="臺大醫院"
          
          value={clinicPlace}
          onChangeText={setClinicPlace}
        />
      </View>

      {/* 醫師卡片 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={require('../img/hospital/doctor.png')} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>醫師</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="XXX"
          value={doctor}
          onChangeText={setDoctor}
        />
      </View>

      {/* 底部按鈕 */}
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

      {/* Date/Time Pickers */}
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
const pale = '#FFF7E6';
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
  topIcon: { width: 20, height: 20, resizeMode: 'contain' },

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
