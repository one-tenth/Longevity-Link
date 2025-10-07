// screens/ElderlyHealth.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import GoogleFit, { Scopes } from 'react-native-google-fit';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { PermissionsAndroid } from 'react-native';

type ElderlyHealthNavProp = StackNavigationProp<RootStackParamList, 'ElderlyHealth'>;





const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#87adffff',
  lightred: '#006d21ff',
  gray: '#E9E9E9',
};

const R = 22;
const outerShadow = {
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
} as const;

const BASE_URL = 'http://192.168.0.24:8000';

type PeriodKey = 'morning' | 'evening';

type BpRecord = {
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  captured_at?: string | null;
} | null;

type BpAll = {
  morning: BpRecord;
  evening: BpRecord;
};

function formatDateYYYYMMDD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ElderlyHealth() {
  const navigation = useNavigation<ElderlyHealthNavProp>();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [bpAll, setBpAll] = useState<BpAll>({ morning: null, evening: null });
  const [loading, setLoading] = useState(false);
  const [bpLoading, setBpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialPeriod: PeriodKey = useMemo(() => {
    const hr = new Date().getHours();
    return hr < 12 ? 'morning' : 'evening';
  }, []);
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod);

  const bpData = useMemo(() => bpAll[period] ?? null, [bpAll, period]);
  const currentValue = bpData ? `${bpData.systolic ?? '-'} / ${bpData.diastolic ?? '-'}` : '—';
  const currentPulse = bpData ? `${bpData.pulse ?? '-'}` : '—';

  const requestActivityPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 29) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: '需要活動辨識權限',
          message: '我們需要讀取您的步數資料來顯示健康資訊。',
          buttonPositive: '同意',
          buttonNegative: '拒絕',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const uploadStepsToBackend = async (steps: number, dateStr: string) => {
    const token = await AsyncStorage.getItem('access');
    if (!token) return;
    try {
      const payload = { steps, date: dateStr };
      await axios.post(`${BASE_URL}/api/fitdata/`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('❌ 步數上傳失敗：', err);
    }
  };

  const fetchBloodPressureAll = async (date: Date) => {
    const token = await AsyncStorage.getItem('access');
    if (!token) return;
    const dateStr = formatDateYYYYMMDD(date);
    setBpLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/healthcare/by-date/`, {
        params: { date: dateStr },
        headers: { Authorization: `Bearer ${token}` },
      });
      setBpAll({
        morning: response.data.morning ?? null,
        evening: response.data.evening ?? null,
      });
      setError('');
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setBpAll({ morning: null, evening: null });
        setError('');
      } else {
        setError('查詢血壓時發生錯誤');
      }
    } finally {
      setBpLoading(false);
    }
  };

  const fetchSteps = async (date: Date) => {
    setLoading(true);
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    try {
      const result = await GoogleFit.authorize({ scopes: [Scopes.FITNESS_ACTIVITY_READ] });
      if (result.success) {
        const stepsData = await GoogleFit.getDailyStepCountSamples(options);
        const fitData = stepsData.find(r => r.source === 'com.google.android.gms:estimated_steps');
        const fallbackDateStr = formatDateYYYYMMDD(startDate);
        if (fitData && Array.isArray(fitData.steps)) {
          const s = fitData.steps.find(x => x.date === fallbackDateStr);
          const stepValue = s ? s.value : 0;
          setTodaySteps(stepValue);
          uploadStepsToBackend(stepValue, s?.date || fallbackDateStr);
        } else {
          setTodaySteps(0);
          uploadStepsToBackend(0, fallbackDateStr);
        }
        await fetchBloodPressureAll(date);
      } else {
        setError('Google Fit 授權失敗');
      }
    } catch (err) {
      setError('取得步數錯誤');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestActivityPermission().then(granted => {
      if (granted) fetchSteps(selectedDate);
      else setError('未授權活動辨識權限');
    });
  }, [selectedDate]);

  const onPickDate = (date: Date) => {
    setSelectedDate(date);
    setShowPicker(false);
    fetchSteps(date);
  };

  const onChangePeriod = (p: PeriodKey) => {
    setPeriod(p);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ElderHome' as never)}
          style={styles.backFab}
        >
          <MaterialIcons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons
            name="heart-pulse"
            size={24}
            color={COLORS.black}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.headerTitle}>健康狀況</Text>
        </View>
      </View>

      <Pressable
        onPress={() => setShowPicker(true)}
        android_ripple={{ color: '#00000010' }}
        style={[styles.dateCard, outerShadow]}
      >
        <View style={styles.dateIconWrap}>
          <MaterialIcons name="calendar-today" size={20} color={COLORS.black} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dateMain}>
            {formatDateYYYYMMDD(selectedDate)}（{selectedDate.toLocaleDateString('zh-TW', { weekday: 'short' })})
          </Text>
          <Text style={styles.dateSub}>點我更改日期</Text>
        </View>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            if (date) onPickDate(date);
          }}
        />
      )}

      <View style={styles.pillsRow}>
        <PeriodPill
          label="早上"
          active={period === 'morning'}
          onPress={() => onChangePeriod('morning')}
          icon={<MaterialIcons name="wb-sunny" size={18} color={period === 'morning' ? COLORS.white : COLORS.textDark} />}
        />
        <PeriodPill
          label="晚上"
          active={period === 'evening'}
          onPress={() => onChangePeriod('evening')}
          icon={<MaterialCommunityIcons name="weather-night" size={18} color={period === 'evening' ? COLORS.white : COLORS.textDark} />}
        />
      </View>

      <FeatureCard
        bg={COLORS.lightred}
        title={`血壓（${period === 'morning' ? '早上' : '晚上'}）`}
        subtitle={
          bpData
            ? `收縮/舒張：${currentValue} · 脈搏：${currentPulse} bpm`
            : '查無此時段紀錄'
        }
        right={<MaterialIcons name="monitor-heart" size={28} color={COLORS.white} />}
        onPress={() => {}}
        withShadow
      >
        {bpLoading ? (
          <View style={{ paddingVertical: 8, alignItems: 'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 6, color: COLORS.textMid }}>載入中…</Text>
          </View>
        ) : (
          <View style={mini.row}>
            <MiniBox title="血壓" value={currentValue} />
            <MiniBox title="脈搏" value={currentPulse} suffix="bpm" />
            <MiniBox title="狀態" value={bpData ? '有紀錄' : '無'} />
          </View>
        )}
      </FeatureCard>

      <FeatureCard
        bg={COLORS.cream}
        title="今日步數"
        subtitle={todaySteps !== null ? `${todaySteps} 步` : '查無紀錄'}
        right={<MaterialCommunityIcons name="walk" size={28} color={COLORS.black} />}
        onPress={() => {}}
        darkText
        withShadow
      />

      {error ? (
        <View style={{ marginTop: 12, alignItems: 'center' }}>
          <Text style={{ color: 'crimson' }}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PeriodPill({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#00000010' }}
      style={[
        styles.pillBase,
        active ? styles.pillActive : styles.pillInactive,
      ]}
    >
      {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
      <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>{label}</Text>
    </Pressable>
  );
}

function MiniBox({ title, value, suffix }: { title: string; value: string; suffix?: string }) {
  return (
    <View style={mini.box}>
      <Text style={mini.title}>{title}</Text>
      <Text style={mini.value}>
        {value}{suffix ? <Text style={mini.suffix}> {suffix}</Text> : null}
      </Text>
    </View>
  );
}

function FeatureCard({
  bg, title, subtitle, right, onPress, darkText = false, withShadow = false, children,
}: {
  bg: string; title: string; subtitle?: string; right?: React.ReactNode; onPress: () => void;
  darkText?: boolean; withShadow?: boolean; children?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#00000010' }}
      style={({ pressed }) => [
        styles.featureCard,
        { backgroundColor: bg },
        withShadow && outerShadow,
        pressed && { transform: [{ scale: 0.995 }] },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.featureTitle, { color: darkText ? COLORS.textDark : COLORS.white }]}>{title}</Text>
        {!!subtitle && <Text style={[styles.featureSub, { color: darkText ? COLORS.textMid : COLORS.white }]}>{subtitle}</Text>}
        {children}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    height: 56,
    justifyContent: 'center',
  },
  backFab: {
    position: 'absolute',
    left: 0,
    top: 6,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.black },

  dateCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMain: { fontSize: 18, fontWeight: '900', color: COLORS.textDark },
  dateSub: { fontSize: 12, fontWeight: '700', color: COLORS.textMid, marginTop: 2 },

  pillsRow: {
    marginHorizontal: 16,
    marginTop: 6,
    flexDirection: 'row',
    gap: 10,
  },
  pillBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillInactive: {
    backgroundColor: COLORS.white,
  },
  pillActive: {
    backgroundColor: COLORS.green,
  },
  pillText: { fontSize: 14, fontWeight: '800' },
  pillTextInactive: { color: COLORS.textDark },
  pillTextActive: { color: COLORS.white },

  featureCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: R,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureTitle: { fontSize: 18, fontWeight: '900' },
  featureSub: { marginTop: 2, fontSize: 14 },
});

const mini = StyleSheet.create({
  row: { marginTop: 12, flexDirection: 'row', gap: 10 },
  box: {
    flex: 1,
    backgroundColor: COLORS.gray,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  title: { fontSize: 12, fontWeight: '700', color: COLORS.textMid },
  value: { fontSize: 18, fontWeight: '900', color: COLORS.black, textAlign: 'center' },
  suffix: { fontSize: 12, fontWeight: '700', color: COLORS.black },
});