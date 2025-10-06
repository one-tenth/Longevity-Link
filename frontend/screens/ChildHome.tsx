// ChildHome.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { Modal, FlatList, TouchableWithoutFeedback, Dimensions } from 'react-native';
const { width } = Dimensions.get('window');
const CARD_W = Math.min(width * 0.86, 360);
const SNAP = CARD_W + 24;
const PERIOD_LABELS: Record<string, string> = {
  morning: '早上',
  noon: '中午',
  evening: '晚上',
  bedtime: '睡前',
};
function toZhPeriod(key?: string): string {
  if (!key) return '';
  const k = key.trim().toLowerCase();
  if (PERIOD_LABELS[k]) return PERIOD_LABELS[k];
  return key;
}
function getNextPreviewIndex(cards: Array<{ id: string; time?: string; meds?: string[] }>): number {
  if (!cards || cards.length === 0) return -1;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const sorted = [...cards].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  const hasMeds = (c: { meds?: string[] }) => Array.isArray(c.meds) && c.meds.length > 0;
  const idxInSorted =
    sorted.findIndex((c) => (c.time && c.time >= nowStr) && hasMeds(c)) >= 0
      ? sorted.findIndex((c) => (c.time && c.time >= nowStr) && hasMeds(c))
      : sorted.findIndex(hasMeds);
  if (idxInSorted < 0) return -1;
  const targetId = sorted[idxInSorted].id;
  return cards.findIndex((c) => c.id === targetId);
}
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

import AutoScrollToIndex from './AutoScrollToIndex';
import { getAvatarSource } from '../utils/avatarMap'; // ⭐ 使用 avatarMap，有缺就走文字頭像

type ChildHomeNavProp = StackNavigationProp<RootStackParamList, 'ChildHome'>;

interface Member {
  UserID: number;
  Name: string;
  RelatedID?: number | null;
  avatar?: string;
}


const API_BASE = 'http://192.168.0.91:8000'; // ← 依環境調整



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

/** ✅ 由 selectedMember 萃取「長者的 UserID」；不要用 RelatedID（多半是指向家人） */
function resolveElderIdFromSelected(m?: Member | null): number | null {
  if (!m) return null;
  const maybeElderId = Number(m.UserID);
  return Number.isFinite(maybeElderId) && maybeElderId > 0 ? maybeElderId : null;
}

