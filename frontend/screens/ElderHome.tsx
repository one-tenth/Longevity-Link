import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Dimensions,
  StatusBar,
  Alert,
  PermissionsAndroid,
  Platform,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import CallLogs from 'react-native-call-log';
import { RootStackParamList } from '../App';
import { setupNotificationChannel, initMedicationNotifications, initVisitNotifications } from '../utils/initNotification';
import { getAvatarSource } from '../utils/avatarMap';

type ElderHomeNav = StackNavigationProp<RootStackParamList, 'ElderHome'>;

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
  lightred: '#D67C78',
  red: '#FF4C4C',
};

const { width } = Dimensions.get('window');
const CARD_W = Math.min(width * 0.86, 360);
const SNAP = CARD_W + 24;

const pad = (n: number) => String(n).padStart(2, '0');

function getNextPreviewIndex(cards: Array<{ id: string; time?: string; meds?: string[] }>): number {
  if (!cards || cards.length === 0) return -1;
  const now = new Date();
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

  const tokens = k.split(/[^a-z]+/).filter(Boolean);
  const hasBefore = tokens.includes('before') || tokens.includes('pre') || tokens.includes('premeal') || tokens.includes('pre_meal');
  const hasAfter  = tokens.includes('after')  || tokens.includes('post') || tokens.includes('postmeal') || tokens.includes('post_meal');
  const mealMap: Record<string, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', meal: '飯' };
  const mealToken = tokens.find(t => mealMap[t]);
  if (mealToken) {
    const mealZh = mealMap[mealToken];
    if (hasBefore) return `${mealZh}前`;
    if (hasAfter)  return `${mealZh}後`;
  }
  for (const t of tokens) if (PERIOD_LABELS[t]) return PERIOD_LABELS[t];
  return key;
}

const BASE = 'http://192.168.31.126:8000';

const LAST_UPLOAD_TS_KEY = 'calllog:last_upload_ts';
const LAST_SYNC_AT_KEY   = 'calllog:last_sync_at';
const SYNC_MIN_INTERVAL_MS = 1 * 60 * 1000;

function mapType(t?: string) {
  if (!t) return 'UNKNOWN';
  const s = String(t).toUpperCase();
  if (['INCOMING', 'OUTGOING', 'MISSED', 'REJECTED'].includes(s)) return s;
  if (s === '1') return 'INCOMING';
  if (s === '2') return 'OUTGOING';
  if (s === '3') return 'MISSED';
  if (s === '4' || s === '5') return 'REJECTED';
  return 'UNKNOWN';
}

type HospitalRecord = {
  HosId?: number;
  HosID?: number;
  id?: number;
  ClinicDate: string;
  ClinicPlace: string;
  Doctor: string;
  Num: number;
};

type MeInfo = {
  UserID: number;
  RelatedID?: number | null;
  isElder?: boolean;
  Name?: string;
  avatar_url?: string | null;
  avatar?: string | null;
};

async function resolveElderId(): Promise<number | null> {
  try {
    const saved = await AsyncStorage.getItem('elder_id');
    const fromStore = saved ? Number(saved) : NaN;
    if (!Number.isNaN(fromStore)) return fromStore;

    const token = await AsyncStorage.getItem('access');
    if (!token) return null;

    const me = await axios.get<MeInfo>(`${BASE}/api/account/me/`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });

    const info = me.data || {};
    if (typeof info.RelatedID === 'number' && !Number.isNaN(info.RelatedID)) {
      await AsyncStorage.setItem('elder_id', String(info.RelatedID));
      return info.RelatedID;
    }
    return null;
  } catch {
    return null;
  }
}

const normalizeDateStr = (s?: string) => {
  if (!s) return '';
  const core = s.includes('T') ? s.split('T')[0] : s;
  return core.replace(/[./]/g, '-');
};

const parseDate = (s?: string) => {
  const d = normalizeDateStr(s);
  const parts = d.split('-');
  if (parts.length === 3) {
    const [y, m, dd] = parts.map((x) => Number(x));
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(dd)) {
      return new Date(y, Math.max(0, m - 1), dd);
    }
  }
  return new Date(NaN);
};

const onlyDate = (s?: string) => normalizeDateStr(s);
const normalizeDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const pickUpcomingNearest = (list: HospitalRecord[]) => {
  const today = normalizeDay(new Date());
  const parsed = list
    .map((r) => ({ d: parseDate(r.ClinicDate), r }))
    .filter((x) => !isNaN(+x.d))
    .sort((a, b) => +a.d - +b.d);

  if (parsed.length > 0) {
    const upcoming = parsed.find((x) => normalizeDay(x.d).getTime() >= +today);
    if (upcoming) return upcoming.r;
    return parsed[parsed.length - 1].r;
  }
  return list.length ? list[0] : null;
};

