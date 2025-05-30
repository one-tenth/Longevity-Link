import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './index';
import elderlyhome from './elderlyhome';
import childhome from './childhome';
import fit from './fit';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="elderlyhome" component={elderlyhome} />
        <Stack.Screen name="childhome" component={childhome} /> 
        <Stack.Screen name="fit" component={fit} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
