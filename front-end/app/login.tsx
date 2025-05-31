import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../app'; // 確保這個路徑正確

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await fetch('http://192.168.0.21:8000/api/account/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('登入成功');
        navigation.navigate('Home');
      } else {
        Alert.alert('登入失敗', data.message || '帳號或密碼錯誤');
      }
    } catch (error: any) {
      Alert.alert('發生錯誤', error.message || '未知錯誤');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={account}
        onChangeText={setAccount}
        placeholder="帳號"
        style={styles.input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="密碼"
        secureTextEntry
        style={styles.input}
      />
      <TouchableOpacity onPress={handleLogin} style={styles.button}>
        <Text style={styles.buttonText}>登入</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  input: { borderWidth: 1, width: 200, marginVertical: 10, padding: 8 },
  button: { backgroundColor: 'orange', padding: 10, borderRadius: 5 },
  buttonText: { color: 'white' },
});
