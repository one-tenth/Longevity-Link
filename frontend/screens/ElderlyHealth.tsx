import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import GoogleFit, { Scopes } from 'react-native-google-fit';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

type ElderlyHealthNavProp = StackNavigationProp<RootStackParamList, 'ElderlyHealth'>;

export default function ElderlyHealth() {
  const navigation = useNavigation<ElderlyHealthNavProp>();

  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

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
      const response = await axios.post('http://192.168.0.55:8000/api/fitdata/', {
        steps,
        timestamp: timestamp.toISOString(),
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('✅ 步數成功上傳：', response.data);
    } catch (err) {
      console.error('❌ 步數上傳失敗：', err?.response?.data ?? err);
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
      const fitData = results.find(
        result => result.source === 'com.google.android.gms:estimated_steps'
      );

      if (fitData && fitData.steps) {
        const targetDateStr = startDate.toLocaleDateString('sv-SE');
        const stepData = fitData.steps.find(step => step.date === targetDateStr);

        console.log('🎯 查詢日期:', targetDateStr);
        console.log('📊 所有步數:', fitData.steps);

        if (stepData) {
          setTodaySteps(stepData.value);
          setError('');
          uploadStepsToBackend(stepData.value, startDate); // ✅ 傳送真實步數
        } else {
          setTodaySteps(0);
          setError('');
          uploadStepsToBackend(0, startDate); // ✅ 無資料也要送出
        }
      } else {
        setTodaySteps(0);
        setError('');
        uploadStepsToBackend(0, startDate); // ✅ 無來源資料也送 0
      }
    })
    .catch(err => {
      console.error('步數讀取錯誤', err);
      setError('取得步數錯誤');
    });
};


  useEffect(() => {
    requestActivityPermission().then(granted => {
      if (granted) {
        GoogleFit.authorize({
          scopes: [Scopes.FITNESS_ACTIVITY_READ],
        }).then(result => {
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
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../img/elderlyhealth/health.png')} style={styles.icon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/elderlyhealth/logo.png')} style={styles.logo} />
      </View>

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

      {/* 步數卡片 */}
      <View style={styles.card}>
        <Image source={require('../img/elderlyhealth/walk.png')} style={styles.cardIcon} />
        <Text style={styles.cardText}>
          {todaySteps !== null ? `${todaySteps} 步` : '載入中...'}
        </Text>
      </View>

      {error ? <Text style={{ color: 'red', marginBottom: 10 }}>❌ {error}</Text> : null}

      {/* 血壓卡片（假資料） */}
      <View style={styles.cardLarge}>
        <Image source={require('../img/elderlyhealth/blood_preasure.png')} style={styles.cardIconLarge} />
        <View style={styles.bpTextGroup}>
          <Text style={styles.bpText}>收縮壓：120</Text>
          <Text style={styles.bpText}>舒張壓：80</Text>
          <Text style={styles.bpText}>脈搏：80</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('ElderHome')}>
        <Text style={styles.backText}>回首頁</Text>
      </TouchableOpacity>
    </View>
  );
}

// ⬇️ 样式保持不變
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFEED',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  icon: { width: 50, height: 50, marginTop: 10 },
  logo: { width: 70, height: 70, marginTop: 10 },
  title: { fontSize: 42, fontWeight: '900', color: '#000', marginTop: 15 },
  pageTitle: { fontSize: 38, fontWeight: '900', marginBottom: 20 },
  dateButton: {
    backgroundColor: '#ccc', padding: 10, borderRadius: 10, marginBottom: 10,
  },
  card: {
    width: '85%', height: 70, backgroundColor: '#F4C80B',
    borderRadius: 15, borderWidth: 3, marginBottom: 20,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
  },
  cardText: { fontSize: 28, fontWeight: '900', marginLeft: 20 },
  cardIcon: { width: 50, height: 50 },
  cardLarge: {
    width: '85%', backgroundColor: '#F4C80B', borderRadius: 15, borderWidth: 3,
    flexDirection: 'row', alignItems: 'center', padding: 20, marginBottom: 30,
  },
  cardIconLarge: { width: 60, height: 60, marginRight: 20 },
  bpTextGroup: { flexDirection: 'column' },
  bpText: { fontSize: 24, fontWeight: '900', marginBottom: 6 },
  backButton: {
    width: '60%', height: 50, backgroundColor: '#F58402',
    borderRadius: 15, borderWidth: 3, justifyContent: 'center', alignItems: 'center',
  },
  backText: { fontSize: 24, fontWeight: '900' },
});



// ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
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

// type ElderlyHealthNavProp = StackNavigationProp<RootStackParamList, 'ElderlyHealth'>;

// export default function ElderlyHealth() {
//   const navigation = useNavigation<ElderlyHealthNavProp>();

//   const [todaySteps, setTodaySteps] = useState<number | null>(null);
//   const [error, setError] = useState('');
//   const [selectedDate, setSelectedDate] = useState(new Date());
//   const [showPicker, setShowPicker] = useState(false);

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
//           const targetDateStr = startDate.toLocaleDateString('sv-SE'); // 🟢 改這裡讓日期對得上
//           const stepData = fitData.steps.find(step => step.date === targetDateStr);

//           console.log('🎯 查詢日期:', targetDateStr);
//           console.log('📊 所有步數:', fitData.steps);

//           if (stepData) {
//             setTodaySteps(stepData.value);
//             setError('');
//           } else {
//             setTodaySteps(0);
//             setError('這天沒有步數資料');
//           }
//         } else {
//           setTodaySteps(0);
//           setError('找不到步數資料');
//         }
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
//             fetchSteps(selectedDate); // 預設今天
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
//       {/* 標題列 */}
//       <View style={styles.header}>
//         <Image source={require('../img/elderlyhealth/health.png')} style={styles.icon} />
//         <Text style={styles.title}>CareMate</Text>
//         <Image source={require('../img/elderlyhealth/logo.png')} style={styles.logo} />
//       </View>

//       {/* 頁面標題 */}
//       <Text style={styles.pageTitle}>健康狀況</Text>

//       {/* 日期選擇器 */}
//       <TouchableOpacity
//         style={styles.dateButton}
//         onPress={() => setShowPicker(true)}
//       >
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

//       {/* 步數卡片 */}
//       <View style={styles.card}>
//         <Image source={require('../img/elderlyhealth/walk.png')} style={styles.cardIcon} />
//         <Text style={styles.cardText}>
//           {todaySteps !== null ? `${todaySteps} 步` : '載入中...'}
//         </Text>
//       </View>

//       {error ? <Text style={{ color: 'red', marginBottom: 10 }}>❌ {error}</Text> : null}

//       {/* 血壓卡片 */}
//       <View style={styles.cardLarge}>
//         <Image source={require('../img/elderlyhealth/blood_preasure.png')} style={styles.cardIconLarge} />
//         <View style={styles.bpTextGroup}>
//           <Text style={styles.bpText}>收縮壓：120</Text>
//           <Text style={styles.bpText}>舒張壓：80</Text>
//           <Text style={styles.bpText}>脈搏：80</Text>
//         </View>
//       </View>

