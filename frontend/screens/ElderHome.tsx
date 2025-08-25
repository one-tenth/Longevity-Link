import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../App';

type ElderHomeNavProp = StackNavigationProp<RootStackParamList, 'ElderHome'>;

const BASE = 'http://192.168.0.19:8000';

type HospitalRecord = {
  HosId?: number;
  HosID?: number;
  id?: number;
  ClinicDate: string;      // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  ClinicPlace: string;
  Doctor: string;
  Num: number;
};

export default function ElderHome() {
  const navigation = useNavigation<ElderHomeNavProp>();

  const [loading, setLoading] = useState(false);
  const [reminder, setReminder] = useState<HospitalRecord | null>(null);
  const [hint, setHint] = useState<string>('');

  // ===== 回首頁：同層 -> 父層 -> reset =====
  const goHome = () => {
    // 1) 同層嘗試
    // @ts-ignore
    navigation.navigate('index');

    // 2) 父層嘗試（若這頁在巢狀 navigator 裡）
    // @ts-ignore
    const parent = navigation.getParent?.();
    if (parent) {
      // @ts-ignore
      parent.navigate('index');
      return;
    }

    // 3) 最後保底：重設堆疊
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'index' as never }],
      })
    );
  };

  const onlyDate = (s?: string) => {
    if (!s) return '';
    return s.includes('T') ? s.split('T')[0] : s;
  };
  const parseDate = (s?: string) => new Date(onlyDate(String(s || '')));
  const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // 取「未來最近的一筆」，若沒有未來則退回最近過去的一筆
  const pickUpcomingNearest = (list: HospitalRecord[]) => {
    const today = normalize(new Date());
    const items = list
      .map(r => ({ d: parseDate(r.ClinicDate), r }))
      .filter(x => !isNaN(+x.d))
      .sort((a, b) => +a.d - +b.d);

    const upcoming = items.find(x => normalize(x.d).getTime() >= +today);
    if (upcoming) return upcoming.r;
    if (items.length) return items[items.length - 1].r;
    return null;
  };

  const loadReminder = useCallback(async () => {
    try {
      setLoading(true);
      setHint('');
      setReminder(null);

      const token = await AsyncStorage.getItem('access');
      if (!token) { setHint('尚未登入'); return; }

      const elderIdStr = await AsyncStorage.getItem('elder_id');
      const elderId = elderIdStr ? Number(elderIdStr) : NaN;
      if (!elderIdStr || Number.isNaN(elderId)) { setHint('尚未指定長者'); return; }

      const res = await axios.get<HospitalRecord[]>(
        `${BASE}/api/hospital/list/?user_id=${elderId}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );

      const nearest = pickUpcomingNearest(res.data ?? []);
      if (!nearest) { setHint('尚無看診資料'); return; }
      setReminder(nearest);
    } catch (e: any) {
      console.log('載入看診提醒失敗:', e?.response?.status, e?.response?.data);
      setHint('載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminder();
    const unsub = navigation.addListener('focus', loadReminder);
    return unsub;
  }, [navigation, loadReminder]);

  const displayDate = (iso?: string) => {
    const d = onlyDate(iso);
    const [y, m, dd] = d.split('-');
    if (!y || !m || !dd) return d || '—';
    return `${y}/${m}/${dd}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* 左上角按下回首頁 */}
        <TouchableOpacity
          onPress={goHome}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="回首頁"
        >
          <Image source={require('../img/elderlyhome/home.png')} style={styles.settingIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/elderlyhome/logo.png')} style={styles.logo} />
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 藥物提醒（先保留靜態） */}
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

          <View style={styles.row}>
            <Image source={require('../img/elderlyhome/clock.png')} style={styles.icon} />
            <Text style={styles.boxText}>
              {loading ? '載入中…' : reminder ? displayDate(reminder.ClinicDate) : (hint || '—')}
            </Text>
          </View>

          <View style={styles.row}>
            <Image source={require('../img/elderlyhome/location.png')} style={styles.icon} />
            <Text style={styles.boxText}>{reminder?.ClinicPlace || (loading ? '' : '—')}</Text>
          </View>

          <View style={styles.row}>
            <Image source={require('../img/elderlyhome/doctor.png')} style={styles.icon} />
            <Text style={styles.boxText}>{reminder?.Doctor || (loading ? '' : '—')}</Text>
          </View>
        </View>

        {/* 下方按鈕 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.buttonGreen}
            onPress={() => navigation.navigate('ElderlyUpload')}
          >
            <Image source={require('../img/elderlyhome/add-photo.png')} style={styles.icon} />
            <Text style={styles.buttonText}>拍照上傳</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonOrange}
            onPress={() => navigation.navigate('ElderlyHealth')}
          >
            <Image source={require('../img/elderlyhome/health-check.png')} style={styles.icon} />
            <Text style={styles.buttonText}>健康狀況</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/* 原樣式 — 未更動 */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCFEED' },
  scrollContent: { alignItems: 'center', paddingBottom: 30 },
  header: {
    width: '100%', height: 70, flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#65B6E4', position: 'relative', marginBottom: 20, paddingLeft: 10, paddingRight: 10
  },
  title: { fontSize: 50, fontWeight: '900', color: '#000' },
  logo: { width: 60, height: 60, marginTop: 15 },
  settingIcon: { width: 40, height: 40, marginTop: 15 },
  boxGreen: {
    width: '90%', backgroundColor: '#549D77', borderRadius: 10, padding: 16,
    marginBottom: 16, borderWidth: 3, borderColor: 'black'
  },
  boxYellow: {
    width: '90%', backgroundColor: '#F4C80B', borderRadius: 10, padding: 16,
    marginBottom: 16, borderWidth: 3, borderColor: 'black'
  },
  boxTitle: { fontSize: 30, fontWeight: '900', marginBottom: 12, color: 'black' },
  boxText: { fontSize: 30, fontWeight: '900', color: 'black' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { width: 62, height: 62, textAlign: 'center', marginTop: 2 },
  buttonRow: { width: '90%', flexDirection: 'row', justifyContent: 'space-between' },
  buttonGreen: {
    flex: 1, backgroundColor: '#7ac3a3', paddingVertical: 16, borderRadius: 10,
    marginRight: 8, borderWidth: 3, borderColor: 'black', alignItems: 'center'
  },
  buttonOrange: {
    flex: 1, backgroundColor: '#F58402', paddingVertical: 16, borderRadius: 10,
    marginLeft: 8, borderWidth: 3, borderColor: 'black', alignItems: 'center'
  },
  buttonText: { marginTop: 6, fontSize: 22, fontWeight: '900', color: 'white' },
});
