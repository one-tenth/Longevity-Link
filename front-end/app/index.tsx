// app/index.tsx 或 HomeScreen.tsx
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../app';  

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'index'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>歡迎使用 Longevity Link</Text>
      <Button title="登入" onPress={() => navigation.navigate('login')} />
      <View style={{ marginTop: 10 }} />
      <Button title="註冊" onPress={() => navigation.navigate('register')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  title: {
    fontSize: 24, fontWeight: 'bold', marginBottom: 30,
  },
});

export default HomeScreen;
