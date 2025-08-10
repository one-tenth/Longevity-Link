// screens/ElderHome.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type ElderHomeNavProp = StackNavigationProp<RootStackParamList, 'ElderHome'>;

const DEEP_GREEN = '#004D40';

/** =========================
 *  Raised Card（可獨立調整 icon 尺寸）
 *  ========================= */
function RaisedCard({
  title,
  lines = [],
  icon,
  iconWidth = 100,
  iconHeight = 100,
  onPress,
}: {
  title: string;
  lines?: string[];
  icon: any;
  iconWidth?: number;
  iconHeight?: number;
  onPress?: () => void;
}) {
  const scale = useState(new Animated.Value(1))[0];
  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 2,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 2,
    }).start();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        {/* 左：文字區 */}
        <View style={styles.cardTextCol}>
          <Text style={styles.cardTitle}>{title}</Text>
          {lines.map((t, i) => (
            <Text key={i} style={i === 0 ? styles.cardMain : styles.cardSub}>
              {t}
            </Text>
          ))}
        </View>

        {/* 右：icon（可獨立調整大小） */}
        <View style={styles.cardIconCol}>
          <Image
            source={icon}
            style={{
              width: iconWidth,
              height: iconHeight,
              opacity: 0.12,
              tintColor: DEEP_GREEN,
            }}
            resizeMode="contain"
          />
        </View>

        {/* 頂部高光（立體感） */}
        <View style={styles.topSheen} pointerEvents="none" />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function ElderHome() {
  const navigation = useNavigation<ElderHomeNavProp>();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('ElderHome')}>
          <Image
            source={require('../img/elderlyhome/home.png')}
            style={styles.settingIcon}
          />
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image
          source={require('../img/elderlyhome/head.png')}
          style={styles.logo}
        />
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 吃藥提醒 → ElderMedRemind */}
        <RaisedCard
          title="吃藥提醒"
          lines={['早上 8:00', '保健品']}
          icon={require('../img/elderlyhome/pill.png')}
          iconWidth={120}
          iconHeight={120}
          onPress={() => navigation.navigate('ElderMedRemind')}
        />

        {/* 看診提醒 → HospitalRecord */}
        <RaisedCard
          title="看診提醒"
          lines={['早上 8:00', '臺大醫院','鄭醫師']}
          icon={require('../img/elderlyhome/hospital.png')}
          iconWidth={160}
          iconHeight={160}
          onPress={() => navigation.navigate('HospitalRecord')}
        />

        {/* 健康狀況 → ElderlyHealth */}
        <RaisedCard
          title="健康狀況"
          lines={['步數、血壓']}
          icon={require('../img/elderlyhome/heart.png')}
          iconWidth={140}
          iconHeight={140}
          onPress={() => navigation.navigate('ElderlyHealth')}
        />
      </ScrollView>

      {/* 底部拍照按鈕 */}
      <View pointerEvents="box-none" style={styles.fabWrap}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('ElderlyUpload')}
          activeOpacity={0.85}
        >
          <Image
            source={require('../img/elderlyhome/camera.png')}
            style={styles.fabIcon}
          />
          <Text style={styles.fabText}>拍照</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** =========================
 *  Styles
 *  ========================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingIcon: { width: 50, height: 50, tintColor: DEEP_GREEN },
  title: { fontSize: 40, fontWeight: '800', color: DEEP_GREEN, marginLeft: 12 },
  logo: { width: 70, height: 70, marginLeft: 'auto' },

  scrollContent: { paddingBottom: 160 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 110,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 16,
    elevation: 8,
  },
  cardTextCol: { flex: 1, paddingRight: 12 },
  cardIconCol: {
    width: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { color: DEEP_GREEN, fontSize: 30, fontWeight: '800' },
  cardMain: { color: '#111', fontSize: 27, fontWeight: '800', marginTop: 6 },
  cardSub: { color: '#111', fontSize: 27, fontWeight: '800', marginTop: 2 },
  topSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 14,
    backgroundColor: '#FFF',
    opacity: 0.6,
  },

  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.select({ ios: 28, android: 22 }),
    alignItems: 'center',
  },
  fab: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: DEEP_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  fabIcon: { width: 55, height: 55, marginBottom: 1 },
  fabText: { color: '#FFF', fontSize: 30, fontWeight: '800' },
});
