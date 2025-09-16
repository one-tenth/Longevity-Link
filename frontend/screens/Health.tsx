import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Pressable } from 'react-native';
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
};

const R = 22;
const outerShadow = {
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
} as const;

// 改成你原本使用的後端 IP
const BASE = 'http://192.168.0.24:8000';

export default function HealthStatus() {
  const navigation = useNavigation<NavProp>();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [steps, setSteps] = useState<number | null>(null);
  const [bpData, setBpData] = useState<{ systolic: number; diastolic: number; pulse: number } | null>(null);

  const fetchData = async (date: Date) => {
    try {
      const token = await AsyncStorage.getItem('access');
      const selected = await AsyncStorage.getItem('selectedMember');
      if (!token || !selected) {
        setSteps(null);
        setBpData(null);
        return;
      }
      const member = JSON.parse(selected);
      const dateStr = date.toLocaleDateString('sv-SE'); // YYYY-MM-DD

      try {
        const stepRes = await axios.get(
          `${BASE}/api/fitdata/by-date/?date=${dateStr}&user_id=${member.UserID}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSteps(stepRes.data?.steps ?? null);
      } catch {
        setSteps(null);
      }

      try {
        const bpRes = await axios.get(
          `${BASE}/api/healthcare/by-date/?date=${dateStr}&user_id=${member.UserID}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setBpData({
          systolic: bpRes.data?.systolic,
          diastolic: bpRes.data?.diastolic,
          pulse: bpRes.data?.pulse,
        });
      } catch {
        setBpData(null);
      }
    } catch {
      setSteps(null);
      setBpData(null);
    }
  };

  useEffect(() => { fetchData(selectedDate); }, []); // 初次載入

  const bpValue = bpData ? `${bpData.systolic ?? '-'} / ${bpData.diastolic ?? '-'}` : '—';
  const pulseValue = bpData ? `${bpData.pulse ?? '-'}` : '—';
  const weekday = selectedDate.toLocaleDateString('zh-TW', { weekday: 'short' });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        {/* ← 保留你自己的返回鍵（feature/ip_family_frontend） */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ChildHome' as never)}
          style={styles.backFab}
        >
          <FontAwesome name="arrow-left" size={20} color={COLORS.black} />
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
            {selectedDate.toLocaleDateString('sv-SE')}（{weekday}）
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
            if (date) { setSelectedDate(date); fetchData(date); }
          }}
        />
      )}

      <FeatureCard
        bg={COLORS.white}
        title="血壓詳細"
        subtitle={bpData ? `收縮/舒張：${bpValue} · 脈搏：${pulseValue} bpm` : '查無紀錄'}
        right={<MaterialIcons name="monitor-heart" size={28} color={COLORS.black} />}
        onPress={() => {}}
        darkText
        withShadow
      >
        <View style={mini.row}>
          <MiniBox title="步數" value={steps !== null ? `${steps}` : '—'} />
          <MiniBox title="血壓" value={bpValue} />
          <MiniBox title="脈搏" value={pulseValue} suffix="bpm" />
          <MiniBox title="狀態" value={bpData ? '有紀錄' : '無'} />
        </View>
      </FeatureCard>

      <FeatureCard
        bg={COLORS.white}
        title="步數詳細"
        subtitle={steps !== null ? `${steps} 步` : '查無紀錄'}
        right={<MaterialCommunityIcons name="walk" size={28} color={COLORS.black} />}
        onPress={() => {}}
        darkText
        withShadow
      />
    </View>
  );
}

/* ====== 子元件 ====== */
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
    backgroundColor: COLORS.green,
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
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: R, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: '900' },
  sub: { marginTop: 2, fontSize: 14 },
});
