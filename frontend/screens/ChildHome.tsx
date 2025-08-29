import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, StatusBar,
  ScrollView, Pressable, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import { RootStackParamList } from '../App';

type ChildHomeNavProp = StackNavigationProp<RootStackParamList, 'ChildHome'>;

interface Member {
  UserID: number;
  Name: string;
  RelatedID?: number | null;
}

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

/* 外層大框陰影 */
const outerShadow = {
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
} as const;

/* 功能卡輕陰影 */
const lightShadow = {
  elevation: 2,
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
} as const;

export default function ChildHome() {
  const navigation = useNavigation<ChildHomeNavProp>();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // 讀取已選長者
  useEffect(() => {
    const loadSelectedMember = async () => {
      const stored = await AsyncStorage.getItem('selectedMember');
      if (stored) {
        const parsed: Member = JSON.parse(stored);
        if (parsed?.RelatedID) {
          setSelectedMember(parsed);
          await AsyncStorage.setItem('elder_name', parsed.Name ?? '');
          await AsyncStorage.setItem('elder_id', parsed.RelatedID.toString());
        } else {
          setSelectedMember(null);
        }
      } else {
        setSelectedMember(null);
      }
    };
    const unsub = navigation.addListener('focus', loadSelectedMember);
    return unsub;
  }, [navigation]);

  // 回診資料邏輯
  const goHospital = async () => {
    if (!selectedMember || !selectedMember.RelatedID) {
      Alert.alert('提醒', '請先選擇要照護的長者');
      navigation.navigate('FamilyScreen', { mode: 'select' });
      return;
    }
    await AsyncStorage.setItem('elder_name', selectedMember.Name ?? '');
    await AsyncStorage.setItem('elder_id', selectedMember.RelatedID.toString());

    navigation.navigate('FamilyHospitalList', {
      elderName: selectedMember.Name,
      elderId: selectedMember.RelatedID,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* ==== HERO（黑色大卡） ==== */}
      <View style={[styles.hero, { backgroundColor: COLORS.black }, outerShadow]}>
        <View style={styles.heroRow}>
          <Pressable onPress={() => navigation.navigate('FamilyScreen', { mode: 'select' })}>
            <Image source={require('../img/childhome/grandpa.png')} style={styles.avatar} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hello, { color: COLORS.white }]}>
              {selectedMember?.Name || '尚未選擇'}
            </Text>
            <Text style={{ color: COLORS.green, opacity: 0.95 }}>家庭成員 · 關注中</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Setting' as never)}
            style={[styles.iconBtn, { backgroundColor: COLORS.green }]}
          >
            <Feather name="settings" size={22} color={COLORS.black} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 內容捲動區 */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* 統計列 */}
        <View style={[styles.statsBar, outerShadow]}>
          <StatBox title="步數" value="6,420" />
          <StatBox title="心率" value="72" suffix="bpm" />
          <StatBox title="血壓" value="118/76" />
          <StatBox title="睡眠" value="7.2" suffix="h" />
        </View>

        {/* 功能列 */}
        <View style={styles.grid2x2}>
          <QuickIcon
            big
            bg={COLORS.green}
            icon={<MaterialIcons name="favorite" size={34} color={COLORS.black} />}
            label="健康狀況"
            onPress={() => navigation.navigate('Health' as never)}
            darkLabel={false}
          />
          <QuickIcon
            big
            bg={COLORS.cream}
            icon={<MaterialIcons name="medical-services" size={32} color={COLORS.textDark} />}
            label="用藥資訊"
            onPress={() => navigation.navigate('Medicine' as never)}
          />
          <QuickIcon
            big
            bg={COLORS.black}
            icon={<MaterialIcons name="event-note" size={32} color={COLORS.green} />}
            label="回診資料"
            onPress={goHospital}
            darkLabel={false}
          />
          <QuickIcon
            big
            bg={COLORS.green}
            icon={<Feather name="phone-call" size={32} color={COLORS.black} />}
            label="通話紀錄"
            onPress={() => navigation.navigate('CallRecord' as never)}
            darkLabel={false}
          />
        </View>
      </ScrollView>

      {/* 底部功能列 */}
      <View style={styles.bottomBox}>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Profile' as never)}>
          <FontAwesome name="user" size={28} color="#fff" />
          <Text style={styles.settingLabel}>個人</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('FamilyScreen', { mode: 'full' })}>
          <FontAwesome name="home" size={28} color="#fff" />
          <Text style={styles.settingLabel}>家庭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ====== 子元件 ====== */
function QuickIcon({
  bg, icon, label, onPress, darkLabel = true, big = false,
}: {
  bg: string; icon: React.ReactNode; label: string; onPress: () => void; darkLabel?: boolean; big?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#00000010' }}
      style={({ pressed }) => [
        quick.item,
        { backgroundColor: bg, padding: big ? 20 : 16 },
        lightShadow,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={[quick.iconCircle, { width: big ? 60 : 52, height: big ? 60 : 52, borderRadius: big ? 30 : 26 }]}>{icon}</View>
      <Text style={[quick.label, { color: darkLabel ? COLORS.black : COLORS.white, fontSize: big ? 18 : 16 }]}>{label}</Text>
    </Pressable>
  );
}

function StatBox({ title, value, suffix }: { title: string; value: string; suffix?: string }) {
  return (
    <View style={stats.box}>
      <Text style={stats.title}>{title}</Text>
      <Text style={stats.value}>
        {value}{suffix ? <Text style={stats.suffix}> {suffix}</Text> : null}
      </Text>
    </View>
  );
}

/* ====== Styles ====== */
const styles = StyleSheet.create({
  hero: { margin: 16, marginBottom: 8, padding: 16, borderRadius: R },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: COLORS.white },
  hello: { fontSize: 22, fontWeight: '900' },
  iconBtn: { padding: 10, borderRadius: 12 },

  statsBar: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  grid2x2: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bottomBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: COLORS.black,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  settingItem: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  settingLabel: { color: '#fff', fontSize: 13, fontWeight: '800' },
});

const quick = StyleSheet.create({
  item: { width: '47%', borderRadius: R, alignItems: 'center' },
  iconCircle: { alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 8, fontWeight: '900' },
});

const stats = StyleSheet.create({
  box: {
    width: '23%',
    backgroundColor: COLORS.grayBox,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textMid },
  value: { fontSize: 20, fontWeight: '900', color: COLORS.black },
  suffix: { fontSize: 14, fontWeight: '700', color: COLORS.black },
});
