import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type HospitalRecordNavProp = StackNavigationProp<RootStackParamList, 'HospitalRecord'>;

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

export default function HospitalRecord() {
  const navigation = useNavigation<HospitalRecordNavProp>();

  // 用 state 管理，刪除才能即時更新
  const [records, setRecords] = useState([
    { id: 1, time: '早上 08:00', hospital: '臺大醫院', doctor: '王大明' },
    { id: 2, time: '下午 15:30', hospital: '榮總內科', doctor: '王大明' },
  ]);

  const handleEdit = (r: { id: number; time: string; hospital: string; doctor: string }) => {
    navigation.navigate(
      'EditHospitalRecord',
      {
        recordId: r.id,
        time: r.time,
        hospital: r.hospital,
        doctor: r.doctor,
        mode: 'edit',
      } as any
    );
  };

  const handleDelete = (id: number) => {
    setRecords(prev => prev.filter(x => x.id !== id));
  };

  // ✅ 新增 -> 走 AddHospitalRecord（有日曆/鬧鐘那一頁）
  const handleCreate = () => {
    navigation.navigate('AddHospitalRecord' as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* ===== HERO（黑色抬頭） ===== */}
      <View style={[styles.hero, { backgroundColor: COLORS.black }, outerShadow]}>
        <View style={styles.heroRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ChildHome_1' as never)}
            style={styles.backPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.centerTitle} pointerEvents="none">
            <MaterialIcons name="event-note" size={32} color={COLORS.green} style={{ marginRight: 8 }} />
            <Text style={styles.titleBig}>看診紀錄</Text>
          </View>
        </View>
      </View>

      {/* ===== 清單 ===== */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {records.map((r) => (
          <View key={r.id} style={[styles.card, outerShadow]}>
            <View style={styles.cardLeftBar} />
            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <MaterialIcons name="access-time" size={24} color={COLORS.textDark} />
                <Text style={styles.cardTextLg}>{r.time}</Text>
              </View>
              <View style={styles.row}>
                <MaterialIcons name="local-hospital" size={24} color={COLORS.textDark} />
                <Text style={styles.cardTextLg}>{r.hospital}</Text>
              </View>
              <View style={styles.row}>
                <MaterialIcons name="person-outline" size={24} color={COLORS.textDark} />
                <Text style={styles.cardTextLg}>{r.doctor}</Text>
              </View>
            </View>

            {/* 操作區 */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionIcon} onPress={() => handleEdit(r)} activeOpacity={0.8}>
                <Feather name="edit-3" size={18} color={COLORS.black} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIcon} onPress={() => handleDelete(r.id)} activeOpacity={0.8}>
                <Feather name="trash-2" size={18} color={COLORS.black} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ===== 底部「新增」 ===== */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.bigBtn, { backgroundColor: COLORS.black }]} onPress={handleCreate} activeOpacity={0.9}>
          <Feather name="plus" size={18} color={COLORS.white} />
          <Text style={[styles.bigBtnText, { color: COLORS.white }]}>新增紀錄</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ===== Styles ===== */
const styles = StyleSheet.create({
  hero: { margin: 16, marginBottom: 8, paddingVertical: 16, paddingHorizontal: 16, borderRadius: R },
  heroRow: { height: 56, justifyContent: 'center', position: 'relative' },

  backPlain: {
    position: 'absolute',
    left: 8,
    top: '50%',
    transform: [{ translateY: -22 }],
    padding: 8,
    borderRadius: 10,
    zIndex: 2,
  },

  centerTitle: {
    position: 'absolute',
    left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBig: { fontSize: 28, fontWeight: '900', color: COLORS.white, letterSpacing: 0.4 },

  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: R,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardLeftBar: {
    width: 6,
    alignSelf: 'stretch',
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },

  cardTextLg: { fontSize: 22, fontWeight: '900', color: COLORS.textDark },

  actions: { justifyContent: 'center', alignItems: 'flex-end', gap: 12 },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.grayBox,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 18,
    paddingHorizontal: 16,
  },
  bigBtn: {
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  bigBtnText: { fontSize: 18, fontWeight: '900' },
});
