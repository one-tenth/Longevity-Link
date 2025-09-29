// ElderMedRemind.tsx
import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../App';

// ===== Route / Nav Types =====
type MedicineReminderNavProp = StackNavigationProp<RootStackParamList, 'MedRemind'>;
type MedicineReminderRouteProp = RouteProp<RootStackParamList, 'MedRemind'>;

type RouteParams = {
  period?: string;
  meds?: string[] | string;
  time?: string;
};

// ===== Theme (沿用 ChildHome 風格) =====
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

const lightShadow = {
  elevation: 2,
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
} as const;

// ===== Helpers =====
function formatTime(t?: string) {
  if (!t) return '';
  // 08:00:00 -> 08:00
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function toMedList(meds?: string[] | string) {
  if (!meds) return [];
  if (Array.isArray(meds)) return meds.filter(Boolean).map(s => String(s).trim());
  return meds.split(',').map(s => s.trim()).filter(Boolean);
}

export default function ElderMedRemind() {
  const navigation = useNavigation<MedicineReminderNavProp>();
  const route = useRoute<MedicineReminderRouteProp>();
  const { period, meds, time } = (route.params || {}) as RouteParams;

  const medList = useMemo(() => toMedList(meds), [meds]);
  const displayPeriod = period || '目前時段';
  const displayTime = time ? `用藥時間：${formatTime(time)}` : '尚未設定時間';

  const onDelay = () => {
    Alert.alert('已延遲', '稍後再提醒您服藥。');
  };

  const onCancel = () => {
    Alert.alert('已取消', '本次提醒已取消。');
  };

  const onStart = () => {
    navigation.navigate('ElderHome');
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* ===== Title / Hero Bar ===== */}
      <View style={[styles.hero, { backgroundColor: COLORS.black }, outerShadow]}>
        <View style={styles.heroRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Feather name="chevron-left" size={26} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>用藥提醒</Text>
          <View style={styles.iconBtn} />
        </View>
      </View>

      {/* ===== Content ===== */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {/* 卡片 */}
        <View style={[styles.card, lightShadow]}>
          {/* 時段 + 時間列 */}
          <View style={styles.row}>
            <MaterialIcons name="schedule" size={26} color={COLORS.textDark} />
            <Text style={styles.timeText} numberOfLines={1} ellipsizeMode="tail">
              {displayPeriod}｜{displayTime}
            </Text>
          </View>

          {/* 藥物清單 */}
          <View style={{ marginTop: 8, width: '100%' }}>
            {medList.length > 0 ? (
              medList.map((med, i) => (
                <View style={styles.row} key={`${med}-${i}`}>
                  <MaterialCommunityIcons name="pill" size={24} color={COLORS.textDark} />
                  <Text style={styles.itemText}>{med}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.itemText, { opacity: 0.7, marginTop: 6 }]}>無藥物資料</Text>
            )}
          </View>

          {/* 操作按鈕列 */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.cream }]} onPress={onDelay}>
              <Text style={styles.btnText}>延遲</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.grayBox }]} onPress={onCancel}>
              <Text style={styles.btnText}>取消</Text>
            </TouchableOpacity>
          </View>

          {/* 主按鈕 */}
          <TouchableOpacity style={styles.mainBtn} onPress={onStart}>
            <MaterialIcons name="check-circle" size={22} color={COLORS.black} />
            <Text style={styles.mainBtnText}>開始服藥</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/* ===== Styles ===== */
const styles = StyleSheet.create({
  hero: { margin: 16, marginBottom: 8, padding: 16, borderRadius: R },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { color: COLORS.white, fontSize: 20, fontWeight: '900' },
  iconBtn: { padding: 8, borderRadius: 12 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  timeText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark,
  },

  itemText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },

  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },

  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00000010',
  },

  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textDark,
  },

  mainBtn: {
    marginTop: 8,
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...outerShadow,
  },

  mainBtnText: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.black,
  },
});
