import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import MedInfoScreen from './MedInfo';
import MedTimeScreen from './MedTimeSetting';

type MedicineNavProp = StackNavigationProp<RootStackParamList, 'Medicine'>;

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
  gray: '#9AA0A6',
};

const R = 22;
const outerShadow = {
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
};

export default function Medicine() {
  const navigation = useNavigation<MedicineNavProp>();
  const [activeTab, setActiveTab] = useState<'info' | 'time'>('info');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* ── Header：左白底返回鍵 + 中綠色用藥功能（置中） + 右占位對稱 */}
      <View style={styles.headerRow}>
        <View style={styles.sideSlot}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ChildHome_1' as never)}
            style={[styles.backBtn]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FontAwesome name="arrow-left" size={22} color={COLORS.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.centerSlot}>
          <View style={[styles.featureBanner, outerShadow]}>
            <MaterialCommunityIcons name="pill" size={28} color={COLORS.black} style={{ marginRight: 10 }} />
            <Text style={styles.bannerTitle}>用藥功能</Text>
          </View>
        </View>

        <View style={styles.sideSlot} />
      </View>

      {/* ── Tabs（保留你的圖片；選中黑、未選中灰） */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('info')}>
          <Image source={require('../img/childhome/file.png')} style={styles.tabIcon} />
          <Text style={[styles.tabText, activeTab === 'info' ? styles.tabTextActive : styles.tabTextInactive]}>
            用藥資訊
          </Text>
          {activeTab === 'info' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('time')}>
          <Image source={require('../img/childhome/clock.png')} style={styles.tabIcon} />
          <Text style={[styles.tabText, activeTab === 'time' ? styles.tabTextActive : styles.tabTextInactive]}>
            時間設定
          </Text>
          {activeTab === 'time' && <View style={styles.activeDot} />}
        </TouchableOpacity>
      </View>

      {/* ── 內容 */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {activeTab === 'info' ? <MedInfoScreen /> : <MedTimeScreen />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  /* 三欄：左 48 / 中 flex / 右 48，確保中間真正置中 */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    minHeight: 76,
  },
  sideSlot: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',                  // 綠色卡片在中間欄置中
    justifyContent: 'center',
  },
  featureBanner: {
    width: '90%',                          // 綠色卡片寬度
    minHeight: 64,
    backgroundColor: COLORS.green,
    borderRadius: R,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',              // icon + 文字置中
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.black,
    letterSpacing: 0.3,
  },

  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6E6E6',
  },
  tab: { alignItems: 'center' },
  tabIcon: { width: 40, height: 40, marginBottom: 4 },
  tabText: { fontSize: 15, fontWeight: '800' },
  tabTextActive: { color: COLORS.black },
  tabTextInactive: { color: COLORS.gray },
  activeDot: {
    marginTop: 6,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.black,
  },
});
