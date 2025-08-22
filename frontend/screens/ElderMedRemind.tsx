import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

// 對應 App.tsx 的 route name
type MedicineReminderNavProp = StackNavigationProp<RootStackParamList, 'MedRemind'>;

type RouteParams = {
  period?: string;
  meds?: string[] | string;
  time?: string;
};

export default function ElderMedRemind() {
  const navigation = useNavigation<MedicineReminderNavProp>();
  const route = useRoute();
  const { period, meds, time } = route.params as RouteParams;

  const medList = typeof meds === 'string' ? meds.split(',') : meds || [];
  const displayPeriod = period || '目前時段';
  const displayTime = (time && time.length >= 3) ? `用藥時間：${time}` : '尚未設定時間';


  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Image source={require('../img/eldermed/top.png')} style={styles.home} />
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/eldermed/logo.png')} style={styles.logo} />
      </View>

      {/* Title */}
      <Text style={styles.sectionTitle}>用藥提醒</Text>

      {/* Reminder Card */}
      <View style={styles.card}>
        {/* Time Row */}
        <View style={styles.row}>
          <Image source={require('../img/eldermed/clock.png')} style={styles.icon} />
          <Text style={styles.timeText}>{displayTime}</Text>
        </View>

        {/* 顯示所有藥物 */}
        {medList.length > 0 ? (
          medList.map((med, index) => (
            <View style={styles.row} key={index}>
              <Image source={require('../img/eldermed/name.png')} style={styles.icon} />
              <Text style={styles.text}>{med}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.text, { marginTop: 10 }]}>無藥物資料</Text>
        )}

        {/* 按鈕列 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button}><Text style={styles.buttonText}>延遲</Text></TouchableOpacity>
          <TouchableOpacity style={styles.button}><Text style={styles.buttonText}>取消</Text></TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.mainButton} onPress={() => navigation.navigate('ElderHome')}>
          <Text style={styles.mainButtonText}>開始服藥</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFFFF0', alignItems: 'center', paddingTop: 20, paddingBottom: 40 },
  header: { width: '100%', height: 70, backgroundColor: '#65B6E4', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
  home: { width: 50, height: 50, marginTop: 15 },
  logo: { width: 60, height: 60, marginTop: 15 },
  title: { fontSize: 50, fontWeight: '900', color: '#000' },
  sectionTitle: { fontSize: 35, fontWeight: '900', textAlign: 'center', paddingLeft: 10, marginTop: 20 },
  card: { width: '85%', borderWidth: 3, borderColor: '#000', borderRadius: 10, padding: 20, backgroundColor: '#fff', alignItems: 'center', marginTop: 20, minHeight: 400 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  icon: { width: 50, height: 50, marginRight: 10 },
  timeText: { fontSize: 25, fontWeight: '900' },
  text: { fontSize: 25, fontWeight: '900' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, marginBottom: 10 },
  button: { backgroundColor: '#FFA726', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 10, borderWidth: 3, borderColor: '#000' },
  buttonText: { fontSize: 23, fontWeight: '900', color: '#000' },
  mainButton: { backgroundColor: '#FF9800', paddingVertical: 12, paddingHorizontal: 50, borderRadius: 8, borderWidth: 3, borderColor: '#000' },
  mainButtonText: { fontSize: 23, fontWeight: '900', color: '#000' }
});


// import React from 'react';
// import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { StackNavigationProp } from '@react-navigation/stack';
// import { RootStackParamList } from '../App'; // 確保路徑正確

// // 設定 navigation 型別（對應 App.tsx 裡的 route name）
// type MedicineReminderNavProp = StackNavigationProp<RootStackParamList, 'MedRemind'>;


// export default function ElderMedRemind() {
//     const navigation = useNavigation<MedicineReminderNavProp>();
//     return (
//         <View style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity>
//           <Image source={require('../img/eldermed/top.png')} style={styles.home} />
//         </TouchableOpacity>
//         <Text style={styles.title}>CareMate</Text>
//         <Image source={require('../img/eldermed/logo.png')} style={styles.logo} />
//       </View>

//         {/* Title */}
//         <Text style={styles.sectionTitle}>用藥提醒</Text>

//         {/* Reminder Card */}
//         <View style={styles.card}>
//             {/* Time Row */}
//             <View style={styles.row}>
//             <Image source={require('../img/eldermed/clock.png')} style={styles.icon} />
//             <Text style={styles.timeText}>早上8:00</Text>
//             </View>

//             {/* Type Row */}
//             <View style={styles.row}>
//             <Image source={require('../img/eldermed/type.png')} style={styles.icon} />
//             <Text style={styles.text}>保健品</Text>
//             </View>

//             {/* Name Row */}
//             <View style={styles.row}>
//             <Image source={require('../img/eldermed/name.png')} style={styles.icon} />
//             <Text style={styles.text}>維他命C</Text>
//             </View>

//             {/* Button Row */}
//             <View style={styles.buttonRow}>
//             <TouchableOpacity style={styles.button}>
//                 <Text style={styles.buttonText}>延遲</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.button}>
//                 <Text style={styles.buttonText}>取消</Text>
//             </TouchableOpacity>
//             </View>

//             <TouchableOpacity style={styles.mainButton}
//             onPress={() => navigation.navigate('ElderHome')}>
//             <Text style={styles.mainButtonText}>開始服藥</Text>
//             </TouchableOpacity>
//         </View>
//         </View>
//     );
//     }
// const styles = StyleSheet.create({
// container: {
//   flex: 1,
//   backgroundColor: '#FFFFF0',
//   alignItems: 'center',         // 水平置中
//   justifyContent: 'flex-start', // 垂直靠上排
//   paddingTop: 20,
//   paddingBottom: 40             // 增加底部高度撐出空間
// },
//   header: {
//     width: '100%',
//     height: 70,
//     backgroundColor: '#65B6E4',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 10
//   },
//   home: { 
//     width: 50, 
//     height: 50,
//     marginTop: 15 
//   },
//   logo: { 
//     width: 60, 
//     height: 60,
//     marginTop: 15 
//   },
//   title: {
//     fontSize: 50,
//     fontWeight: '900',
//     color: '#000'
//   },
//   sectionTitle: {
//     fontSize: 35, 
//     fontWeight: '900',
//     textAlign: 'center',
//     paddingLeft: 10,
//     marginTop: 20 
//   },
// card: {
//   width: '85%',
//   borderWidth: 3,
//   borderColor: '#000',
//   borderRadius: 10,
//   padding: 20,
//   backgroundColor: '#fff',
//   alignItems: 'center',  // 內容置中對齊
//   marginTop: 20,
//   minHeight: 400         // ❗可依需求拉高卡片
// },
//   row: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 12
//   },
//   icon: {
//     width: 50,
//     height: 50,
//     marginRight: 10
//   },
//   timeText: {
//     fontSize: 25,
//     fontWeight: '900',
//   },
//   text: {
//     fontSize: 25,
//     fontWeight: '900'


//   },
//   buttonRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',

//     width: '100%',
//     marginTop: 10,
//     marginBottom: 10
//   },
//   button: {
//     backgroundColor: '#FFA726',
//     paddingVertical: 10,
//     paddingHorizontal: 30,
//     borderRadius: 10,
//     borderWidth: 3,
//     borderColor: '#000'
//   },
//   buttonText: {
//     fontSize: 23,
//     fontWeight: '900',
//     color: '#000'
//   },
//   mainButton: {
//     backgroundColor: '#FF9800',
//     paddingVertical: 12,
//     paddingHorizontal: 50,
//     borderRadius: 8,
//     borderWidth: 3,
//     borderColor: '#000'
//   },
//   mainButtonText: {
//     fontSize: 23,
//     fontWeight: '900',
//     color: '#000'
//   }

// });
