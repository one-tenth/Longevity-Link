// App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { setupNotificationChannel, initMedicationNotifications } from './utils/initNotification';

// ---- Screens ----
import AddHospitalRecord from './screens/AddHospitalRecord';
import ChildHome from './screens/ChildHome';
import ChildHome_1 from './screens/ChildHome_1';
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
import Profile from './screens/Profile';
import FamilyHospitalList from './screens/FamilyHospitalList';
import FamilyAddHospital from './screens/FamilyAddHospital';
import ElderMedRemind from './screens/ElderMedRemind';

// ---- Stack params ----
export type RootStackParamList = {
  AddHospitalRecord: undefined;
  ChildHome: { mode: 'select' | 'full' } | undefined;
  ChildHome_1: undefined;
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
  RegisterScreen: { mode: 'register' } | { mode: 'addElder'; creatorId: number };
  Health: undefined;

  // 通知相關
  ElderMedRemind: { period?: string; meds?: string[]; time?: string };
  ReminderScreen: undefined;

  // 家庭/成員相關
  FamilyScreen: { mode?: 'select' | 'full' } | undefined;
  FamilySetting: undefined;
  JoinFamily: undefined;
  CreateFamily: undefined;
  CreateFamilyScreen: undefined;

  // 其他
  Profile: undefined;
  FamilyHospitalList: { elderName?: string; elderId?: number } | undefined;
  FamilyAddHospital: { elderId: number; elderName?: string };
};

// ---- Global navigation ref ----
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// ✅ 只保留這個 App
const App: React.FC = () => {
  useEffect(() => {
    async function initNotifee() {
      try {
        await setupNotificationChannel();
        const result = await initMedicationNotifications();
        console.log('init result:', result);

        // 冷啟：若有儲存的通知資料，啟動即跳轉
        const [storedPeriod, storedMeds, storedTime] = await Promise.all([
          AsyncStorage.getItem('notificationPeriod'),
          AsyncStorage.getItem('notificationMeds'),
          AsyncStorage.getItem('notificationTime'),
        ]);

        if (storedPeriod && navigationRef.isReady()) {
          navigationRef.navigate('ElderMedRemind', {
            period: storedPeriod,
            meds: storedMeds ? storedMeds.split(',') : undefined,
            time: storedTime ?? undefined,
          });
          await AsyncStorage.multiRemove(['notificationPeriod', 'notificationMeds', 'notificationTime']);
        }
      } catch (e) {
        console.warn('initNotifee error:', e);
      }
    }

    initNotifee();

    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification?.data) {
        const { period, meds, time } = detail.notification.data as {
          period?: string;
          meds?: string;
          time?: string;
        };
        if (navigationRef.isReady() && (period || meds)) {
          navigationRef.navigate('ElderHome', {
            period,
            meds: meds ? meds.split(',') : undefined,
            time,
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* 首頁 / 登入註冊 */}
        <Stack.Screen name="index" component={index} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="RegisterScreen" component={RegisterScreen} />

        {/* 長者端 */}
        <Stack.Screen name="ElderHome" component={ElderHome} />
        <Stack.Screen name="ElderlyHealth" component={ElderlyHealth} />
        <Stack.Screen name="ElderlyUpload" component={ElderlyUpload} />
        <Stack.Screen name="ElderMedRemind" component={ElderMedRemind} />
        <Stack.Screen name="ReminderScreen" component={ReminderScreen} />

        {/* 家人端 / 共用 */}
        <Stack.Screen name="ChildHome" component={ChildHome} />
        <Stack.Screen name="ChildHome_1" component={ChildHome_1} />
        <Stack.Screen name="HospitalRecord" component={HospitalRecord} />
        <Stack.Screen name="AddHospitalRecord" component={AddHospitalRecord} />
        <Stack.Screen name="Health" component={Health} />
        <Stack.Screen name="Medicine" component={Medicine} />
        <Stack.Screen name="MedInfo" component={MedInfo} />
        <Stack.Screen name="MedInfo_1" component={MedInfo_1} initialParams={{ prescriptionId: '' }} />
        <Stack.Screen name="MedRemind" component={MedRemind} />
        <Stack.Screen name="MedTimeSetting" component={MedTimeSetting} />
        <Stack.Screen name="Setting" component={Setting} />

        {/* 家庭/成員 */}
        <Stack.Screen name="FamilyScreen" component={FamilyScreen} />
        <Stack.Screen name="FamilySetting" component={FamilySetting} />
        <Stack.Screen name="JoinFamily" component={JoinFamily} />
        <Stack.Screen name="CreateFamily" component={CreateFamily} />
        <Stack.Screen name="CreateFamilyScreen" component={CreateFamily} />

        {/* 其他 */}
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="FamilyHospitalList" component={FamilyHospitalList} />
        <Stack.Screen name="FamilyAddHospital" component={FamilyAddHospital} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
