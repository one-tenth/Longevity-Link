// ChildHome.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import { RootStackParamList } from '../App';
import { getAvatarSource } from '../utils/avatarMap'; // ⭐ 使用 avatarMap，有缺就走文字頭像

type ChildHomeNavProp = StackNavigationProp<RootStackParamList, 'ChildHome'>;

interface Member {
  UserID: number;
  Name: string;
  RelatedID?: number | null;
  avatar?: string;
}


const API_BASE = 'http://172.20.10.8:8000'; // ← 依環境調整

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

/** 取得本地(裝置)今天 YYYY-MM-DD */
function getLocalToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ChildHome() {
  const navigation = useNavigation<ChildHomeNavProp>();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const today = useMemo(getLocalToday, []);
  const [loading, setLoading] = useState(false);

  // 統計值
  const [steps, setSteps] = useState<string>('N/A');
  const [heart, setHeart] = useState<string>('N/A'); // 來自 healthcare.pulse
  const [bp, setBp] = useState<string>('N/A');

  // 讀取已選成員（沒有 avatar 時補上預設檔名，並兼容寫入 elder_*）
  useEffect(() => {
    const loadSelectedMember = async () => {
      const stored = await AsyncStorage.getItem('selectedMember');
      if (!stored) {
        setSelectedMember(null);
        return;
      }
      try {
        const parsed: Member = JSON.parse(stored);
        const merged: Member = { ...parsed, avatar: parsed.avatar || 'woman.png' };
        setSelectedMember(merged);

        if (parsed?.RelatedID != null) {
          await AsyncStorage.setItem('elder_name', parsed.Name ?? '');
          await AsyncStorage.setItem('elder_id', String(parsed.RelatedID));
        }
      } catch {
        setSelectedMember(null);
      }
    };
    const unsub = navigation.addListener('focus', loadSelectedMember);
    return unsub;
  }, [navigation]);

  // 查詢「當天」fitdata / healthcare（用 user_id）
  useEffect(() => {
    const fetchAll = async () => {
      if (!selectedMember?.UserID) return;

      setLoading(true);
      setSteps('N/A');
      setHeart('N/A');
      setBp('N/A');

      try {
        const token = await AsyncStorage.getItem('access');
        if (!token) {
          Alert.alert('請先登入', '您尚未登入，請前往登入畫面');
          navigation.navigate('LoginScreen' as never);
          return;
        }

        // FITDATA
        const fitUrl = `${API_BASE}/api/fitdata/by-date/?user_id=${encodeURIComponent(
          String(selectedMember.UserID)
        )}&date=${today}`;
        const fitResp = await fetch(fitUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fitResp.ok) {
          const fit = await fitResp.json();
          if (isFiniteNum(fit?.steps)) setSteps(`${Number(fit.steps)}`);
        } else if (fitResp.status !== 404) {
          console.warn('fitdata 讀取失敗', await safeText(fitResp));
        }

        // HEALTHCARE（晚 > 早）
        const hcUrl = `${API_BASE}/api/healthcare/by-date/?user_id=${encodeURIComponent(
          String(selectedMember.UserID)
        )}&date=${today}`;
        const hcResp = await fetch(hcUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (hcResp.ok) {
          const hc = await hcResp.json();
          // 結構預期：{ morning: {...} | null, evening: {...} | null }
          const morning = hc?.morning ?? null;
          const evening = hc?.evening ?? null;
          const latestData = evening || morning;

          if (latestData) {
            const sys = num(latestData.systolic);
            const dia = num(latestData.diastolic);
            const pulse = num(latestData.pulse);
            if (sys != null && dia != null) setBp(`${sys}/${dia}`);
            if (pulse != null) setHeart(`${pulse}`);
          }
        } else if (hcResp.status !== 404) {
          console.warn('healthcare 讀取失敗', await safeText(hcResp));
        }
      } catch (err) {
        console.error('讀取資料錯誤:', err);
        Alert.alert('讀取失敗', '無法取得當日健康資料，請稍後再試');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [selectedMember?.UserID, today, navigation]);

  // 回診資料（仍沿用 RelatedID 給你的回診頁）
  const goHospital = async () => {
    if (!selectedMember || !selectedMember.RelatedID) {
      Alert.alert('提醒', '請先選擇要照護的長者');
      navigation.navigate('FamilyScreen', { mode: 'full' } as never);
      return;
    }
    await AsyncStorage.setItem('elder_name', selectedMember.Name ?? '');
    await AsyncStorage.setItem('elder_id', String(selectedMember.RelatedID));
    navigation.navigate('FamilyHospitalList', {
      elderName: selectedMember.Name,
      elderId: selectedMember.RelatedID,
    } as never);
  };

  /** 通話紀錄：未選長者就先跳 FamilyScreen；iOS 限制提示 */
  const openCallLogs = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('僅支援 Android', 'iPhone 無法讀取通話紀錄');
      return;
    }
    if (!selectedMember || !selectedMember.RelatedID) {
      const maybeElderId = await AsyncStorage.getItem('elder_id');
      if (!maybeElderId) {
        Alert.alert('提醒', '請先選擇要照護的長者');
        navigation.navigate('FamilyScreen', { mode: 'select' } as never);
        return;
      }
    } else {
      await AsyncStorage.setItem('elder_name', selectedMember.Name ?? '');
      await AsyncStorage.setItem('elder_id', String(selectedMember.RelatedID));
    }
    navigation.navigate('CallLogScreen' as never);
  };

  // 定位
  const goLocation = async () => {
    if (!selectedMember) {
      Alert.alert('尚未選擇長者', '請先到「家庭」頁挑選要關注的成員。');
      navigation.navigate('FamilyScreen', { mode: 'full' } as never);
      return;
    }
    const elderId = selectedMember.RelatedID ?? selectedMember.UserID;
    await AsyncStorage.setItem('elder_name', selectedMember.Name ?? '');
    await AsyncStorage.setItem('elder_id', String(elderId));
    navigation.navigate('Location' as never, {
      elderId,
      elderName: selectedMember.Name,
    } as never);
  };

  // Avatar source / fallback
  const avatarSrc = getAvatarSource(selectedMember?.avatar) as any | undefined;
  const initial = selectedMember?.Name?.[0] ?? '人';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* ==== HERO（黑色大卡） ==== */}
      <View style={[styles.hero, { backgroundColor: COLORS.black }, outerShadow]}>
        <View style={styles.heroRow}>
          <Pressable onPress={() => navigation.navigate('FamilyScreen', { mode: 'select' } as never)}>
            {avatarSrc ? (
              <Image source={avatarSrc} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={[styles.hello, { color: COLORS.white }]}>
              {selectedMember?.Name || '尚未選擇'}
            </Text>
            <Text style={{ color: COLORS.green, opacity: 0.95 }}>{`日期 ${today}`}</Text>
          </View>

          {/* 設定鈕 → 選擇家人頁 */}
          <TouchableOpacity
            onPress={() => navigation.navigate('FamilyScreen', { mode: 'full' })}
            style={[styles.iconBtn, { backgroundColor: COLORS.green }]}
          >
            <Feather name="settings" size={22} color={COLORS.black} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 內容捲動區 */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {loading ? (
          <View style={{ paddingTop: 24, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.black} />
            <Text style={{ marginTop: 8, color: COLORS.textMid }}>讀取中…</Text>
          </View>
        ) : null}

        {/* 統計列 */}
        <View style={[styles.statsBar, outerShadow]}>
          <StatBox title="步數" value={steps} />
          <StatBox title="心率" value={heart} suffix={heart !== 'N/A' ? 'bpm' : undefined} />
          <StatBox title="血壓" value={bp} />
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
            onPress={openCallLogs}
            darkLabel={false}
          />
          <QuickIcon
            big
            bg={COLORS.green}
            icon={<MaterialIcons name="location-on" size={32} color={COLORS.black} />}
            label="家人定位"
            onPress={goLocation}
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
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate('FamilyScreen', { mode: 'full' } as never)}
        >
          <FontAwesome name="home" size={28} color="#fff" />
          <Text style={styles.settingLabel}>家庭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ====== 工具函式 ====== */
function num(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function isFiniteNum(v: any): boolean {
  return Number.isFinite(Number(v));
}
async function safeText(r: Response) {
  try {
    return await r.text();
  } catch {
    return '';
  }
}

/* ====== 子元件 ====== */
function QuickIcon({
  bg,
  icon,
  label,
  onPress,
  darkLabel = true,
  big = false,
}: {
  bg: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  darkLabel?: boolean;
  big?: boolean;
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
      <View
        style={[
          quick.iconCircle,
          { width: big ? 60 : 52, height: big ? 60 : 52, borderRadius: big ? 30 : 26 },
        ]}
      >
        {icon}
      </View>
      <Text
        style={[
          quick.label,
          { color: darkLabel ? COLORS.black : COLORS.white, fontSize: big ? 18 : 16 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StatBox({ title, value, suffix }: { title: string; value: string; suffix?: string }) {
  return (
    <View style={stats.box}>
      <Text style={stats.title}>{title}</Text>
      <Text style={stats.value}>
        {value}
        {suffix ? <Text style={stats.suffix}> {suffix}</Text> : null}
      </Text>
    </View>
  );
}

/* ====== Styles ====== */
const styles = StyleSheet.create({
  hero: { margin: 16, marginBottom: 8, padding: 16, borderRadius: R },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallback: { backgroundColor: '#EAF6EA' },
  avatarText: { fontSize: 18, fontWeight: '900', color: COLORS.textDark },

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
    width: '31%',
    backgroundColor: COLORS.grayBox,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textMid },
  value: { fontSize: 20, fontWeight: '900', color: COLORS.black },
  suffix: { fontSize: 14, fontWeight: '700', color: COLORS.black },
});
