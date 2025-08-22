// App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { setupNotificationChannel, initMedicationNotifications } from './utils/initNotification';
import AsyncStorage from '@react-native-async-storage/async-storage';


// 引入各頁（照你原本的）
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
import ElderMedRemind from './screens/ElderMedRemind';
import CreateFamilyScreen from './screens/CreateFamilyScreen';
import FamilyScreen from './screens/FamilyScreen';
import NotifTest from './screens/NotifTest';

// 你定義的 Stack Param List
export type RootStackParamList = {
  AddHospitalRecord: undefined;
  ChildHome: undefined;
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
  ElderMedRemind: undefined;
  CreateFamilyScreen: undefined;
  FamilyScreen: undefined;
  NotifTest: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  // 在應用啟動時建立通知頻道
  useEffect(() => {
    async function initNotifee() {
      console.log('🔔 初始化通知中...');
      await setupNotificationChannel(); // 初始化頻道

      const token = await AsyncStorage.getItem('access_token');
      const role = await AsyncStorage.getItem('role'); // 假設你在登入時有儲存角色

      if (token && role === 'elder') {
        console.log('👴 是長者，準備排程通知...');
        await initMedicationNotifications();
      } else {
        console.log('🙅‍♂️ 非長者，不排程通知');
      }
    }
    initNotifee();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" component={index} />
        <Stack.Screen name="ElderMedRemind" component={ElderMedRemind} />
        <Stack.Screen name="ElderlyHealth" component={ElderlyHealth} />
        <Stack.Screen name="ElderlyUpload" component={ElderlyUpload} />
        <Stack.Screen name="AddHospitalRecord" component={AddHospitalRecord} />
        <Stack.Screen name="ChildHome" component={ChildHome} />
        <Stack.Screen name="ChildHome_1" component={ChildHome_1} />
        <Stack.Screen name="HospitalRecord" component={HospitalRecord} />
        <Stack.Screen name="Medicine" component={Medicine} />
        <Stack.Screen name="MedInfo" component={MedInfo} />
        <Stack.Screen name="MedInfo_1" component={MedInfo_1} initialParams={{ prescriptionId: '' }} />
        <Stack.Screen name="MedRemind" component={MedRemind} />
        <Stack.Screen name="MedTimeSetting" component={MedTimeSetting} />
        <Stack.Screen name="Setting" component={Setting} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
        <Stack.Screen name="ElderHome" component={ElderHome} />
        <Stack.Screen name="Health" component={Health} />
        <Stack.Screen name="CreateFamilyScreen" component={CreateFamilyScreen} />
        <Stack.Screen name="FamilyScreen" component={FamilyScreen} />
        <Stack.Screen name="NotifTest" component={NotifTest} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
