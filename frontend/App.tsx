import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// 引入現有頁面（這些檔案你有）
import AddHospitalRecord from './screens/AddHospitalRecord';
import ChildHome from './screens/ChildHome';
import HospitalRecord from './screens/HospitalRecord';
import index from './screens/index';
import Medicine from './screens/Medicine';
import MedInfo from './screens/MedInfo';
import MedRemind from './screens/MedRemind';
import MedTimeSetting from './screens/MedTimeSetting';
import Setting from './screens/Setting';

export type RootStackParamList = {
  AddHospitalRecord: undefined;
  ChildHome: undefined;
  // ElderHome: undefined;        ❌ 移除未定義頁面
  // ElderlyHealth: undefined;    ❌
  // ElderlyUpload: undefined;    ❌
  fit: undefined;
  HospitalRecord: undefined;
  index: undefined;
  Medicine: undefined;
  MedInfo: undefined;
  MedRemind: undefined;
  MedTimeSetting: undefined;
  Setting: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChildHome" component={ChildHome} />
      <Stack.Screen name="AddHospitalRecord" component={AddHospitalRecord} />
      <Stack.Screen name="HospitalRecord" component={HospitalRecord} />
      <Stack.Screen name="index" component={index} />
      <Stack.Screen name="Medicine" component={Medicine} />
      <Stack.Screen name="MedInfo" component={MedInfo} />
      <Stack.Screen name="MedRemind" component={MedRemind} />
      <Stack.Screen name="MedTimeSetting" component={MedTimeSetting} />
      <Stack.Screen name="Setting" component={Setting} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default App;
