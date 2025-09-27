// screens/ElderlyHealth.tsx
import React, { useEffect, useState } from 'react';
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
  Alert,
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
const BASE_URL = 'http://192.168.0.91:8000'; // 模擬器改成 http://10.0.2.2:8000

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
  lightred: '#D67C78',
};

// YYYY-MM-DD
function formatDateYYYYMMDD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ElderlyHealth() {
  const navigation = useNavigation<ElderlyHealthNavProp>();

  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [bpData, setBpData] = useState<{ systolic: number; diastolic: number; pulse: number } | null>(null);
  const [userName, setUserName] = useState<string>('使用者');

    // ------- 抓使用者名稱 -------
  useEffect(() => {
    (async () => {
      try {
        const storedName = await AsyncStorage.getItem('user_name');
        if (storedName) {
          setUserName(storedName);
        } else {
          const token = await AsyncStorage.getItem('access');
          if (token) {
            const res = await axios.get(`${BASE_URL}/api/account/me/`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data?.Name) {
              setUserName(res.data.Name);
              await AsyncStorage.setItem('user_name', res.data.Name);
            }
          }
        }
      } catch (err) {
        console.log('❌ 抓使用者名稱失敗:', err);
      }
    })();
  }, []);

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

  // ------- 上傳步數到後端 -------
  const uploadStepsToBackend = async (steps: number, timestamp: Date) => {
    const token = await AsyncStorage.getItem('access');
    if (!token) return;
    try {
      const response = await axios.post(
        'http://192.168.1.106:8000/api/fitdata/',
        { steps, timestamp: timestamp.toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ 步數成功上傳：', res.data);
    } catch (err: any) {
      console.error('❌ 步數上傳失敗：', err?.response?.data ?? err);
    }
  };

  // ------- 查詢血壓(以 YYYY-MM-DD) -------
  const fetchBloodPressure = async (date: Date) => {
    const token = await AsyncStorage.getItem('access');
    if (!token) return;

    const dateStr = formatDateYYYYMMDD(date);
    try {
      const response = await axios.get(
        `http://192.168.1.106:8000/api/healthcare/by-date/?date=${dateStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data) {
        setBpData({
          systolic: response.data.systolic,
          diastolic: response.data.diastolic,
          pulse: response.data.pulse,
        });
      } else {
        setBpData(null);
      }
    } catch (e: any) {
      if (e?.response?.status === 404) {
        console.log('ℹ️ 當天無血壓紀錄');
        setBpData(null);
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
        // Google Fit 常見來源：'com.google.android.gms:estimated_steps'
        const fitData = results.find(r => r.source === 'com.google.android.gms:estimated_steps');
        const targetDateStr = formatDateYYYYMMDD(startDate); // 用我們的格式統一比對

        const noonDate = new Date(startDate);
        noonDate.setHours(12, 0, 0, 0); // 上傳用固定時間點

        if (fitData && Array.isArray(fitData.steps)) {
          const stepData = fitData.steps.find(s => s.date === targetDateStr);
          if (stepData) {
            setTodaySteps(stepData.value);
            setError('');
            uploadStepsToBackend(stepData.value, noonDate);
          } else {
            setTodaySteps(0);
            setError('');
            uploadStepsToBackend(0, noonDate);
          }
        } else {
          setTodaySteps(0);
          setError('');
          uploadStepsToBackend(0, noonDate);
        }

        // 取完步數後順道查血壓
        fetchBloodPressure(date);
      })
      .catch(err => {
        console.error('步數讀取錯誤', err);
        setError('取得步數錯誤');
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* 上半：使用者列 */}
      <View style={styles.topArea}>
        <View style={styles.userCard}>
          <Image source={require('../img/elderlyhome/grandpa.png')} style={styles.userIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{userName}</Text>
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
                if (date) {
                  setSelectedDate(date);
                  fetchSteps(date);
                }
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

          {/* 血壓卡片 */}
          <View style={[styles.infoCard, styles.cardShadow, { backgroundColor: COLORS.lightred }]}>
            <View style={styles.cardRow}>
              <Text style={[styles.cardTitle, { color: COLORS.white }]}>血壓/脈搏</Text>
              <MaterialCommunityIcons name="heart-pulse" size={32} color={COLORS.white} />
            </View>
            <View style={styles.valueBoxDark}>
              <Text style={[styles.cardValue, { color: COLORS.black }]}>
                收縮壓：{bpData ? bpData.systolic : '未紀錄'}
              </Text>
              <Text style={[styles.cardValue, { color: COLORS.black }]}>
                舒張壓：{bpData ? bpData.diastolic : '未紀錄'}
              </Text>
              <Text style={[styles.cardValue, { color: COLORS.black }]}>
                脈搏：{bpData ? bpData.pulse : '未紀錄'}
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
  pageTitle: { fontSize: 38, fontWeight: '900', marginBottom: 20, color: COLORS.textDark },
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
