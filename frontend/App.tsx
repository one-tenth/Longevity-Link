// import React from 'react';
// import OcrScreen from './OcrScreen';

// export default function App() {
//   return <OcrScreen />;
// }

import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OcrScreen from './OcrScreen';
import ResultScreen from './ResultScreen'; // 新增的頁面

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer
      onStateChange={(state) => {
        const currentRoute = state?.routes[state.index];
        console.log('🧭 現在在頁面：', currentRoute?.name);
      }}
    >
      <Stack.Navigator initialRouteName="OcrScreen">
        <Stack.Screen name="OcrScreen" component={OcrScreen} options={{ title: '拍照辨識' }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: '辨識結果' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

