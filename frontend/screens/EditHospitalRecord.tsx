import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, TextInput, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type AddHospitalRecordNavProp = StackNavigationProp<RootStackParamList, 'AddHospitalRecord'>;

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
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

export default function AddHospitalRecord() {
  const navigation = useNavigation<AddHospitalRecordNavProp>();
  const route = useRoute<any>(); // 這裡用 any 避免型別衝突；若你在 RootStackParamList 有定義可改成正確型別

  // 從 params 取值（可能為 undefined）
  const { recordId, time: paramTime, hospital: paramHospital, doctor: paramDoctor, mode } = route.params || {};

  // 判斷是否為編輯模式
  const isEdit = useMemo(() => mode === 'edit' || recordId !== undefined, [mode, recordId]);

  // 簡單從 "早上 08:00" 之類的字串抓出 "08:00"
  const extractedTime = useMemo(() => {
    if (typeof paramTime === 'string') {
      const m = paramTime.match(/(\d{1,2}:\d{2})/);
      return m ? m[1] : undefined;
    }
    return undefined;
  }, [paramTime]);

  // 狀態
  const [dateText, setDateText] = useState('05/25');     // 你原本就沒有帶日期，保留預設
  const [timeText, setTimeText] = useState(extractedTime || '09:30');
  const [location, setLocation] = useState(paramHospital || '臺大醫院');
  const [doctor, setDoctor] = useState(paramDoctor ?? ''); // 可留空

  // 如果從上一頁帶了參數，初次載入時預填
  useEffect(() => {
    if (paramHospital) setLocation(paramHospital);
    if (paramDoctor !== undefined) setDoctor(paramDoctor);
    if (extractedTime) setTimeText(extractedTime);
    // dateText 目前沒有來源，保留預設
  }, [paramHospital, paramDoctor, extractedTime]);

  const onSubmit = () => {
    // 這裡可改成呼叫 API（新增/更新），目前先用 Alert 示意
    const verb = isEdit ? '已更新' : '已新增';
    Alert.alert(verb, `時間：${dateText} ${timeText}\n地點：${location}${doctor ? `\n醫師：${doctor}` : ''}`);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* ===== HERO（黑色抬頭） ===== */}
      <View style={[styles.hero, { backgroundColor: COLORS.black }, outerShadow]}>
        <View style={styles.heroRow}>
          {/* 返回 */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>

          {/* 中央標題（icon + 文字置中、放大） */}
          <View style={styles.centerTitle} pointerEvents="none">
            <MaterialIcons name="event-note" size={32} color={COLORS.green} style={{ marginRight: 8 }} />
            <Text style={styles.titleBig}>{isEdit ? '編輯看診紀錄' : '新增看診紀錄'}</Text>
          </View>
        </View>
      </View>

      {/* ===== 表單卡片 ===== */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* 時間 */}
        <View style={[styles.card, outerShadow]}>
          <View style={styles.cardLeftBar} />
          <View style={{ flex: 1 }}>
            <View style={styles.cardHead}>
              <MaterialIcons name="access-time" size={22} color={COLORS.textDark} />
              <Text style={styles.cardTitle}>時間</Text>
            </View>
            <View style={styles.rowInput}>
              <TextInput
                style={[styles.input, styles.inputCenter]}
                value={dateText}
                onChangeText={setDateText}
                placeholder="MM/DD"
                placeholderTextColor="#9AA0A6"
              />
              <TextInput
                style={[styles.input, styles.inputCenter]}
                value={timeText}
                onChangeText={setTimeText}
                placeholder="HH:MM"
                placeholderTextColor="#9AA0A6"
              />
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

        {/* 醫師（可選） */}
        <View style={[styles.card, outerShadow]}>
          <View style={styles.cardLeftBar} />
          <View style={{ flex: 1 }}>
            <View style={styles.cardHead}>
              <MaterialIcons name="person-outline" size={22} color={COLORS.textDark} />
              <Text style={styles.cardTitle}>醫師（可選）</Text>
            </View>
            <TextInput
              style={styles.input}
              value={doctor}
              onChangeText={setDoctor}
              placeholder="醫師姓名（可不填）"
              placeholderTextColor="#9AA0A6"
            />
          </View>
        </View>
      </ScrollView>

      {/* ===== 底部主按鈕 ===== */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.bigBtn, { backgroundColor: COLORS.black }]} onPress={onSubmit}>
          <Feather name="check" size={18} color={COLORS.white} />
          <Text style={[styles.bigBtnText, { color: COLORS.white }]}>{isEdit ? '更新' : '儲存'}</Text>
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
    padding: 16,
    borderRadius: R,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardLeftBar: { width: 6, alignSelf: 'stretch', borderRadius: 4, backgroundColor: COLORS.green },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },

  cardTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark },

  rowInput: { flexDirection: 'row', gap: 10 },

  input: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 18,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
    flex: 1,
  },
  inputCenter: { textAlign: 'center' },

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
