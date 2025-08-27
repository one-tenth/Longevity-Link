import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

type TimeItem = { label: string; time: string; };

const COLORS = {
  screenBg: '#B7D77C',   // 外層綠
  phoneBg: '#FFFFB9',    
  black: '#111111',
  white: '#FFFFFF',
  card: '#0E0E0E',
  rail: '#7FB57B',
  textLight: '#D9D9D9',
};

const STEP = 110;                // 卡片垂直間距
const RAIL_LEFT = 16;            // 直線左距
const RAIL_WIDTH = 4;            // 直線寬（偶數較佳）
const DOT_SIZE = 12;             // 圓點直徑
const DOT_TOP_START = 18;        // 第一顆圓點的頂部位移

// 卡片與綠線的水平距離
const CARD_LEFT = 56;

const outerShadow = {
  elevation: 8,
  shadowColor: '#000',
  shadowOpacity: 0.10,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
} as const;

export default function TimeSettingInput() {
  const [times, setTimes] = useState<TimeItem[]>([
    { label: '早上', time: '08:00' },
    { label: '中午', time: '12:00' },
    { label: '晚上', time: '18:00' },
    { label: '睡前', time: '20:00' },
  ]);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => { loadTimeSetting(); }, []);

  const loadTimeSetting = async () => {
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) return;
      const { data } = await axios.get('http://172.20.10.26:8000/api/get-med-time/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTimes([
        { label: '早上', time: data.MorningTime || '08:00' },
        { label: '中午', time: data.NoonTime || '12:00' },
        { label: '晚上', time: data.EveningTime || '18:00' },
        { label: '睡前', time: data.Bedtime || '20:00' },
      ]);
    } catch {}
  };

  const saveTimes = async (next: TimeItem[]) => {
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) return;
      await axios.post(
        'http://172.20.10.26:8000/api/create-med-time/',
        {
          MorningTime: next[0].time,
          NoonTime: next[1].time,
          EveningTime: next[2].time,
          Bedtime: next[3].time,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ 已儲存時間設定');
    } catch {
      Alert.alert('儲存失敗', '請稍後再試');
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    setShowPicker(false);
    if (selectedDate && pickerIndex !== null) {
      const h = selectedDate.getHours().toString().padStart(2, '0');
      const m = selectedDate.getMinutes().toString().padStart(2, '0');
      const next = times.map((t, idx) => (idx === pickerIndex ? { ...t, time: `${h}:${m}` } : t));
      setTimes(next);
      saveTimes(next); // 修改即自動儲存
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.screenBg }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      <View style={[styles.phone, outerShadow]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
          <View style={styles.timelineWrap}>
            {/* 直線容器（圓點放裡面，水平必定置中） */}
            <View style={[styles.rail, { left: RAIL_LEFT, width: RAIL_WIDTH }]}>
              {times.map((_, i) => (
                <View
                  key={`dot-${i}`}
                  style={[
                    styles.dot,
                    {
                      top: DOT_TOP_START + i * STEP,
                      left: (RAIL_WIDTH - DOT_SIZE) / 2,
                      width: DOT_SIZE,
                      height: DOT_SIZE,
                      borderRadius: DOT_SIZE / 2,
                    },
                  ]}
                />
              ))}
            </View>

            {/* 4 張卡片（整排右移，離綠線更遠） */}
            {times.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.9}
                onPress={() => { setPickerIndex(i); setShowPicker(true); }}
                style={[styles.taskCard, outerShadow, { top: i * STEP }]}
              >
                <Text style={styles.timeLabel}>
                  {item.time} <Text style={styles.timeSub}>· {item.label}</Text>
                </Text>
                <Text style={styles.desc} numberOfLines={2}>修改 {item.label} 時間</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* 底部儲存 */}
        <View pointerEvents="box-none" style={styles.fabWrap}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => saveTimes(times)} style={styles.saveBar}>
            <Text style={styles.saveText}>儲存</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showPicker && pickerIndex !== null && (
        <DateTimePicker
          value={new Date(`2023-01-01T${times[pickerIndex].time}`)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    flex: 1,
    margin: 16,
    borderRadius: 34,
    backgroundColor: COLORS.white, // ← 淡黃色
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },

  timelineWrap: {
    marginTop: 8,
    position: 'relative',
    paddingLeft: CARD_LEFT,
    minHeight: 18 + STEP * 3 + 100,
  },

  rail: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    backgroundColor: COLORS.rail,
    borderRadius: 2,
    overflow: 'visible',
  },
  dot: {
    position: 'absolute',
    backgroundColor: COLORS.rail,
  },

  taskCard: {
    position: 'absolute',
    left: CARD_LEFT,
    right: 8,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    marginTop: 12,
  },
  timeLabel: { fontSize: 20, fontWeight: '900', color: COLORS.white, marginBottom: 6 },
  timeSub:   { fontSize: 18, color: COLORS.textLight, fontWeight: '900' },
  desc:      { fontSize: 13, color: COLORS.textLight },

  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' },
  saveBar: { backgroundColor: COLORS.black, borderRadius: 22, height: 54, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 18, fontWeight: '900', color: COLORS.white },
});
