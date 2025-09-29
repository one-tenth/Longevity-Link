// screens/ElderHome.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
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
  ActivityIndicator,
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
import { setupNotificationChannel, initMedicationNotifications } from '../utils/initNotification';
import ElderLocation from './ElderLocation';
import { getAvatarSource } from '../utils/avatarMap'; // ⭐ 加入頭像來源工具

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

// ---- Utils ----
const pad = (n: number) => String(n).padStart(2, '0');

// 依現在時間，從 medCards 中挑「下一筆有藥」的原陣列索引
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

// ---- Period label mapping (EN -> ZH) ----
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

  const hasBefore = tokens.includes('before') || tokens.includes('pre') || tokens.includes('premeal') || tokens.includes('pre') || tokens.includes('pre_meal');
  const hasAfter  = tokens.includes('after')  || tokens.includes('post') || tokens.includes('postmeal') || tokens.includes('post') || tokens.includes('post_meal');
  const mealMap: Record<string, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', meal: '飯' };
  const mealToken = tokens.find(t => mealMap[t]);
  if (mealToken) {
    const mealZh = mealMap[mealToken];
    if (hasBefore) return `${mealZh}前`;
    if (hasAfter)  return `${mealZh}後`;
  }

  for (const t of tokens) {
    if (PERIOD_LABELS[t]) return PERIOD_LABELS[t];
  }

  return key;
}

// ---- API base ----
const BASE = 'http://192.168.0.24:8000';

// ✅ 通話同步常數 / 工具
const LAST_UPLOAD_TS_KEY = 'calllog:last_upload_ts';
const LAST_SYNC_AT_KEY   = 'calllog:last_sync_at';
const SYNC_MIN_INTERVAL_MS = 1 * 60 * 1000; // ← 每 1 分鐘自動同步一次

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

// ---- Types ----
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

// 解析 elderId：優先 localStorage('elder_id') → /api/account/me/ 的 RelatedID
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

// ===== 日期處理（修正版，支援多種格式） =====
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

