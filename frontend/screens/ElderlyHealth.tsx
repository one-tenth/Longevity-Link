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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import GoogleFit, { Scopes } from 'react-native-google-fit';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// 保留舊的 MaterialIcons（給底部 home FAB 用）
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// 新增：改用 MaterialCommunityIcons 畫卡片上的圖示
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type ElderlyHealthNavProp = StackNavigationProp<RootStackParamList, 'ElderlyHealth'>;

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
  lightred: '#D67C78',
  red: '#FF4C4C',
  yellow: '#F4C80B',
  orange: '#F58402',
};

export default function ElderlyHealth() {
  const navigation = useNavigation<ElderlyHealthNavProp>();

  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [bpData, setBpData] = useState<{ systolic: number; diastolic: number; pulse: number } | null>(null);

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

  const uploadStepsToBackend = async (steps: number, timestamp: Date) => {
    const token = await AsyncStorage.getItem('access');
    if (!token) return;
    try {
      const response = await axios.post(
        'http://10.2.61.2:8000/api/fitdata/',
        { steps, timestamp: timestamp.toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ 步數成功上傳：', response.data);
    } catch (err: any) {
      console.error('❌ 步數上傳失敗：', err?.response?.data ?? err);
    }
  };

  const fetchBloodPressure = async (date: Date) => {
    const token = await AsyncStorage.getItem('access');
    if (!token) return;
    const dateStr = date.toLocaleDateString('sv-SE');
    try {
      const response = await axios.get(
        `http://10.2.61.2:8000/api/healthcare/by-date/?date=${dateStr}`,
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
    } catch (error: any) {
      if (error?.response?.status === 404) {
        console.log('ℹ️ 當天無血壓紀錄');
        setBpData(null);
      } else {
        console.error('❌ 查詢血壓失敗:', error?.response?.data ?? error);
        setError('查詢血壓時發生錯誤');
      }
    }
  };

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
        const noonDate = new Date(startDate);
        noonDate.setHours(12, 0, 0, 0);

        if (fitData && fitData.steps) {
          const targetDateStr = startDate.toLocaleDateString('sv-SE');
          const stepData = fitData.steps.find(step => step.date === targetDateStr);

          if (stepData) {
            const steps = stepData.value;
            setTodaySteps(steps);
            setError('');
            uploadStepsToBackend(steps, noonDate);
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

        fetchBloodPressure(date);
      })
      .catch(err => {
        console.error('步數讀取錯誤', err);
        setError('取得步數錯誤');
      });
  };

  useEffect(() => {
    requestActivityPermission().then(granted => {
      if (granted) {
        GoogleFit.authorize({ scopes: [Scopes.FITNESS_ACTIVITY_READ] }).then(result => {
          if (result.success) {
            fetchSteps(selectedDate);
          } else {
            setError('Google Fit 授權失敗');
          }
        });
      } else {
        setError('未授權活動辨識權限');
      }
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
            <Text style={styles.userName}>爺爺</Text>
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
            <Text>📅 選擇日期（目前：{selectedDate.toLocaleDateString('sv-SE')}）</Text>
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

          {/* 步數卡片（#FFFCEC、icon 在右側、加陰影，數值放進文字框） */}
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

          {/* 血壓卡片（#D67C78、白字白 icon、數值放進白色半透明框） */}
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

      {/* 底部圓形回首頁按鈕（仍用 MaterialIcons 的 home） */}
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

  /* 卡片樣式（白底圓角 + 陰影） */
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

  /* 文字框（步數卡用） */
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

  /* 文字框（血壓卡用，白色半透明） */
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

  /* 底部回首頁FAB */
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

// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   TouchableOpacity,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { StackNavigationProp } from '@react-navigation/stack';
// import { RootStackParamList } from '../App';
// import GoogleFit, { Scopes } from 'react-native-google-fit';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';

// type ElderlyHealthNavProp = StackNavigationProp<RootStackParamList, 'ElderlyHealth'>;

// export default function ElderlyHealth() {
//   const navigation = useNavigation<ElderlyHealthNavProp>();

//   const [todaySteps, setTodaySteps] = useState<number | null>(null);
//   const [error, setError] = useState('');
//   const [selectedDate, setSelectedDate] = useState(new Date());
//   const [showPicker, setShowPicker] = useState(false);
//   const [bpData, setBpData] = useState<{ systolic: number; diastolic: number; pulse: number } | null>(null);

//   const requestActivityPermission = async () => {
//     if (Platform.OS === 'android' && Platform.Version >= 29) {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
//         {
//           title: '需要活動辨識權限',
//           message: '我們需要讀取您的步數資料來顯示健康資訊。',
//           buttonPositive: '同意',
//           buttonNegative: '拒絕',
//         }
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return true;
//   };

//   const uploadStepsToBackend = async (steps: number, timestamp: Date) => {
//     const token = await AsyncStorage.getItem('access');
//     if (!token) return;

//     try {
//       const response = await axios.post('http://192.168.0.55:8000/api/fitdata/', {
//         steps,
//         timestamp: timestamp.toISOString(),
//       }, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//         },
//       });
//       console.log('✅ 步數成功上傳：', response.data);
//     } catch (err) {
//       console.error('❌ 步數上傳失敗：', err?.response?.data ?? err);
//     }
//   };

//   const fetchBloodPressure = async (date: Date) => {
//     const token = await AsyncStorage.getItem('access');
//     if (!token) return;

//     const dateStr = date.toLocaleDateString('sv-SE');

//     try {
//       const response = await axios.get(`http://192.168.0.55:8000/api/healthcare/by-date/?date=${dateStr}`, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//         },
//       });

//       if (response.data) {
//         setBpData({
//           systolic: response.data.systolic,
//           diastolic: response.data.diastolic,
//           pulse: response.data.pulse,
//         });
//       } else {
//         setBpData(null);
//       }
//     } catch (error: any) {
//       if (error?.response?.status === 404) {
//         console.log('ℹ️ 當天無血壓紀錄');
//         setBpData(null);
//       } else {
//         console.error('❌ 查詢血壓失敗:', error?.response?.data ?? error);
//         setError('查詢血壓時發生錯誤');
//       }
//     } 
//   };

//   const fetchSteps = (date: Date) => {
//     const startDate = new Date(date);
//     startDate.setHours(0, 0, 0, 0);
//     const endDate = new Date(date);
//     endDate.setHours(23, 59, 59, 999);

//     const options = {
//       startDate: startDate.toISOString(),
//       endDate: endDate.toISOString(),
//     };

//     GoogleFit.getDailyStepCountSamples(options)
//       .then(results => {
//         const fitData = results.find(
//           result => result.source === 'com.google.android.gms:estimated_steps'
//         );

//         if (fitData && fitData.steps) {
//           const targetDateStr = startDate.toLocaleDateString('sv-SE');
//           const stepData = fitData.steps.find(step => step.date === targetDateStr);

//           console.log('🎯 查詢日期:', targetDateStr);
//           console.log('📊 所有步數:', fitData.steps);

//           const noonDate = new Date(startDate);
//           noonDate.setHours(12, 0, 0, 0);

//           if (stepData) {
//             const steps = stepData.value;
//             setTodaySteps(steps); // 顯示在畫面
//             setError('');
//             uploadStepsToBackend(steps, noonDate); // 無條件送給後端，由後端判斷是否要存
//           }else {
//             setTodaySteps(0);
//             setError('');
//             uploadStepsToBackend(0, noonDate);
//           }
//         } else {
//           const noonDate = new Date(startDate);
//           noonDate.setHours(12, 0, 0, 0);
//           setTodaySteps(0);
//           setError('');
//           uploadStepsToBackend(0, noonDate);
//         }
//         fetchBloodPressure(date);
//       })
//       .catch(err => {
//         console.error('步數讀取錯誤', err);
//         setError('取得步數錯誤');
//       });
//   };

//   useEffect(() => {
//     requestActivityPermission().then(granted => {
//       if (granted) {
//         GoogleFit.authorize({
//           scopes: [Scopes.FITNESS_ACTIVITY_READ],
//         }).then(result => {
//           if (result.success) {
//             fetchSteps(selectedDate);
//           } else {
//             setError('Google Fit 授權失敗');
//           }
//         });
//       } else {
//         setError('未授權活動辨識權限');
//       }
//     });
//   }, []);

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <Image source={require('../img/elderlyhealth/health.png')} style={styles.icon} />
//         <Text style={styles.title}>CareMate</Text>
//         <Image source={require('../img/elderlyhealth/logo.png')} style={styles.logo} />
//       </View>

//       <Text style={styles.pageTitle}>健康狀況</Text>
//       <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
//         <Text>📅 選擇日期（目前：{selectedDate.toLocaleDateString('sv-SE')}）</Text>
//       </TouchableOpacity>

//       {showPicker && (
//         <DateTimePicker
//           value={selectedDate}
//           mode="date"
//           display="default"
//           onChange={(event, date) => {
//             setShowPicker(false);
//             if (date) {
//               setSelectedDate(date);
//               fetchSteps(date);
//             }
//           }}
//         />
//       )}

//       <View style={styles.card}>
//         <Image source={require('../img/elderlyhealth/walk.png')} style={styles.cardIcon} />
//         <Text style={styles.cardText}>
//           {todaySteps !== null ? `${todaySteps} 步` : '載入中...'}
//         </Text>
//       </View>

//       {error ? <Text style={{ color: 'red', marginBottom: 10 }}>❌ {error}</Text> : null}

//       <View style={styles.cardLarge}>
//         <Image source={require('../img/elderlyhealth/blood_preasure.png')} style={styles.cardIconLarge} />
//         <View style={styles.bpTextGroup}>
//           <Text style={styles.bpText}>收縮壓：{bpData ? bpData.systolic : '未紀錄'}</Text>
//           <Text style={styles.bpText}>舒張壓：{bpData ? bpData.diastolic : '未紀錄'}</Text>
//           <Text style={styles.bpText}>脈搏：{bpData ? bpData.pulse : '未紀錄'}</Text>
//         </View>
//       </View>

//       <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('ElderHome')}>
//         <Text style={styles.backText}>回首頁</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FCFEED',
//     alignItems: 'center',
//   },
//   header: {
//     width: '100%',
//     height: 80,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     backgroundColor: '#65B6E4',
//     paddingHorizontal: 10,
//     marginBottom: 20,
//   },
//   icon: { width: 50, height: 50, marginTop: 10 },
//   logo: { width: 70, height: 70, marginTop: 10 },
//   title: { fontSize: 42, fontWeight: '900', color: '#000', marginTop: 15 },
//   pageTitle: { fontSize: 38, fontWeight: '900', marginBottom: 20 },
//   dateButton: {
//     backgroundColor: '#ccc', padding: 10, borderRadius: 10, marginBottom: 10,
//   },
//   card: {
//     width: '85%', height: 70, backgroundColor: '#F4C80B',
//     borderRadius: 15, borderWidth: 3, marginBottom: 20,
//     flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
//   },
//   cardText: { fontSize: 28, fontWeight: '900', marginLeft: 20 },
//   cardIcon: { width: 50, height: 50 },
//   cardLarge: {
//     width: '85%', backgroundColor: '#F4C80B', borderRadius: 15, borderWidth: 3,
//     flexDirection: 'row', alignItems: 'center', padding: 20, marginBottom: 30,
//   },
//   cardIconLarge: { width: 60, height: 60, marginRight: 20 },
//   bpTextGroup: { flexDirection: 'column' },
//   bpText: { fontSize: 24, fontWeight: '900', marginBottom: 6 },
//   backButton: {
//     width: '60%', height: 50, backgroundColor: '#F58402',
//     borderRadius: 15, borderWidth: 3, justifyContent: 'center', alignItems: 'center',
//   },
//   backText: { fontSize: 24, fontWeight: '900' },
// });
