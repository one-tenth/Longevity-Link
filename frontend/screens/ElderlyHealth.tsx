// screens/ElderlyHealth.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import GoogleFit, { Scopes } from 'react-native-google-fit';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type ElderlyHealthNavProp = StackNavigationProp<RootStackParamList, 'ElderlyHealth'>;

// ===== 基本設定 =====
const BASE_URL = 'http://172.20.10.8:8000';

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#87adffff',
  lightred: '#006d21ff',
  gray: '#E9E9E9',
};

// YYYY-MM-DD 格式化函數
function formatDateYYYYMMDD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type PeriodKey = 'morning' | 'evening';

type BpRecord = {
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  captured_at?: string | null;
} | null;

type BpAll = {
  morning: BpRecord;
  evening: BpRecord;
};

export default function ElderlyHealth() {
  console.log('[ElderlyHealth mounted @', Date.now(), ']');

  const navigation = useNavigation<ElderlyHealthNavProp>();

  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // ✅ 使用者姓名（新增）
  const [userName, setUserName] = useState<string>('');

  // ✅ 當天所有時段血壓（一次撈回 morning/evening）
  const [bpAll, setBpAll] = useState<BpAll>({ morning: null, evening: null });
  // ✅ 目前顯示的時段
  const [period, setPeriod] = useState<PeriodKey>('morning');

  // 按目前時段取對應顯示值
  const bpData = useMemo(() => {
    return bpAll[period] ?? null;
  }, [bpAll, period]);

  // ------- 權限（Android 10+ 要求活動辨識） -------
  const requestActivityPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 29) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: '需要活動辨識權限',
          message: '我們需要讀取您的步數資料來顯示健康資訊。',
          buttonPositive: '同意',
          buttonNegative: '拒絕',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  // ------- 上傳步數到後端（✅ 只送 date 與 steps） -------
  const uploadStepsToBackend = async (steps: number, dateStr: string) => {
    const token = await AsyncStorage.getItem('access');
    if (!token) return;
    try {
      const payload = { steps, date: dateStr };
      const res = await axios.post(`${BASE_URL}/api/fitdata/`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('✅ 步數成功上傳：', res.data);
    } catch (err: any) {
      console.error('❌ 步數上傳失敗：', err?.response?.data ?? err);
    }
  };

  // ------- 查詢血壓（一次拿到 morning + evening） -------
  const fetchBloodPressureAll = async (date: Date) => {
    const token = await AsyncStorage.getItem('access');
    if (!token) return;

    const dateStr = formatDateYYYYMMDD(date);
    try {
      const response = await axios.get(`${BASE_URL}/api/healthcare/by-date/`, {
        params: { date: dateStr },
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data || {};
      console.log('[bp api]', data); // 🔎 debug
      setBpAll({
        morning: data.morning ?? null,
        evening: data.evening ?? null,
      });
      setError('');
    } catch (e: any) {
      if (e?.response?.status === 401) {
        console.warn('血壓 API 401：token 可能過期');
      }
      if (e?.response?.status === 404) {
        console.log('ℹ️ 當天無血壓紀錄');
        setBpAll({ morning: null, evening: null });
        setError('');
      } else if (e?.response?.data) {
        console.error('❌ 查詢血壓失敗:', e.response.data);
        setError(String(e.response.data?.error || '查詢血壓時發生錯誤'));
      } else {
        console.error('❌ 查詢血壓失敗:', e);
        setError('查詢血壓時發生錯誤');
      }
    }
  };

  // ------- 取得步數（指定日期 00:00~23:59）並上傳 -------
  const fetchSteps = (date: Date) => {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    GoogleFit.getDailyStepCountSamples(options)
      .then(results => {
        const fitData = results.find(r => r.source === 'com.google.android.gms:estimated_steps');
        const fallbackDateStr = formatDateYYYYMMDD(startDate);

        if (fitData && Array.isArray(fitData.steps)) {
          const s = fitData.steps.find(x => x.date === fallbackDateStr);
          if (s) {
            setTodaySteps(s.value);
            setError('');
            uploadStepsToBackend(s.value, s.date); // 用 Google Fit 的日期字串
          } else {
            setTodaySteps(0);
            setError('');
            uploadStepsToBackend(0, fallbackDateStr);
          }
        } else {
          setTodaySteps(0);
          setError('');
          uploadStepsToBackend(0, fallbackDateStr);
        }
      })
      .catch(err => {
        console.error('步數讀取錯誤', err);
        setError('取得步數錯誤');
      })
      .finally(() => {
        // ✅ 無論步數成功與否，都撈血壓
        fetchBloodPressureAll(date);
      });
  };

  // ------- 初始化：權限 + Google Fit 授權 + 取資料 -------
  useEffect(() => {
    requestActivityPermission().then(granted => {
      if (!granted) {
        setError('未授權活動辨識權限');
        return;
      }
      GoogleFit.authorize({ scopes: [Scopes.FITNESS_ACTIVITY_READ] })
        .then(result => {
          if (result.success) {
            fetchSteps(selectedDate);
          } else {
            setError('Google Fit 授權失敗');
          }
        })
        .catch(() => setError('Google Fit 授權失敗'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------- 載入目前登入者姓名（新增） -------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 先用快取
        const cached = await AsyncStorage.getItem('user_name');
        if (cached && alive) setUserName(cached);

        // 再向後端確認最新姓名
        const token = await AsyncStorage.getItem('access');
        if (!token) return;
        const res = await axios.get(`${BASE_URL}/api/account/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const name = res?.data?.Name ?? res?.data?.name;
        if (name && alive) {
          setUserName(name);
          await AsyncStorage.setItem('user_name', name);
        }
      } catch (err) {
        console.log('❌ 抓使用者名稱失敗:', err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ 切換日期就重新取資料
  const onPickDate = (date: Date) => {
    setSelectedDate(date);
    fetchSteps(date); // 會連帶呼叫 fetchBloodPressureAll
  };

  // ✅ 切換時段只換顯示，不打 API
  const onChangePeriod = (p: PeriodKey) => {
    console.log('[period change]', p, 'data =', bpAll?.[p]); // 🔎 debug
    setPeriod(p);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* 上半：使用者列 */}
      <View style={styles.topArea}>
        <View style={styles.userCard}>
          <Image source={require('../img/elderlyhome/grandpa.png')} style={styles.userIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{userName || '使用者'}</Text>
          </View>
        </View>
      </View>

      {/* 下半：白色圓角面板 */}
      <View style={styles.panel}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 160 }}
          style={{ flex: 1 }}
        >
          <Text style={styles.pageTitle}>健康狀況</Text>

          {/* ======== 強制可見：時段切換（放在標題下方） ======== */}
          <View style={styles.segmentWrapStrong}>
            <TouchableOpacity
              testID="btn-morning"
              onPress={() => onChangePeriod('morning')}
              activeOpacity={0.9}
              style={[
                styles.segmentBtnStrong,
                { marginRight: 6, backgroundColor: period === 'morning' ? COLORS.green : COLORS.white },
              ]}
            >
              <Text style={styles.segmentStrongText}>🌅 早上</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="btn-evening"
              onPress={() => onChangePeriod('evening')}
              activeOpacity={0.9}
              style={[
                styles.segmentBtnStrong,
                { marginLeft: 6, backgroundColor: period === 'evening' ? COLORS.green : COLORS.white },
              ]}
            >
              <Text style={styles.segmentStrongText}>🌙 晚上</Text>
            </TouchableOpacity>
          </View>

          {/* 日期選擇 */}
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
            <Text>📅 選擇日期（目前：{formatDateYYYYMMDD(selectedDate)}）</Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowPicker(false);
                if (date) onPickDate(date);
              }}
            />
          )}

          {/* 步數卡片 */}
          <View style={[styles.infoCard, styles.cardShadow, { backgroundColor: COLORS.cream }]}>
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>今日步數</Text>
              <MaterialCommunityIcons name="foot-print" size={32} color={COLORS.black} />
            </View>
            <View style={styles.valueBoxLight}>
              <Text style={styles.cardValue}>
                {todaySteps !== null ? `${todaySteps} 步` : '載入中...'}
              </Text>
            </View>
          </View>

          {error ? <Text style={{ color: 'red', marginBottom: 10 }}>❌ {error}</Text> : null}

          {/* 血壓卡片（依據目前時段顯示） */}
          <View style={[styles.infoCard, styles.cardShadow, { backgroundColor: COLORS.lightred }]}>
            <View style={styles.cardRow}>
              <Text style={[styles.cardTitle, { color: COLORS.white }]}>
                血壓/脈搏（{period === 'morning' ? '早上' : '晚上'}）
              </Text>
              <MaterialCommunityIcons name="heart-pulse" size={32} color={COLORS.white} />
            </View>
            <View style={styles.valueBoxDark}>
              <Text style={[styles.cardValue, { color: COLORS.black }]}>
                收縮壓：{bpData?.systolic ?? '未紀錄'}
              </Text>
              <Text style={[styles.cardValue, { color: COLORS.black }]}>
                舒張壓：{bpData?.diastolic ?? '未紀錄'}
              </Text>
              <Text style={[styles.cardValue, { color: COLORS.black }]}>
                脈搏：{bpData?.pulse ?? '未紀錄'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* 底部圓形回首頁按鈕 */}
      <View pointerEvents="box-none" style={styles.fabWrap}>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('ElderHome' as never)}
        >
          <MaterialIcons name="home" size={80} color={COLORS.white} />
        </TouchableOpacity>
      </View>
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
  pageTitle: { fontSize: 38, fontWeight: '900', marginBottom: 12, color: COLORS.textDark },

  // ===== 強制可見版 Segmented（放標題下） =====
  segmentWrapStrong: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: '#131313ff',
    borderColor: '#000',
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    gap: 12,
  },
  segmentBtnStrong: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#000',
  },
  segmentStrongText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111',
  },
  segmentHint: {
    alignSelf: 'center',
    marginBottom: 10,
    color: COLORS.textMid,
    fontWeight: '700',
  },

  // ===== 既有樣式 =====
  dateButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  infoCard: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.black,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  valueBoxLight: {
    marginTop: 8,
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  valueBoxDark: {
    marginTop: 8,
    backgroundColor: '#FFFFFFDD',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 6,
  },

  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: 'center',
  },
  fab: {
    width: 110,
    height: 110,
    borderRadius: 60,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 10,
  },
});
