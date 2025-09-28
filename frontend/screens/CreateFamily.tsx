// CreateFamily.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  ScrollView,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Svg, { Text as SvgText, TextPath, Defs, Path } from 'react-native-svg';
import { RootStackParamList } from '../App';

type CreateFamilyNavProp = StackNavigationProp<RootStackParamList, 'CreateFamily'>;

/** ====== 配色、圓角、陰影（與 ChildHome 對齊） ====== */
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

/** 弧形標題：置中 CareMate（與你原本一致） */
function ArcText() {
  return (
    <Svg width={420} height={120} viewBox="0 0 360 90" style={{ alignSelf: 'center' }}>
      <Defs>
        <Path id="curve" d="M60,70 Q180,10 300,70" fill="none" />
      </Defs>
      <SvgText fill={COLORS.textDark} fontSize="42" fontWeight="bold" fontFamily="FascinateInline-Regular">
        <TextPath href="#curve" startOffset="0%" textAnchor="start">
          .CareMate.
        </TextPath>
      </SvgText>
    </Svg>
  );
}

export default function CreateFamily() {
  const navigation = useNavigation<CreateFamilyNavProp>();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header：置中 CareMate */}
      <View style={ui.header}>
        <ArcText />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {/* 白色主卡片（與 ChildHome 的卡片圓角/陰影一致） */}
        <View style={[ui.card, outerShadow]}>
          {/* 中央圖示：加柔和陰影 */}
          <Image
            source={require('../img/family/basic-needs.png')}
            style={[ui.heroImg, lightShadow]}
          />

          {/* 主要動作按鈕：Pressable + ripple + 按下縮放（與 ChildHome 快捷卡互動一致） */}
          <Pressable
            onPress={() => navigation.navigate('FamilySetting')}
            android_ripple={{ color: '#00000010' }}
            style={({ pressed }) => [
              ui.primaryBtn,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={ui.primaryInner}>
              <Text style={ui.primaryText}>創建家庭</Text>
            </View>
          </Pressable>

          {/* 若未來要恢復加入家庭，可複製上方 Pressable 並改導頁即可 */}
          {/*
          <Pressable
            onPress={() => navigation.navigate('JoinFamily')}
            android_ripple={{ color: '#00000010' }}
            style={({ pressed }) => [
              ui.secondaryBtn,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={ui.secondaryText}>加入家庭</Text>
          </Pressable>
          */}
        </View>
      </ScrollView>
    </View>
  );
}

/** ====== Styles（風格與 ChildHome 對齊） ====== */
const ui = StyleSheet.create({
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    transform: [{ scale: 0.9 }],
    backgroundColor: COLORS.white,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: R,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 28,
  },

  heroImg: {
    width: 240,
    height: 240,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginVertical: 28,
  },

  primaryBtn: {
    backgroundColor: COLORS.black,
    borderRadius: R,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    ...outerShadow,
  },
  primaryInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  //（備用）淺色次要按鈕
  secondaryBtn: {
    backgroundColor: COLORS.cream,
    borderRadius: R,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginHorizontal: 8,
  },
  secondaryText: {
    color: COLORS.textDark,
    fontSize: 18,
    fontWeight: '900',
  },
});
