// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';


// 引入各頁（改成你自己的路徑）
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
import Location from './screens/location';

// 建立參數列表，key 為頁面名稱、value 為 params 型別（若無參數就用 undefined）
export type RootStackParamList = {
  AddHospitalRecord: undefined;
  ChildHome: undefined;
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
  RegisterScreen: undefined;
  Health: undefined;
  Location: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" component={index} />
      <Stack.Screen name="ElderlyHealth" component={ElderlyHealth} />
      <Stack.Screen name="ElderlyUpload" component={ElderlyUpload} />
      <Stack.Screen name="AddHospitalRecord" component={AddHospitalRecord} />
      <Stack.Screen name="ChildHome" component={ChildHome} />
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
      <Stack.Screen name="Location" component={Location} />

    </Stack.Navigator>
  </NavigationContainer>
);

export default App;