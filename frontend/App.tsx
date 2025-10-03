// App.tsx
import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import CallLogs from 'react-native-call-log';
import { setupNotificationChannel, initMedicationNotifications } from './utils/initNotification';

// ---- Screens ----
import AddHospitalRecord from './screens/AddHospitalRecord';
import ChildHome from './screens/ChildHome';

import ElderHome from './screens/ElderHome';
import ElderlyHealth from './screens/ElderlyHealth';
import ElderlyUpload from './screens/ElderlyUpload';
import HospitalRecord from './screens/HospitalRecord';
import index from './screens/index';
import Medicine from './screens/Medicine';
import MedInfo from './screens/MedInfo';
import MedInfo_1 from './screens/MedInfo_1';
import MedRemind from './screens/MedRemind';
import MedTimeSetting from './screens/MedTimeSetting';
import Setting from './screens/Setting';
import LoginScreen from './screens/login';
import RegisterScreen from './screens/register';
import Health from './screens/Health';
import FamilyScreen from './screens/FamilyScreen';
import ReminderScreen from './screens/ReminderScreen';
import CreateFamily from './screens/CreateFamily';
import FamilySetting from './screens/FamilySetting';
import JoinFamily from './screens/JoinFamily';
import EditHospitalRecord from './screens/EditHospitalRecord';
import Profile from './screens/Profile';
import FamilyHospitalList from './screens/FamilyHospitalList';
import FamilyAddHospital from './screens/FamilyAddHospital';
import ElderMedRemind from './screens/ElderMedRemind';
import CallLogScreen from './screens/CallLogScreen';
import ScamScreen from './screens/ScamScreen';
import Location from './screens/Location';
import ElderLocation from './screens/ElderLocation';
import ElderHospitalList from './screens/ElderHospitalList';
// ---- Stack params ----
export type RootStackParamList = {
  AddHospitalRecord: undefined;
  ChildHome: { mode: 'select' | 'full' } | undefined;
  ElderHome: undefined;
  ElderlyHealth: undefined;
  ElderlyUpload: undefined;
  HospitalRecord: undefined;
  index: undefined;
  Medicine: undefined;
  MedInfo: undefined;
  MedInfo_1: { prescriptionId: string };
  MedRemind: undefined;
  MedTimeSetting: undefined;
  Setting: undefined;
  LoginScreen: undefined;
  RegisterScreen:
    | { mode: 'register' }
    | { mode: 'addElder'; creatorId: number };
  Health: undefined;
  ScamScreen: undefined;

  // 通知相關
  ElderMedRemind: { period?: string; meds?: string[]; time?: string };
  ReminderScreen: undefined;

  // 家庭/成員相關
  FamilyScreen: { mode?: 'select' | 'full' } | undefined;
  FamilySetting: undefined;
  JoinFamily: undefined;
  EditHospitalRecord: undefined;
  CreateFamily: undefined;
  CreateFamilyScreen: undefined;
  CallLogScreen: undefined;
  ElderHospitalList: undefined;

  //定位相關
  Location: { elderId: number };
  ElderLocation: undefined;

  // 其他
  Profile: undefined;
  FamilyHospitalList: { elderName?: string; elderId?: number } | undefined;
  FamilyAddHospital: { elderId: number; elderName?: string };
};

// ---- Global navigation ref ----
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
const Stack = createStackNavigator<RootStackParamList>();

const BASE = 'http://172.20.10.7:8000';
const UPLOAD_EVERY_MS = 60 * 1000; // 每分鐘上傳通話紀錄

// 通話紀錄上傳
async function uploadRecentCalls() {
  try {
    const logs = await CallLogs.load(10); // 獲取最近 10 筆通話紀錄
    const payload = logs.map((x: any) => ({
      phone: x.phoneNumber || '',
      name: x.name || '',
      timestamp: Number(x.timestamp) || Date.now(),
      duration: Number(x.duration) || 0,
      type: (x.type || '').toString(), // INCOMING/OUTGOING/MISSED...
    }));

    const access = await AsyncStorage.getItem('access');
    await axios.post(`${BASE}/api/calls/upload/`, { calls: payload }, {
      headers: { Authorization: `Bearer ${access}` },
      timeout: 10000,
    });
  } catch (e) {
    console.log('[uploadRecentCalls] error:', (e instanceof Error) ? e.message : e);
  }
}

