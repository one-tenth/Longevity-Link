// FamilyAddHospital.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, StatusBar
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';               // ★ 新增
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'; // ★ 新增
import { RootStackParamList } from '../App';

const BASE = 'http://192.108.1.106:8000';


const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
};

async function authPost<T>(url: string, data: any) {
  const access = await AsyncStorage.getItem('access');
  return axios.post<T>(`${BASE}${url}`, data, {
    headers: { Authorization: `Bearer ${access}` },
    timeout: 10000,
  });
}

export default function FamilyAddHospital() {
  const route = useRoute<any>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'FamilyAddHospital'>>();

  const elderIdParam: number | undefined = route?.params?.elderId;
  const [elderId, setElderId] = useState<number | null>(
    typeof elderIdParam === 'number' ? elderIdParam : null
  );

  const [clinicDate, setClinicDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [clinicPlace, setClinicPlace] = useState('');
  const [doctor, setDoctor] = useState('');
  const [num, setNum] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (elderId === null) {
        const savedIdStr = await AsyncStorage.getItem('elder_id');
        const savedId = savedIdStr ? Number(savedIdStr) : NaN;
        if (!Number.isNaN(savedId)) setElderId(savedId);
      }
    })();
  }, [elderId]);

  const handleAdd = async () => {
    setLoading(true);
    try {
      let effElderId: number | null =
        typeof route?.params?.elderId === 'number'
          ? route.params.elderId
          : elderId;

      if (effElderId == null || Number.isNaN(effElderId)) {
        const savedIdStr = await AsyncStorage.getItem('elder_id');
        const savedId = savedIdStr ? Number(savedIdStr) : NaN;
        if (!Number.isNaN(savedId)) effElderId = savedId;
      }
      if (effElderId == null || Number.isNaN(effElderId)) {
        Alert.alert('提醒', '尚未指定長者');
        return;
      }
      if (!clinicPlace.trim()) { Alert.alert('提醒', '請填寫地點'); return; }
      if (!doctor.trim()) { Alert.alert('提醒', '請填寫醫師'); return; }

      const dateStr = clinicDate.toISOString().split('T')[0];

      await authPost(`/api/hospital/create/?user_id=${effElderId}`, {
        ClinicDate: dateStr,
        ClinicPlace: clinicPlace.trim(),
        Doctor: doctor.trim(),
        Num: Number(num) || 0,
      });

      Alert.alert('成功', '儲存成功');
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.response?.data?.error || '儲存失敗';
      Alert.alert('錯誤', msg);
    } finally {
      setLoading(false);
    }
  };

  const dateLabel = clinicDate.toLocaleDateString();
  const hour = clinicDate.getHours().toString().padStart(2, '0');
  const minute = clinicDate.getMinutes().toString().padStart(2, '0');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={22} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>新增回診</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Cards */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FontAwesome5 name="calendar-alt" size={22} color={COLORS.black} />
          <Text style={[styles.cardTitle, { marginLeft: 8 }]}>時間</Text>
        </View>
        <View style={styles.timeRow}>
          <TouchableOpacity style={[styles.timeBox, styles.timeBoxWide]} onPress={() => setShowDate(true)}>
            <Text style={styles.timeText}>{dateLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.timeBox, { marginLeft: 8 }]} onPress={() => setShowTime(true)}>
            <Text style={styles.timeText}>{hour}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.timeBox, { marginLeft: 8 }]} onPress={() => setShowTime(true)}>
            <Text style={styles.timeText}>{minute}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FontAwesome5 name="map-marker-alt" size={22} color={COLORS.black} />
          <Text style={[styles.cardTitle, { marginLeft: 8 }]}>地點</Text>
        </View>
        <TextInput style={styles.input} placeholder="臺大醫院" value={clinicPlace} onChangeText={setClinicPlace} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FontAwesome5 name="stethoscope" size={22} color={COLORS.black} />
          <Text style={[styles.cardTitle, { marginLeft: 8 }]}>醫師</Text>
        </View>
        <TextInput style={styles.input} placeholder="XXX" value={doctor} onChangeText={setDoctor} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="format-list-numbered" size={22} color={COLORS.black} />
          <Text style={[styles.cardTitle, { marginLeft: 8 }]}>號碼</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="例如 25"
          keyboardType="numeric"
          value={num}
          onChangeText={setNum}
        />
      </View>

      {/* Button */}
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <TouchableOpacity style={styles.fab} onPress={handleAdd}>
          <FontAwesome5 name="plus" size={20} color={COLORS.cream} style={{ marginRight: 8 }} />
          <Text style={styles.fabText}>儲存</Text>
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.black },

  card: {
    width: '90%',
    backgroundColor: COLORS.cream,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    alignSelf: 'center',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: COLORS.black },

  timeRow: { flexDirection: 'row', marginTop: 6 },
  timeBox: {
    flex: 1,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBoxWide: { flex: 2 },
  timeText: { fontSize: 16, fontWeight: '900', color: COLORS.black },

  input: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 42,
    marginTop: 6,
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.black,
  },

  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    alignSelf: 'center',
    paddingHorizontal: 28,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.black,
  },
  fabText: { fontSize: 18, fontWeight: '900', color: COLORS.cream },
});