export default function ElderHome() {
  const navigation = useNavigation<ElderHomeNav>();

  // ⭐ 新增 userInfo 狀態
  const [userInfo, setUserInfo] = useState<MeInfo | null>(null);

  // 吃藥提醒
  const [medCards, setMedCards] = useState<Array<{ id: string; period: string; time?: string; meds: string[] }>>([]);
  const [showMedModal, setShowMedModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList<any>>(null);
  const [userName, setUserName] = useState<string>('使用者');
  const [syncing, setSyncing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ====== 使用者姓名：先快取再覆蓋；聚焦時校正 ======
  const fetchAndCacheName = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) return;

      const res = await axios.get<MeInfo>(`${BASE}/api/account/me/`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const name = (res.data?.Name || '').toString().trim();
      const uid = res.data?.UserID;

      if (name) {
        const cachedUid = await AsyncStorage.getItem('user_id');
        if (!cachedUid || cachedUid !== String(uid ?? '')) {
          await AsyncStorage.multiSet([
            ['user_id', String(uid ?? '')],
            ['user_name', name],
          ]);
        } else {
          await AsyncStorage.setItem('user_name', name);
        }
        setUserName(name);
      }
    } catch (err) {
      console.log('❌ 取得使用者資訊失敗:', err);
    }
  }, []);

  // 掛載：先讀快取避免空白，再打 API 覆蓋
  useEffect(() => {
    (async () => {
      try {
        const storedName = await AsyncStorage.getItem('user_name');
        if (storedName) setUserName(storedName);

        const token = await AsyncStorage.getItem('access');
        if (token) {
          const res = await axios.get(`${BASE}/api/account/me/`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.data?.Name) {
            setUserName(res.data.Name);
            await AsyncStorage.setItem('user_name', res.data.Name);
          }
        }
      } catch (err) {
        console.log('❌ 抓使用者姓名失敗:', err);
      }
    })();
  }, [fetchAndCacheName]);

  useFocusEffect(
    useCallback(() => {
      fetchAndCacheName();
    }, [fetchAndCacheName])
  );

  // ⭐ 取得 userInfo（含頭像與名稱）
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('access');
        if (!token) return;
        const res = await axios.get<MeInfo>(`${BASE}/api/account/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserInfo(res.data);
      } catch (err) {
        console.log('❌ 取得使用者資訊失敗:', err);
      }
    })();
  }, []);

  // Modal 控制
  const openMedModal = (startIndex = 0) => {
    setCurrentIndex(startIndex);
    setShowMedModal(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flatRef.current?.scrollToIndex({ index: startIndex, animated: false });
      });
    });
  };
  const closeMedModal = () => setShowMedModal(false);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('access');
      if (!token) return;
      try {
        const res = await axios.get(`${BASE}/api/get-med-reminders/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
        console.log('❌ 藥物提醒資料抓取失敗:', err);
      }
    })();
  }, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: SNAP, offset: SNAP * index, index }),
    []
  );

  const previewIndex = useMemo(() => getNextPreviewIndex(medCards), [medCards, tick]);
  const preview = previewIndex >= 0 ? medCards[previewIndex] : null;

  const [loading, setLoading] = useState(false);
  const [reminder, setReminder] = useState<HospitalRecord | null>(null);
  const [hint, setHint] = useState<string>('');
  const [visitCount, setVisitCount] = useState<number>(0);

  const loadReminder = useCallback(async () => {
    try {
      setLoading(true);
      setHint('');
      setReminder(null);
      setVisitCount(0);

      const token = await AsyncStorage.getItem('access');
      if (!token) { setHint('尚未登入'); return; }

      const elderId = await resolveElderId();
      const urls = [
        typeof elderId === 'number' && !Number.isNaN(elderId)
          ? `${BASE}/api/hospital/list/?user_id=${elderId}`
          : '',
        `${BASE}/api/hospital/list/`,
      ].filter(Boolean) as string[];

      let rows: HospitalRecord[] = [];
      for (const url of urls) {
        try {
          const res = await axios.get<HospitalRecord[]>(url, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          });
          const data = Array.isArray(res.data) ? res.data : [];
          if (data.length) { rows = data; break; }
        } catch {}
      }

      setVisitCount(rows.length);

      if (!rows.length) { setHint('尚無看診資料'); return; }

      const nearest = pickUpcomingNearest(rows);
      if (!nearest) { setHint('尚無看診資料'); return; }
      setReminder(nearest);
    } catch {
      setHint('載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminder();
    const unsub = navigation.addListener('focus', loadReminder);
    return unsub;
  }, [navigation, loadReminder]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          await setupNotificationChannel();
          await initMedicationNotifications();
          await initVisitNotifications();
        } catch (e) {
          console.log('init notifications error:', e);
        }
      })();
    }, [])
  );

  const displayDate = (iso?: string) => {
    const d = onlyDate(iso);
    const [y, m, dd] = d.split('-');
    if (!y || !m || !dd) return d || '—';
    return `${y}/${m}/${dd}`;
  };

  const askCallLogPermission = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('僅支援 Android', 'iOS 無法讀取通話紀錄');
      return false;
    }
    const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
    if (already) return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      {
        title: '需要通話紀錄權限',
        message: '用於將您的通話紀錄同步到後端，讓家人查看並協助辨識可疑來電。',
        buttonPositive: '同意',
        buttonNegative: '拒絕',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const handleSyncCalls = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      const ok = await askCallLogPermission();
      if (!ok) return;

      setSyncing(true);

      const access = await AsyncStorage.getItem('access');
      if (!access) {
        setSyncing(false);
        if (!silent) Alert.alert('尚未登入', '請先登入後再試。');
        return;
      }

      const raw = await CallLogs.loadAll();
      const lastTsStr = await AsyncStorage.getItem(LAST_UPLOAD_TS_KEY);
      const lastTs = Number(lastTsStr || 0);
      const isFirstSync = !lastTs || Number.isNaN(lastTs) || lastTs === 0;

      const mapped = raw
        .map((r: any) => {
          const tsNum = Number(r.timestamp || 0);
          return {
            phone: r.phoneNumber ?? '',
            name: r.name ?? '',
            type: mapType(r.type),
            timestamp: new Date(tsNum).toISOString(),
            duration: Number(r.duration || 0),
            _ts: tsNum,
            extra: { rawType: r.type },
          };
        })
        .filter(x => !!x.phone && x._ts > 0)
        .sort((a, b) => b._ts - a._ts);

      const items = isFirstSync
        ? mapped.slice(0, 100)
        : mapped.filter(x => x._ts > lastTs).slice(0, 500);

      if (items.length === 0) {
        setSyncing(false);
        if (!silent) Alert.alert('沒有新紀錄', '已經是最新狀態。');
        await AsyncStorage.setItem(LAST_SYNC_AT_KEY, String(Date.now()));
        return;
      }

      await axios.post(
        `${BASE}/api/call/upload/`,
        { records: items.map(({ _ts, ...rest }) => rest) },
        { headers: { Authorization: `Bearer ${access}` }, timeout: 10000 }
      );

      const maxTs = Math.max(...items.map(x => x._ts));
      await AsyncStorage.setItem(LAST_UPLOAD_TS_KEY, String(maxTs));
      await AsyncStorage.setItem(LAST_SYNC_AT_KEY, String(Date.now()));

      setSyncing(false);
      if (!silent) Alert.alert('上傳完成', `成功上傳 ${items.length} 筆`);
    } catch (e: any) {
      setSyncing(false);
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'unknown');
      if (!silent) Alert.alert('上傳失敗', msg);
    }
  };

  const autoSyncIfNeeded = useCallback(async (reason: string) => {
    try {
      const hasPerm = await askCallLogPermission();
      if (!hasPerm) return;

      const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_AT_KEY);
      const lastSyncAt = Number(lastSyncStr || 0);
      const now = Date.now();

      if (!syncing && (!lastSyncAt || now - lastSyncAt >= SYNC_MIN_INTERVAL_MS)) {
        console.log(`[CallSync] auto by ${reason}`);
        await handleSyncCalls({ silent: true });
      }
    } catch {}
  }, [syncing]);

  useEffect(() => {
    (async () => {
      await autoSyncIfNeeded('mount');
    })();

    syncTimerRef.current = setInterval(() => {
      autoSyncIfNeeded('interval');
    }, SYNC_MIN_INTERVAL_MS);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [autoSyncIfNeeded]);

  useFocusEffect(
    useCallback(() => {
      autoSyncIfNeeded('focus');
    }, [autoSyncIfNeeded])
  );

  // ⭐ 頭像來源與首字
  const avatarSrc = getAvatarSource(userInfo?.avatar);
  const initial = userInfo?.Name?.[0] ?? '人';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* 上半：使用者列 */}
      <View style={styles.topArea}>
        <View style={styles.userCard}>
          {/* ⭐ 頭像顯示 */}
          {avatarSrc ? (
            <Image
              source={avatarSrc}
              style={styles.userIcon}
              defaultSource={getAvatarSource('grandpa.png')}
              onError={e => console.log('[ElderHome] 頭像載入失敗:', userInfo?.avatar, e.nativeEvent.error)}
            />
          ) : (
            <View style={[styles.userIcon, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{userInfo?.Name || '長者'}</Text>
          </View>
        </View>
      </View>

      {/* 下半內容（panel、ScrollView、卡片等）維持原樣 */}
      <View style={styles.panel}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
          style={{ flex: 1 }}
        >
          {/* 回診資料卡片（可點擊進列表 + 顯示總筆數） */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.rowCard, styles.cardShadow, { backgroundColor: COLORS.red }]}
            onPress={() => navigation.navigate('ElderHospitalList' as never)}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.rowTitle, { color: COLORS.white }]}>回診資料</Text>
              <View style={styles.countBadge}>
                <MaterialIcons name="list" size={16} color={COLORS.black} />
                <Text style={styles.countText}>共 {visitCount} 筆</Text>
              </View>
            </View>

            <View style={[styles.noteBox, { backgroundColor: COLORS.white }]}>
              {loading ? (
                <Text style={[styles.notePlaceholder, { color: COLORS.textMid }]}>載入中…</Text>
              ) : reminder ? (
                <>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="schedule" size={22} color={COLORS.textMid} />
                    <Text style={styles.infoText}>{displayDate(reminder.ClinicDate)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="place" size={22} color={COLORS.textMid} />
                    <Text style={styles.infoText}>{reminder.ClinicPlace}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <FontAwesome name="user-md" size={20} color={COLORS.textMid} />
                    <Text style={styles.infoText}>{reminder.Doctor}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="confirmation-number" size={22} color={COLORS.textMid} />
                    <Text style={styles.infoText}>{reminder.Num ?? '—'}</Text>
                  </View>
                </>
              ) : (
                <Text style={[styles.notePlaceholder, { color: COLORS.textMid }]}>{hint || '—'}</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* 吃藥提醒 */}
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!preview}
            onPress={() => {
              if (previewIndex >= 0) {
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
              { backgroundColor: COLORS.green, opacity: preview ? 1 : 0.5 },
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
                        <Text style={[styles.miniPillText, { fontWeight: '900' }]}>
                          +{preview.meds.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <Text style={styles.notePlaceholder}>尚無資料</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* 健康狀況 */}
          <View style={styles.topGrid}>
            <TouchableOpacity
              style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.cream }]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ElderlyHealth' as never)}
            >
              <Text style={[styles.squareTitle, { color: COLORS.black }]}>健康狀況</Text>
              <View style={styles.squareBottomRow}>
                <View style={[styles.iconCircle, { backgroundColor: COLORS.black }]}>
                  <MaterialIcons name="favorite" size={25} color={COLORS.lightred} />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* 即時位置 */}
          <View style={styles.topGrid}>
            <TouchableOpacity
              style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.green }]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ElderLocation' as never)}
            >
              <Text style={[styles.squareTitle, { color: COLORS.white }]}>即時位置</Text>
              <View style={styles.squareBottomRow}>
                <View style={[styles.iconCircle, { backgroundColor: COLORS.white }]}>
                  <MaterialIcons name="location-on" size={25} color={COLORS.green} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View pointerEvents="box-none" style={styles.fabWrap}>
          <View style={styles.fabRow}>
            <TouchableOpacity
              style={styles.fab}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ElderlyUpload' as never)}
            >
              <Feather name="camera" size={38} color={COLORS.white} />
              <Text style={styles.fabText}>拍照</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={showMedModal} transparent animationType="fade" onRequestClose={() => setShowMedModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMedModal(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.modalCenter} pointerEvents="box-none">
          <View style={styles.modalCardWrap}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowMedModal(false)} activeOpacity={0.9}>
              <Feather name="x" size={22} color={COLORS.black} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setCurrentIndex((i) => {
                  const next = Math.max(0, i - 1);
                  flatRef.current?.scrollToIndex({ index: next, animated: true });
                  return next;
                });
              }}
              style={[styles.navArrow, { left: -12, opacity: currentIndex === 0 ? 0.3 : 1 }]}
              disabled={currentIndex === 0}
              activeOpacity={0.8}
            >
              <Feather name="chevron-left" size={28} color={COLORS.black} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setCurrentIndex((i) => {
                  const next = Math.min(medCards.length - 1, i + 1);
                  flatRef.current?.scrollToIndex({ index: next, animated: true });
                  return next;
                });
              }}
              style={[
                styles.navArrow,
                { right: -12, opacity: currentIndex === medCards.length - 1 ? 0.3 : 1 },
              ]}
              disabled={currentIndex === medCards.length - 1}
              activeOpacity={0.8}
            >
              <Feather name="chevron-right" size={28} color={COLORS.black} />
            </TouchableOpacity>
            <FlatList
              ref={flatRef}
              data={medCards}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled={false}
              snapToInterval={SNAP}
              decelerationRate="fast"
              snapToAlignment="start"
              showsHorizontalScrollIndicator={false}
              getItemLayout={getItemLayout}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP);
                setCurrentIndex(Math.max(0, Math.min(idx, medCards.length - 1)));
              }}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              renderItem={({ item }) => (
                <View style={[styles.medCard, styles.cardShadow]}>
                  <View style={styles.medHeader}>
                    <Text style={styles.medPeriod}>{item.period}</Text>
                    <Text style={styles.medTime}>{item.time}</Text>
                  </View>
                  <ScrollView style={styles.medScroll} contentContainerStyle={styles.medList}>
                    {item.meds.map((m, i) => (
                      <View key={i} style={styles.medPill}>
                        <MaterialIcons name="medication" size={18} color={COLORS.black} />
                        <Text style={styles.medPillText}>{m}</Text>
                      </View>
                    ))}
                    {item.meds.length === 0 && (
                      <Text style={{ fontSize: 16, color: COLORS.textMid }}>此時段沒有藥物</Text>
                    )}
                  </ScrollView>
                  <TouchableOpacity style={styles.okBtn} onPress={() => setShowMedModal(false)} activeOpacity={0.9}>
                    <Text style={styles.okBtnText}>知道了</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            <View style={styles.dots}>
              {medCards.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { opacity: i === currentIndex ? 1 : 0.35, width: i === currentIndex ? 16 : 8 },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const IMAGE_SIZE = 80;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
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
  userIcon: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: IMAGE_SIZE / 2, marginRight: 12, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  avatarFallback: { backgroundColor: '#BBB', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, color: COLORS.white, fontWeight: '900' },
  userName: { color: COLORS.white, fontSize: 35, fontWeight: '900' },
  panel: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  topGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  squareCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    height: 140,
    justifyContent: 'space-between',
  },
  squareTitle: { fontSize: 30, fontWeight: '900' },
  squareBottomRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  iconCircle: { width: 50, height: 50, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  rowCard: { borderRadius: 18, padding: 14, minHeight: 108, marginBottom: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 30, fontWeight: '900', color: COLORS.textDark },
  noteBox: { marginTop: 10, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  notePlaceholder: { fontSize: 30, fontWeight: '800', color: COLORS.textMid },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.white,
  },
  countText: { fontSize: 14, fontWeight: '900', color: COLORS.black },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 24, fontWeight: '800', color: COLORS.textMid },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: 10, alignItems: 'center' },
  fabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  fab: {
    width: 115,
    height: 115,
    borderRadius: 65,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  fabText: { color: COLORS.white, fontSize: 25, fontWeight: '900', marginTop: 6 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalCenter: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14 },
  modalCardWrap: { width: CARD_W + 24, alignItems: 'center' },
  closeBtn: { position: 'absolute', top: -6, right: -6, zIndex: 10, backgroundColor: '#F2F2F2', borderRadius: 18, padding: 8, elevation: 3 },
  navArrow: { position: 'absolute', top: '50%', transform: [{ translateY: -16 }], zIndex: 5, backgroundColor: '#F6F6F6', borderRadius: 999, padding: 6, elevation: 2 },
  medCard: { width: CARD_W, marginHorizontal: 12, backgroundColor: '#FFF', borderRadius: 20, padding: 18 },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  medPeriod: { fontSize: 29, fontWeight: '900', color: COLORS.black },
  medTime: { fontSize: 25, fontWeight: '900', color: COLORS.textMid },
  medScroll: { maxHeight: 260 },
  medList: { gap: 10, paddingBottom: 4 },
  medPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F7F9FB', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  medPillText: { fontSize: 25, fontWeight: '700', color: COLORS.textDark },
  okBtn: { marginTop: 4, backgroundColor: COLORS.black, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  okBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 12, justifyContent: 'center' },
  dot: { height: 8, borderRadius: 999, backgroundColor: COLORS.black, width: 8 },
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