// 請求通話紀錄權限
async function requestCallLogPermission() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('您已獲得讀取通話紀錄的權限');
      uploadRecentCalls(); // 請求到權限後就上傳通話紀錄
    } else {
      console.log('您拒絕了讀取通話紀錄的權限');
    }
  } catch (err) {
    console.warn(err);
  }
}

const App: React.FC = () => {
  useEffect(() => {
    async function checkUser() {
      const user = await AsyncStorage.getItem('user');
      if (user === 'elder') {
        console.log('長者端：請求通話紀錄權限並上傳紀錄');
        requestCallLogPermission();  // 長者端請求權限
      } else if (user === 'family') {
        console.log('家人端：檢查並請求通話紀錄權限');
        // 家人端也需要請求權限
        requestCallLogPermission();
      }
    }

    // 檢查用戶身份並執行相應操作
    checkUser();

    // 通知處理
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification?.data) {
        const { period, meds, time } = detail.notification.data as {
          period?: string;
          meds?: string;
          time?: string;
        };
        if (navigationRef.isReady() && (period || meds)) {
          navigationRef.navigate('ElderMedRemind', {
            period,
            meds: meds ? meds.split(',') : undefined,
            time,
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* 首頁 / 登入註冊 */}
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="index" component={index} />
        <Stack.Screen name="RegisterScreen" component={RegisterScreen} />

        {/* 長者端 */}
        <Stack.Screen name="ElderHome" component={ElderHome} />
        <Stack.Screen name="ElderlyHealth" component={ElderlyHealth} />
        <Stack.Screen name="ElderlyUpload" component={ElderlyUpload} />
        <Stack.Screen name="ElderMedRemind" component={ElderMedRemind} />
        <Stack.Screen name="ReminderScreen" component={ReminderScreen} />
        <Stack.Screen name="ElderHospitalList" component={ElderHospitalList} />

        {/* 家人端 / 共用 */}
        <Stack.Screen name="ChildHome" component={ChildHome} />
        <Stack.Screen name="HospitalRecord" component={HospitalRecord} />
        <Stack.Screen name="AddHospitalRecord" component={AddHospitalRecord} />
        <Stack.Screen name="EditHospitalRecord" component={EditHospitalRecord} />
        <Stack.Screen name="Health" component={Health} />
        <Stack.Screen name="Medicine" component={Medicine} />
        <Stack.Screen name="MedInfo" component={MedInfo} />
        <Stack.Screen
          name="MedInfo_1"
          component={MedInfo_1}
          initialParams={{ prescriptionId: '' }}
        />
        <Stack.Screen name="MedRemind" component={MedRemind} />
        <Stack.Screen name="MedTimeSetting" component={MedTimeSetting} />
        <Stack.Screen name="Setting" component={Setting} />

        {/* 家庭/成員 */}
        <Stack.Screen name="FamilyScreen" component={FamilyScreen} />
        <Stack.Screen name="FamilySetting" component={FamilySetting} />
        <Stack.Screen name="JoinFamily" component={JoinFamily} />
        <Stack.Screen name="CreateFamily" component={CreateFamily} />
        <Stack.Screen name="CreateFamilyScreen" component={CreateFamily} />
        <Stack.Screen name="CallLogScreen" component={CallLogScreen} />


        {/* 定位 */}
        <Stack.Screen name="Location" component={Location} />
        <Stack.Screen name="ElderLocation" component={ElderLocation} />


        {/* 其他 */}
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="FamilyHospitalList" component={FamilyHospitalList} />
        <Stack.Screen name="FamilyAddHospital" component={FamilyAddHospital} />
        <Stack.Screen name="ScamScreen" component={ScamScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
