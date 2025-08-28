import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView,
  TextInput, Alert, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type AddHospitalRecordNavProp = StackNavigationProp<RootStackParamList, 'AddHospitalRecord'>;

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
  grayBox: '#F2F2F2',
  inputBorder: '#E5E5E5',
};

const R = 22;
const outerShadow = {
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
} as const;

const pad = (n: number) => n.toString().padStart(2, '0');
const fmtDate = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`; // MM/DD
const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;   // HH:MM

export default function AddHospitalRecord() {
  const navigation = useNavigation<AddHospitalRecordNavProp>();

  // 無預設值
  const [dateVal, setDateVal] = useState<Date | null>(null);
  const [timeVal, setTimeVal] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [doctor, setDoctor] = useState('');

  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const onSubmit = () => {
    if (!dateVal || !timeVal || !location.trim() || !doctor.trim()) {
      Alert.alert('請完成必填', '日期、時間、地點、醫師皆為必填。');
      return;
    }
    Alert.alert('已儲存', `時間：${fmtDate(dateVal)} ${fmtTime(timeVal)}\n地點：${location}\n醫師：${doctor}`);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* ===== HERO ===== */}
      <View style={[styles.hero, { backgroundColor: COLORS.black }, outerShadow]}>
        <View style={styles.heroRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backPlain} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.centerTitle} pointerEvents="none">
            <MaterialIcons name="event-note" size={32} color={COLORS.green} style={{ marginRight: 8 }} />
            <Text style={styles.titleBig}>看診紀錄</Text>
          </View>
        </View>
      </View>

      {/* ===== 表單（同款白卡風格） ===== */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* 日期＋時間（合併一張卡片） */}
        <View style={[styles.card, outerShadow]}>
          <View style={styles.cardLeftBar} />
          <View style={{ flex: 1 }}>
            <View style={styles.cardHead}>
              <MaterialIcons name="schedule" size={22} color={COLORS.textDark} />
              <Text style={styles.cardTitle}>時間</Text>
            </View>

            <View style={styles.rowTwo}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => setShowDate(true)} style={[styles.pickerField, { flex: 1 }]}>
                <Text style={[styles.pickerText, !dateVal && styles.placeholder]}>
                  {dateVal ? fmtDate(dateVal) : '選擇日期'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={22} color={COLORS.textMid} />
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.85} onPress={() => setShowTime(true)} style={[styles.pickerField, { flex: 1 }]}>
                <Text style={[styles.pickerText, !timeVal && styles.placeholder]}>
                  {timeVal ? fmtTime(timeVal) : '選擇時間'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={22} color={COLORS.textMid} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 地點 */}
        <View style={[styles.card, outerShadow]}>
          <View style={styles.cardLeftBar} />
          <View style={{ flex: 1 }}>
            <View style={styles.cardHead}>
              <MaterialIcons name="location-on" size={22} color={COLORS.textDark} />
              <Text style={styles.cardTitle}>地點</Text>
            </View>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="就診醫院 / 診所"
              placeholderTextColor="#9AA0A6"
            />
          </View>
        </View>

        {/* 醫師 */}
        <View style={[styles.card, outerShadow]}>
          <View style={styles.cardLeftBar} />
          <View style={{ flex: 1 }}>
            <View style={styles.cardHead}>
              <MaterialIcons name="person-outline" size={22} color={COLORS.textDark} />
              <Text style={styles.cardTitle}>醫師</Text>
            </View>
            <TextInput
              style={styles.input}
              value={doctor}
              onChangeText={setDoctor}
              placeholder="醫師姓名"
              placeholderTextColor="#9AA0A6"
            />
          </View>
        </View>
      </ScrollView>

      {/* ===== 原生 Date / Time Picker ===== */}
      {showDate && (
        <DateTimePicker
          value={dateVal ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, d) => { setShowDate(false); if (d) setDateVal(d); }}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={timeVal ?? new Date()}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, d) => { setShowTime(false); if (d) setTimeVal(d); }}
        />
      )}

      {/* ===== 底部主按鈕 ===== */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.bigBtn, { backgroundColor: COLORS.black }]} onPress={onSubmit}>
          <Feather name="check" size={18} color={COLORS.white} />
          <Text style={[styles.bigBtnText, { color: COLORS.white }]}>儲存</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { margin: 16, marginBottom: 8, paddingVertical: 16, paddingHorizontal: 16, borderRadius: R },
  heroRow: { height: 56, justifyContent: 'center', position: 'relative' },
  backPlain: { position: 'absolute', left: 8, top: '50%', transform: [{ translateY: -22 }], padding: 8, borderRadius: 10, zIndex: 2 },
  centerTitle: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  titleBig: { fontSize: 28, fontWeight: '900', color: COLORS.white, letterSpacing: 0.4 },

  card: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: R, backgroundColor: COLORS.white, flexDirection: 'row', gap: 12 },
  cardLeftBar: { width: 6, alignSelf: 'stretch', borderRadius: 4, backgroundColor: COLORS.green },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark },

  rowTwo: { flexDirection: 'row', gap: 10 },

  pickerField: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: { fontSize: 18, color: COLORS.textDark },
  placeholder: { color: '#9AA0A6' },

  input: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 18,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
  },

  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 18, paddingHorizontal: 16 },
  bigBtn: { height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  bigBtnText: { fontSize: 18, fontWeight: '900' },
});
