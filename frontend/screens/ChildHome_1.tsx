import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';

type ChildHomeNavProp = StackNavigationProp<RootStackParamList, 'ChildHome'>;

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
};

export default function ChildHome() {
  const navigation = useNavigation<ChildHomeNavProp>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* 上半：使用者列 */}
      <View style={styles.topArea}>
        <View style={styles.userCard}>
          <Image source={require('../img/childhome/grandpa.png')} style={styles.userIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>爺爺</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Setting' as never)}>
            <Feather name="edit-2" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 下半：白色圓角面板 */}
      <View style={styles.panel}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          style={{ flex: 1 }}
        >
          {/* 上方兩個方卡 */}
          <View style={styles.topGrid}>
            {/* 黑：健康狀況 */}
            <TouchableOpacity
              style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.black }]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Health' as never)}
            >
              <Text style={[styles.squareTitle, { color: COLORS.white }]}>健康狀況</Text>
              <View style={styles.squareBottomRow}>
                <View style={[styles.iconCircle, { backgroundColor: COLORS.green }]}>
                  <MaterialIcons name="favorite" size={22} color={COLORS.black} />
                </View>
              </View>
            </TouchableOpacity>

            {/* 奶油黃：用藥資訊 */}
            <TouchableOpacity
              style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.cream }]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Medicine' as never)}
            >
              <Text style={[styles.squareTitle, { color: COLORS.textDark }]}>用藥資訊</Text>
              <View style={styles.squareBottomRow}>
                <View style={[styles.iconCircle, { backgroundColor: '#E6F3E0' }]}>
                  <MaterialIcons name="medical-services" size={22} color={COLORS.textDark} />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* 橫向卡 1：綠（即時位置） */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Location' as never)}
            style={[styles.rowCard, styles.cardShadow, { backgroundColor: COLORS.green }]}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.rowTitle, { color: COLORS.white }]}>即時位置</Text>
              <MaterialIcons name="location-on" size={22} color={COLORS.black} />
            </View>
            <View style={[styles.noteBox, { backgroundColor: '#E9F4E4' }]}>
              <Text style={styles.notePlaceholder}></Text>
            </View>
          </TouchableOpacity>

          {/* 橫向卡 2：黑（看診紀錄） */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('HospitalRecord' as never)}
            style={[styles.rowCard, styles.cardShadow, { backgroundColor: COLORS.black }]}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.rowTitle, { color: COLORS.white }]}>看診紀錄</Text>
              <MaterialIcons name="event-note" size={22} color={COLORS.white} />
            </View>
            <View style={[styles.noteBox, { backgroundColor: COLORS.white }]}>
              <Text style={[styles.notePlaceholder, { color: COLORS.textMid }]}></Text>
            </View>
          </TouchableOpacity>

          {/* 橫向卡 3：奶油黃（通話紀錄） */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('CallRecord' as never)}
            style={[styles.rowCard, styles.cardShadow, { backgroundColor: COLORS.cream }]}
          >
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>通話紀錄</Text>
              <Feather name="phone-call" size={22} color={COLORS.black} />
            </View>
            <View style={[styles.noteBox, { backgroundColor: '#FFF6D9' }]}>
              <Text style={styles.notePlaceholder}></Text>
            </View>
          </TouchableOpacity>

          {/* 個人 / 家庭：一體化外觀，兩邊可分開點擊；寬度一致、不顯得分離 */}
          <View style={[styles.unifiedButtons, { marginTop: 30 }]}>
            {/* 個人（左半） */}
            <TouchableOpacity
              style={[styles.buttonHalf]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Profile' as never)}
            >
              <FontAwesome name="user" size={24} color={COLORS.white} />
              <Text style={styles.buttonText}>個人</Text>
            </TouchableOpacity>

            {/* 家庭（右半） */}
            <TouchableOpacity
              style={[styles.buttonHalf]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('FamilySetting' as never)}
            >
              <FontAwesome name="home" size={24} color={COLORS.white} />
              <Text style={styles.buttonText}>家庭</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const IMAGE_SIZE = 80;

const styles = StyleSheet.create({
  // 整體背景：上半黑、下半白面板
  container: { flex: 1, backgroundColor: COLORS.black },

  // 上半：使用者列
  topArea: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: COLORS.black },
  userCard: {
    backgroundColor: COLORS.black,
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  userIcon: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: IMAGE_SIZE / 2 },
  userName: { color: COLORS.white, fontSize: 24, fontWeight: '900' },

  // 下半：白色圓角面板
  panel: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 16,
  },

  // 共用陰影
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  // 上方兩個方卡
  topGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  squareCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    height: 146,
    justifyContent: 'space-between',
  },
  squareTitle: { fontSize: 20, fontWeight: '900' },
  squareBottomRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  // 橫向卡
  rowCard: {
    borderRadius: 18,
    padding: 14,
    minHeight: 108,
    marginBottom: 12,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark },

  // 非互動佔位框
  noteBox: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  notePlaceholder: { fontSize: 14, fontWeight: '400', color: COLORS.textMid },

  // 一體化並排按鈕（看起來一個整塊，但左右可分開）
  unifiedButtons: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',                // 按鈕不要太大
    backgroundColor: COLORS.black,
    borderRadius: 50,
    overflow: 'hidden',          // 讓兩半貼齊，視覺上一體
  },
  buttonHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  buttonText: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.white,
  },
});
