// screens/HealthStatus.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Pressable, ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type NavProp = StackNavigationProp<RootStackParamList, 'ChildHome'>;

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
  grayBox: '#F2F2F2',
  primary: '#111111',
  pillBg: '#EFEFEF',
  pillActive: '#111111',
  pillText: '#222222',
  pillTextActive: '#FFFFFF',
};

const R = 22;
const outerShadow = {
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
} as const;


const BASE = 'http://192.168.1.106:8000';


type Period = 'morning' | 'evening';

type BpItem = {
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  captured_at?: string | null;
} | null;

type BpResponse = {
  date: string;
  morning: BpItem;
  evening: BpItem;
};

function formatDateYYYYMMDD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function HealthStatus() {
  const navigation = useNavigation<NavProp>();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const [steps, setSteps] = useState<number | null>(null);
  const [bp, setBp] = useState<BpResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [bpLoading, setBpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ 目前顯示的時段（預設依時間自動判斷）
  const initialPeriod: Period = useMemo(() => {
    const hr = new Date().getHours();
    return hr < 12 ? 'morning' : 'evening';
  }, []);
  const [period, setPeriod] = useState<Period>(initialPeriod);

  const fetchAll = async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('access');
      const selected = await AsyncStorage.getItem('selectedMember');
      if (!token || !selected) {
        setSteps(null);
        setBp(null);
        setError('尚未選擇成員或未登入');
        setLoading(false);
        return;
      }
      const member = JSON.parse(selected);
      const dateStr = formatDateYYYYMMDD(date);

      // 讀步數（可選）
      try {
        const stepRes = await axios.get(`${BASE}/api/fitdata/by-date/`, {
          params: { date: dateStr, user_id: member.UserID },
          headers: { Authorization: `Bearer ${token}` },
        });
        setSteps(stepRes.data?.steps ?? null);
      } catch {
        setSteps(null);
      }

      // 讀血壓（早/晚兩筆）
      setBpLoading(true);
      try {
        const bpRes = await axios.get<BpResponse>(`${BASE}/api/healthcare/by-date/`, {
          params: { date: dateStr, user_id: member.UserID },
          headers: { Authorization: `Bearer ${token}` },
        });
        setBp(bpRes.data);
      } catch (e: any) {
        setBp(null);
      } finally {
        setBpLoading(false);
      }
    } catch (e: any) {
      setError('資料讀取失敗');
      setSteps(null);
      setBp(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekday = selectedDate.toLocaleDateString('zh-TW', { weekday: 'short' });

  // 目前所選時段的顯示資料
  const currentItem: BpItem = bp ? bp[period] : null;
  const currentValue = currentItem
    ? `${currentItem.systolic ?? '-'} / ${currentItem.diastolic ?? '-'}`
    : '—';
  const currentPulse = currentItem
    ? `${currentItem.pulse ?? '-'}`
    : '—';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ChildHome' as never)}
          style={styles.backFab}
        >
          <FontAwesome name="arrow-left" size={20} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <MaterialCommunityIcons
            name="heart-pulse"
            size={24}
            color={COLORS.black}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.headerTitle}>健康狀態</Text>
        </View>
      </View>

      {/* 日期卡片 */}
      <Pressable
        onPress={() => setShowPicker(true)}
        android_ripple={{ color: '#00000010' }}
        style={({ pressed }) => [styles.dateCard, outerShadow, pressed && { transform: [{ scale: 0.995 }] }]}
      >
        <View style={styles.dateIconWrap}>
          <FontAwesome name="calendar" size={20} color={COLORS.black} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dateMain}>
            {formatDateYYYYMMDD(selectedDate)}（{weekday}）
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
            setShowPicker(false);
            if (date) {
              setSelectedDate(date);
              fetchAll(date); // 換日即重查
            }
          }}
        />
      )}

      {/* 早/晚 切換 Pills */}
      <View style={styles.pillsRow}>
        <PeriodPill
          label="早上"
          active={period === 'morning'}
          onPress={() => setPeriod('morning')}
          icon={<MaterialIcons name="wb-sunny" size={18} color={period === 'morning' ? COLORS.pillTextActive : COLORS.pillText} />}
        />
        <PeriodPill
          label="晚上"
          active={period === 'evening'}
          onPress={() => setPeriod('evening')}
          icon={<MaterialCommunityIcons name="weather-night" size={18} color={period === 'evening' ? COLORS.pillTextActive : COLORS.pillText} />}
        />
      </View>

      {/* 單一卡片：內容依時段切換 */}
      <FeatureCard
        bg={COLORS.white}
        title={`血壓（${period === 'morning' ? '早上' : '晚上'}）`}
        subtitle={
          currentItem
            ? `收縮/舒張：${currentValue} · 脈搏：${currentPulse} bpm`
            : '查無此時段紀錄'
        }
        right={<MaterialIcons name="monitor-heart" size={28} color={COLORS.black} />}
        onPress={() => {}}
        darkText
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
            <MiniBox title="狀態" value={currentItem ? '有紀錄' : '無'} />
          </View>
        )}
      </FeatureCard>

      {/* 步數卡（保留） */}
      <FeatureCard
        bg={COLORS.white}
        title="步數詳細"
        subtitle={steps !== null ? `${steps} 步` : '查無紀錄'}
        right={<MaterialCommunityIcons name="walk" size={28} color={COLORS.black} />}
        onPress={() => {}}
        darkText
        withShadow
      />

      {/* 全頁錯誤提示（可選） */}
      {error ? (
        <View style={{ marginTop: 12, alignItems: 'center' }}>
          <Text style={{ color: 'crimson' }}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ====== 子元件 ====== */
function PeriodPill({
  label, active, onPress, icon,
}: { label: string; active: boolean; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#00000010' }}
      style={[
        pill.base,
        active ? pill.active : pill.inactive,
      ]}
    >
      {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
      <Text style={[pill.text, active ? pill.textActive : pill.textInactive]}>{label}</Text>
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
        feature.card,
        { backgroundColor: bg },
        withShadow && outerShadow,
        pressed && { transform: [{ scale: 0.995 }] },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[feature.title, { color: darkText ? COLORS.textDark : COLORS.white }]}>{title}</Text>
        {!!subtitle && <Text style={[feature.sub, { color: darkText ? COLORS.textMid : COLORS.white }]}>{subtitle}</Text>}
        {children}
      </View>
      {right}
    </Pressable>
  );
}

/* ====== Styles ====== */
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
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.grayBox,
    alignItems: 'center', justifyContent: 'center',
  },
  dateMain: { fontSize: 18, fontWeight: '900', color: COLORS.textDark },
  dateSub: { fontSize: 12, fontWeight: '700', color: COLORS.textMid, marginTop: 2 },

  pillsRow: {
    marginHorizontal: 16,
    marginTop: 6,
    flexDirection: 'row',
    gap: 10,
  },
});

const pill = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  inactive: {
    backgroundColor: COLORS.pillBg,
  },
  active: {
    backgroundColor: COLORS.pillActive,
  },
  text: { fontSize: 14, fontWeight: '800' },
  textInactive: { color: COLORS.pillText },
  textActive: { color: COLORS.pillTextActive },
});

const mini = StyleSheet.create({
  row: { marginTop: 12, flexDirection: 'row', gap: 10 },
  box: {
    flex: 1,
    backgroundColor: COLORS.grayBox,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  title: { fontSize: 12, fontWeight: '700', color: COLORS.textMid },
  value: { fontSize: 18, fontWeight: '900', color: COLORS.black, textAlign: 'center' },
  suffix: { fontSize: 12, fontWeight: '700', color: COLORS.black },
});

const feature = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: R,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '900' },
  sub: { marginTop: 2, fontSize: 14 },
});