// ===== 取最近看診資料（修正版） =====
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

  // 吃藥提醒
  const [medCards, setMedCards] = useState<Array<{ id: string; period: string; time?: string; meds: string[] }>>([]);
  const [showMedModal, setShowMedModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList<any>>(null);
  const [userName, setUserName] = useState<string>('使用者');

  // ⭐ 新增：使用者頭像字串（URL 或 檔名）
  const [avatar, setAvatar] = useState<string | null>(null);

  // ✅ 同步通話 loading 狀態
  const [syncing, setSyncing] = useState(false);

  // 每 60 秒刷新一次「下一筆吃藥」
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // 用於自動同步的計時器參考
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ====== 使用者姓名/頭像：先顯示快取，再以後端覆蓋；聚焦時再校正 ======
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
      const avatarUrl = (res.data?.avatar_url ?? res.data?.avatar) || null;

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

      if (avatarUrl) {
        setAvatar(avatarUrl);
        await AsyncStorage.setItem('user_avatar', String(avatarUrl));
      }
    } catch (err) {
      console.log('❌ 取得使用者資訊失敗:', err);
    }
  }, []);

  // 掛載時：先讀快取避免空白，再打 API 覆蓋
  useEffect(() => {
    (async () => {
      try {
        const storedName = await AsyncStorage.getItem('user_name');
        if (storedName) setUserName(storedName);

        const storedAvatar = await AsyncStorage.getItem('user_avatar');
        if (storedAvatar) setAvatar(storedAvatar);

        const token = await AsyncStorage.getItem('access');
        if (token) {
          const res = await axios.get(`${BASE}/api/account/me/`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.data?.Name) {
            setUserName(res.data.Name);
            await AsyncStorage.setItem('user_name', res.data.Name);
          }

          const avatarUrl = res.data?.avatar_url ?? res.data?.avatar;
          if (avatarUrl) {
            setAvatar(avatarUrl);
            await AsyncStorage.setItem('user_avatar', String(avatarUrl));
          }
        }
      } catch (err) {
        console.log('❌ 抓使用者姓名/頭像失敗:', err);
      }
    })();
  }, [fetchAndCacheName]);

  // 聚焦時再校正（回到此頁就更新）
  useFocusEffect(
    useCallback(() => {
      fetchAndCacheName();
    }, [fetchAndCacheName])
  );

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
  const goPrev = () => currentIndex > 0 && setCurrentIndex((i) => i - 1);
  const goNext = () => currentIndex < medCards.length - 1 && setCurrentIndex((i) => i + 1);

  // 抓藥物提醒（period 轉中文）
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

  // 看診提醒
  const [loading, setLoading] = useState(false);
  const [reminder, setReminder] = useState<HospitalRecord | null>(null);
  const [hint, setHint] = useState<string>('');

  const loadReminder = useCallback(async () => {
    try {
      setLoading(true);
      setHint('');
      setReminder(null);

      const token = await AsyncStorage.getItem('access');
      if (!token) { setHint('尚未登入'); return; }

      const elderId = await resolveElderId();
      if (typeof elderId !== 'number' || Number.isNaN(elderId)) {
        setHint('找不到長者身分');
        return;
      }

      const urls = [
        `${BASE}/api/hospital/list/?user_id=${elderId}`,
        `${BASE}/api/hospital/list/`,
      ];

      let rows: HospitalRecord[] = [];
      for (const url of urls) {
        try {
          console.log('[ElderHome] fetch:', url);
          const res = await axios.get<HospitalRecord[]>(url, {
            headers: { Authorization: { toString: () => `Bearer ${token}` } as any, Authorization_: `Bearer ${token}` }, // 安全起見的 header 容錯
            timeout: 10000,
          });
          const data = Array.isArray(res.data) ? res.data : [];
          console.log('[ElderHome] got count:', data.length);
          if (data.length) { rows = data; break; }
        } catch (e) {
          console.log('[ElderHome] fetch fail for', url);
        }
      }

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

  // ✅ 初始化通知排程
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          await setupNotificationChannel();
          const result = await initMedicationNotifications();
          console.log('ElderHome init notifications:', result);
        } catch (e) {
          console.log('initMedicationNotifications error:', e);
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

  // ===== 權限檢查（先 check 再 request）=====
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

  // ✅ 同步通話紀錄（支援靜默模式）
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

      // 讀取本機通話紀錄
      const raw = await CallLogs.loadAll();

      // 取得上次同步點（毫秒）
      const lastTsStr = await AsyncStorage.getItem(LAST_UPLOAD_TS_KEY);
      const lastTs = Number(lastTsStr || 0);
      const isFirstSync = !lastTs || Number.isNaN(lastTs) || lastTs === 0;

      // 轉換 → 過濾無號碼/無時間 → 依時間新→舊排序
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
        // 更新「上次嘗試同步時間」
        await AsyncStorage.setItem(LAST_SYNC_AT_KEY, String(Date.now()));
        return;
      }

      await axios.post(
        `${BASE}/api/call/upload/`,
        {
          records: items.map(({ _ts, ...rest }) => rest),
        },
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

  // 判斷距離上次同步是否已超過最小間隔，若是就靜默同步
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

  // 掛載：先嘗試一次自動同步，並啟動每 1 分鐘檢查一次
  useEffect(() => {
    (async () => {
      await autoSyncIfNeeded('mount');
    })();

    // 啟動輪詢
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

  // 回到此頁（聚焦）時再嘗試一次
  useFocusEffect(
    useCallback(() => {
      autoSyncIfNeeded('focus');
    }, [autoSyncIfNeeded])
  );

  // ⭐ 計算實際要餵給 <Image> 的來源（URL/檔名 轉 source）
  const avatarSrc =
    (getAvatarSource(avatar) as any) || require('../img/elderlyhome/grandpa.png');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* 上半：使用者列 */}
      <View style={styles.topArea}>
        <View style={styles.userCard}>
          <Image
            source={avatarSrc}
            style={styles.userIcon}
            onError={() => setAvatar(null)}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{userName}</Text>
          </View>
        </View>
      </View>

      {/* 下半：白色圓角面板 */}
      <View style={styles.panel}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
          style={{ flex: 1 }}
        >
          {/* 看診提醒（動態） */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.rowCard, styles.cardShadow, { backgroundColor: COLORS.red }]}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.rowTitle, { color: COLORS.white }]}>看診提醒</Text>
              <FontAwesome name="hospital-o" size={28} color={COLORS.white} />
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
                  {/* ⭐ 新增：看診號碼 Num */}
                  <View style={styles.infoRow}>
                    <MaterialIcons name="confirmation-number" size={22} color={COLORS.textMid} />
                    <Text style={styles.infoText}>
                      {reminder.Num ?? '—'}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={[styles.notePlaceholder, { color: COLORS.textMid }]}>{hint || '—'}</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* ===== 吃藥提醒（改成第二支樣式） ===== */}
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!preview}
            onPress={() => {
              if (previewIndex >= 0) {
                openMedModal(previewIndex);
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

          {/* 定位狀況 */}
          <View style={styles.topGrid}>
            <TouchableOpacity
              style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.green }]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ElderLocation' as never)}  // 👈 跳去 ElderLocation
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

        {/* ✅ 底部兩顆 FAB：左「同步通話」、右「拍照」 */}
        <View pointerEvents="box-none" style={styles.fabWrap}>
          <View style={styles.fabRow}>
            

            {/* 拍照 */}
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

      {/* ====== 吃藥提醒浮層（可左右滑動） ====== */}
      <Modal visible={showMedModal} transparent animationType="fade" onRequestClose={closeMedModal}>
        {/* 半透明暗背景，點擊可關閉 */}
        <TouchableWithoutFeedback onPress={closeMedModal}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* 中央卡片區域 */}
        <View style={styles.modalCenter} pointerEvents="box-none">
          <View style={styles.modalCardWrap}>
            {/* 關閉按鈕 */}
            <TouchableOpacity style={styles.closeBtn} onPress={closeMedModal} activeOpacity={0.9}>
              <Feather name="x" size={22} color={COLORS.black} />
            </TouchableOpacity>

            {/* 上/下一頁箭頭 */}
            <TouchableOpacity
              onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              style={[styles.navArrow, { left: -12, opacity: currentIndex === 0 ? 0.3 : 1 }]}
              disabled={currentIndex === 0}
              activeOpacity={0.8}
            >
              <Feather name="chevron-left" size={28} color={COLORS.black} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCurrentIndex((i) => Math.min(medCards.length - 1, i + 1))}
              style={[
                styles.navArrow,
                { right: -12, opacity: currentIndex === medCards.length - 1 ? 0.3 : 1 },
              ]}
              disabled={currentIndex === medCards.length - 1}
              activeOpacity={0.8}
            >
              <Feather name="chevron-right" size={28} color={COLORS.black} />
            </TouchableOpacity>

            {/* 可滑動卡片 */}
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

                  {/* 卡片內垂直滾動的藥品清單 */}
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

                  <TouchableOpacity style={styles.okBtn} onPress={closeMedModal} activeOpacity={0.9}>
                    <Text style={styles.okBtnText}>知道了</Text>
                  </TouchableOpacity>
                </View>
              )}
            />

            {/* 指示點 */}
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
  userIcon: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: IMAGE_SIZE / 2 },
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

  // 看診提醒分行顯示
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 24, fontWeight: '800', color: COLORS.textMid },

  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: 10, alignItems: 'center' },

  // 兩顆 FAB 橫排
  fabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  // 右邊原拍照 FAB
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

  // 左邊同步通話的小顆 FAB
  fabSmall: {
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
  fabSmallText: {
    color: COLORS.white, fontSize: 20, fontWeight: '900', marginTop: 6
  },

  // Modal
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

  // 吃藥提醒卡片內預覽小藥丸
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