export default function ChildHome() {
  const navigation = useNavigation<ChildHomeNavProp>();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [medCards, setMedCards] = useState<Array<{ id: string; period: string; time?: string; meds: string[] }>>([]);
  const [showMedModal, setShowMedModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList<any>>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const fetchMedReminders = useCallback(async () => {
    if (!selectedMember?.UserID) return;
    const token = await AsyncStorage.getItem('access');
    if (!token) return;
    try {
      const res = await axios.get(
        `${API_BASE}/api/get-med-reminders-by-userid/?user_id=${selectedMember.UserID}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const raw = res.data as Record<string, { time?: string; meds?: string[] }>;
      const converted = Object.entries(raw)
        .map(([key, val], idx) => ({
          id: String(idx + 1),
          period: toZhPeriod(key),
          time: val?.time ? String(val.time).slice(0, 5) : '',
          meds: Array.isArray(val?.meds) ? val.meds : [],
        }))
        .filter((card) => card.time || card.meds.length > 0);
      setMedCards(converted);
    } catch (err) {
      setMedCards([]);
      console.log('❌ 藥物提醒資料抓取失敗:', err);
    }
  }, [selectedMember?.UserID]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchMedReminders);
    return unsub;
  }, [navigation, fetchMedReminders]);

  useEffect(() => {
    fetchMedReminders();
  }, [fetchMedReminders]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: SNAP, offset: SNAP * index, index }),
    []
  );

  const previewIndex = useMemo(() => getNextPreviewIndex(medCards), [medCards, tick]);
  const preview = previewIndex >= 0 ? medCards[previewIndex] : null;
  const today = useMemo(getLocalToday, []);
  const [loading, setLoading] = useState(false);

  const [steps, setSteps] = useState<string>('N/A');
  const [heart, setHeart] = useState<string>('N/A');
  const [bp, setBp] = useState<string>('N/A');

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

        const elderId = resolveElderIdFromSelected(merged);
        await AsyncStorage.setItem('elder_name', merged.Name ?? '');
        if (elderId) {
          await AsyncStorage.setItem('elder_id', String(elderId));
        } else {
          await AsyncStorage.removeItem('elder_id');
        }
      } catch {
        setSelectedMember(null);
      }
    };
    const unsub = navigation.addListener('focus', loadSelectedMember);
    return unsub;
  }, [navigation]);

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

        const hcUrl = `${API_BASE}/api/healthcare/by-date/?user_id=${encodeURIComponent(
          String(selectedMember.UserID)
        )}&date=${today}`;
        const hcResp = await fetch(hcUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (hcResp.ok) {
          const hc = await hcResp.json();
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

  const goHospital = async () => {
    const elderId = resolveElderIdFromSelected(selectedMember);
    if (!elderId) {
      Alert.alert('提醒', '請先選擇要照護的長者');
      navigation.navigate('FamilyScreen', { mode: 'full' } as never);
      return;
    }
    await AsyncStorage.setItem('elder_name', selectedMember!.Name ?? '');
    await AsyncStorage.setItem('elder_id', String(elderId));
    navigation.navigate('FamilyHospitalList', {
      elderName: selectedMember!.Name,
      elderId,
    } as never);
  };

  const openCallLogs = async () => {
  if (Platform.OS !== 'android') {
    Alert.alert('僅支援 Android', 'iPhone 無法讀取通話紀錄');
    return;
  }

  // 不再檢查家人或長者端，直接讀取通話紀錄
  const elderId = resolveElderIdFromSelected(selectedMember) ?? Number(await AsyncStorage.getItem('elder_id'));

  // 檢查是否有選擇長者，若沒有則提示並跳轉至 FamilyScreen
  if (!Number.isFinite(elderId) || elderId <= 0) {
    Alert.alert('提醒', '請先選擇要照護的長者');
    navigation.navigate('FamilyScreen', { mode: 'full' } as never);
    return;
  }

  // 儲存長者的名稱與 ID
  await AsyncStorage.setItem('elder_name', selectedMember?.Name ?? '');
  await AsyncStorage.setItem('elder_id', String(elderId));

  // 跳轉到通話紀錄頁面
  navigation.navigate('CallLogScreen' as never);
};


  const goLocation = async () => {
    const elderId = resolveElderIdFromSelected(selectedMember);
    if (!elderId) {
      Alert.alert('尚未選擇長者', '請先到「家庭」頁挑選要關注的成員。');
      navigation.navigate('FamilyScreen', { mode: 'full' } as never);
      return;
    }
    await AsyncStorage.setItem('elder_name', selectedMember!.Name ?? '');
    await AsyncStorage.setItem('elder_id', String(elderId));
    navigation.navigate('Location', { elderId });
  };

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

          <TouchableOpacity
            onPress={() => navigation.navigate('FamilyScreen', { mode: 'full' })}
            style={[styles.iconBtn, { backgroundColor: COLORS.green }]}
          >
            <Feather name="settings" size={22} color={COLORS.black} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 內容捲動區 */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} scrollEnabled={!showMedModal}>
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

        {/* 吃藥提醒卡片 */}
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={!preview}
          onPress={() => {
            if (previewIndex >= 0) {
              setCurrentIndex(previewIndex);
              setShowMedModal(true);
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  flatRef.current?.scrollToIndex({ index: previewIndex, animated: false });
                });
              });
            }
          }}
          style={[
            styles.rowCard,
            styles.cardShadow,
            { backgroundColor: COLORS.green, opacity: preview ? 1 : 0.5, marginHorizontal: 16, marginBottom: 12 },
          ]}
        >
          <View style={styles.rowTop}>
            <Text style={[styles.rowTitle, { color: COLORS.white }]}>吃藥提醒</Text>
            <MaterialIcons name="medication" size={30} color={COLORS.black} />
          </View>
          <View style={[styles.noteBox, { backgroundColor: '#E9F4E4' }]}>
            {preview ? (
              <>
                <Text style={styles.notePlaceholder}>
                  {preview.period} {preview.time || ''}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                  {preview.meds.slice(0, 3).map((m: string, i: number) => (
                    <View key={i} style={styles.miniPill}>
                      <MaterialIcons name="medication" size={16} color={COLORS.black} />
                      <Text style={styles.miniPillText}>{m}</Text>
                    </View>
                  ))}
                  {preview.meds.length > 3 && (
                    <View style={styles.miniPill}>
                      <Text style={[styles.miniPillText, { fontWeight: '900' }]}>+{preview.meds.length - 3}</Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <Text style={styles.notePlaceholder}>尚無資料</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* 吃藥提醒浮層 */}
        <Modal visible={showMedModal} transparent animationType="fade" onRequestClose={() => setShowMedModal(false)}>
          {/* 半透明暗背景，點擊可關閉 */}
          <TouchableWithoutFeedback onPress={() => setShowMedModal(false)}>
            <View style={{ flex: 1, backgroundColor: '#0008', position: 'absolute', width: '100%', height: '100%' }} />
          </TouchableWithoutFeedback>

          {/* 中央卡片區域 */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
            <View
              style={{
                width: CARD_W,
                backgroundColor: COLORS.white,
                borderRadius: 32,
                padding: 0,
                alignItems: 'center',
                overflow: 'visible',
                shadowColor: '#000',
                shadowOpacity: 0.18,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 12,
              }}
            >
              {/* 關閉按鈕 */}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  zIndex: 2,
                  padding: 10,
                  backgroundColor: '#fff',
                  borderRadius: 20,
                  shadowColor: '#000',
                  shadowOpacity: 0.10,
                  shadowRadius: 6,
                  elevation: 4,
                }}
                onPress={() => setShowMedModal(false)}
                activeOpacity={0.9}
              >
                <Feather name="x" size={26} color={COLORS.black} />
              </TouchableOpacity>

              {/* 上/下一頁箭頭 */}
              <TouchableOpacity
                onPress={() => {
                  setCurrentIndex((i) => {
                    const next = Math.max(0, i - 1);
                    flatRef.current?.scrollToIndex({ index: next, animated: true });
                    return next;
                  });
                }}
                style={{
                  position: 'absolute',
                  left: -8,
                  top: '50%',
                  marginTop: -32,
                  zIndex: 2,
                  backgroundColor: '#fff',
                  borderRadius: 20,
                  padding: 8,
                  shadowColor: '#000',
                  shadowOpacity: 0.10,
                  shadowRadius: 6,
                  elevation: 4,
                  opacity: currentIndex === 0 ? 0.3 : 1,
                }}
                disabled={currentIndex === 0}
                activeOpacity={0.8}
              >
                <Feather name="chevron-left" size={32} color={COLORS.black} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setCurrentIndex((i) => {
                    const next = Math.min(medCards.length - 1, i + 1);
                    flatRef.current?.scrollToIndex({ index: next, animated: true });
                    return next;
                  });
                }}
                style={{
                  position: 'absolute',
                  right: -8,
                  top: '50%',
                  marginTop: -32,
                  zIndex: 2,
                  backgroundColor: '#fff',
                  borderRadius: 20,
                  padding: 8,
                  shadowColor: '#000',
                  shadowOpacity: 0.10,
                  shadowRadius: 6,
                  elevation: 4,
                  opacity: currentIndex === medCards.length - 1 ? 0.3 : 1,
                }}
                disabled={currentIndex === medCards.length - 1}
                activeOpacity={0.8}
              >
                <Feather name="chevron-right" size={32} color={COLORS.black} />
              </TouchableOpacity>

              {/* 可滑動卡片 */}
              <FlatList
                ref={flatRef}
                data={medCards}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled={true}
                snapToInterval={CARD_W}
                decelerationRate="fast"
                snapToAlignment="start"
                showsHorizontalScrollIndicator={false}
                getItemLayout={getItemLayout}
                scrollEnabled={true}
                style={{ width: CARD_W }}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
                  setCurrentIndex(Math.max(0, Math.min(idx, medCards.length - 1)));
                }}
                contentContainerStyle={{ paddingTop: 40, paddingBottom: 24 }}
                renderItem={({ item }) => (
                  <View
                    style={{
                      width: CARD_W,
                      backgroundColor: '#F7F9FB',
                      borderRadius: 28,
                      padding: 24,
                      marginHorizontal: 0,
                      marginBottom: 0,
                      shadowColor: '#000',
                      shadowOpacity: 0.10,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text style={{ fontSize: 22, fontWeight: 'bold', color: COLORS.green, letterSpacing: 1 }}>{item.period}</Text>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.textDark }}>{item.time}</Text>
                    </View>
                    <View style={{ borderBottomWidth: 1, borderBottomColor: '#e0e0e0', marginBottom: 16 }} />
                    <View style={{ minHeight: 60, alignItems: 'flex-start', justifyContent: 'center' }}>
                      {item.meds.length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                          {item.meds.map((m: string, i: number) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.green, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, marginBottom: 8 }}>
                              <MaterialIcons name="medication" size={18} color={COLORS.black} />
                              <Text style={{ fontSize: 17, fontWeight: 'bold', color: COLORS.textDark, marginLeft: 8 }}>{m}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={{ fontSize: 18, color: COLORS.textMid, fontWeight: '600' }}>此時段沒有藥物</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={{
                        alignSelf: 'center',
                        marginTop: 24,
                        backgroundColor: COLORS.green,
                        borderRadius: 16,
                        paddingVertical: 12,
                        paddingHorizontal: 48,
                        shadowColor: COLORS.green,
                        shadowOpacity: 0.18,
                        shadowRadius: 8,
                        elevation: 4,
                      }}
                      onPress={() => setShowMedModal(false)}
                      activeOpacity={0.9}
                    >
                      <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 18, letterSpacing: 1 }}>知道了</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />

              {showMedModal && medCards.length > 0 && (
                <AutoScrollToIndex flatRef={flatRef} index={currentIndex} />
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 16 }}>
                {medCards.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      height: 10,
                      borderRadius: 5,
                      marginHorizontal: 3,
                      backgroundColor: COLORS.green,
                      opacity: i === currentIndex ? 1 : 0.35,
                      width: i === currentIndex ? 22 : 10,
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        </Modal>

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
        style={[quick.iconCircle, { width: big ? 60 : 52, height: big ? 60 : 52, borderRadius: big ? 30 : 26 }]}
      >
        {icon}
      </View>
      <Text
        style={[quick.label, { color: darkLabel ? COLORS.black : COLORS.white, fontSize: big ? 18 : 16 }]}
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

  rowCard: {
    borderRadius: 18,
    padding: 14,
    minHeight: 108,
    marginBottom: 12,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 30, fontWeight: '900', color: COLORS.textDark },
  noteBox: { marginTop: 10, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  notePlaceholder: { fontSize: 30, fontWeight: '800', color: COLORS.textMid },
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F7F9FB',
    marginRight: 8,
    marginBottom: 8,
  },
  miniPillText: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginLeft: 6 },
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