//       {/* 回首頁 */}
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
//   icon: {
//     width: 50,
//     height: 50,
//     marginTop: 10,
//   },
//   logo: {
//     width: 70,
//     height: 70,
//     marginTop: 10,
//   },
//   title: {
//     fontSize: 42,
//     fontWeight: '900',
//     color: '#000',
//     marginTop: 15,
//   },
//   pageTitle: {
//     fontSize: 38,
//     fontWeight: '900',
//     marginBottom: 20,
//   },
//   dateButton: {
//     backgroundColor: '#ccc',
//     padding: 10,
//     borderRadius: 10,
//     marginBottom: 10,
//   },
//   card: {
//     width: '85%',
//     height: 70,
//     backgroundColor: '#F4C80B',
//     borderRadius: 15,
//     borderWidth: 3,
//     marginBottom: 20,
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   cardText: {
//     fontSize: 28,
//     fontWeight: '900',
//     marginLeft: 20,
//   },
//   cardIcon: {
//     width: 50,
//     height: 50,
//   },
//   cardLarge: {
//     width: '85%',
//     backgroundColor: '#F4C80B',
//     borderRadius: 15,
//     borderWidth: 3,
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 20,
//     marginBottom: 30,
//   },
//   cardIconLarge: {
//     width: 60,
//     height: 60,
//     marginRight: 20,
//   },
//   bpTextGroup: {
//     flexDirection: 'column',
//   },
//   bpText: {
//     fontSize: 24,
//     fontWeight: '900',
//     marginBottom: 6,
//   },
//   backButton: {
//     width: '60%',
//     height: 50,
//     backgroundColor: '#F58402',
//     borderRadius: 15,
//     borderWidth: 3,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   backText: {
//     fontSize: 24,
//     fontWeight: '900',
//   },
// });


// --------------------------------------------------------------------------------------------------------------------------------
// // elderlyhealth.tsx
// import React from 'react';
// import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { StackNavigationProp } from '@react-navigation/stack';
// import { RootStackParamList } from '../App'; // 確認 App.tsx 裡定義了這個

// // ChildHome 頁面的 navigation 型別
// type ElderlyHealthNavProp = StackNavigationProp<RootStackParamList, 'ElderlyHealth'>;


// export default function ElderlyHealth() {
//   const navigation = useNavigation<ElderlyHealthNavProp>();

//   return (
//     <View style={styles.container}>
//       {/* 標題列 */}
//       <View style={styles.header}>
//         <Image source={require('../img/elderlyhealth/health.png')} style={styles.icon} />
//         <Text style={styles.title}>CareMate</Text>
//         <Image source={require('../img/elderlyhealth/logo.png')} style={styles.logo} />
//       </View>

//       {/* 頁面標題 */}
//       <Text style={styles.pageTitle}>健康狀況</Text>

//       {/* 步數卡片 */}
//       <View style={styles.card}>
//         <Image source={require('../img/elderlyhealth/walk.png')} style={styles.cardIcon} />
//         <Text style={styles.cardText}>3,820步</Text>
//       </View>

//       {/* 血壓卡片 */}
//       <View style={styles.cardLarge}>
//         <Image source={require('../img/elderlyhealth/blood preasure.png')} style={styles.cardIconLarge} />
//         <View style={styles.bpTextGroup}>
//           <Text style={styles.bpText}>收縮壓：120</Text>
//           <Text style={styles.bpText}>舒張壓：80</Text>
//           <Text style={styles.bpText}>脈搏：80</Text>
//         </View>
//       </View>

//       {/* 回首頁 */}
//       <TouchableOpacity
//         style={styles.backButton}
//         onPress={() => navigation.navigate('ElderHome')}
//       >
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
//   icon: {
//     width: 50,
//     height: 50,
//     marginTop: 10,
//   },
//   logo: {
//     width: 70,
//     height: 70,
//     marginTop: 10,
//   },
//   title: {
//     fontSize: 42,
//     fontWeight: '900',
//     color: '#000',
//     marginTop: 15,
//   },
//   pageTitle: {
//     fontSize: 38,
//     fontWeight: '900',
//     marginBottom: 30,
//   },
//   card: {
//     width: '85%',
//     height: 70,
//     backgroundColor: '#F4C80B',
//     borderRadius: 15,
//     borderWidth: 3,
//     marginBottom: 20,
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   cardText: {
//     fontSize: 28,
//     fontWeight: '900',
//     marginLeft: 20,
//   },
//   cardIcon: {
//     width: 50,
//     height: 50,
//   },
//   cardLarge: {
//     width: '85%',
//     backgroundColor: '#F4C80B',
//     borderRadius: 15,
//     borderWidth: 3,
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 20,
//     marginBottom: 30,
//   },
//   cardIconLarge: {
//     width: 60,
//     height: 60,
//     marginRight: 20,
//   },
//   bpTextGroup: {
//     flexDirection: 'column',
//   },
//   bpText: {
//     fontSize: 24,
//     fontWeight: '900',
//     marginBottom: 6,
//   },
//   backButton: {
//     width: '60%',
//     height: 50,
//     backgroundColor: '#F58402',
//     borderRadius: 15,
//     borderWidth: 3,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   backText: {
//     fontSize: 24,
//     fontWeight: '900',
//   },
// });
