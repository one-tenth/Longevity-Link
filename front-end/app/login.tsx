import React, { useState } from 'react';
import { View, TextInput, Button, Text, Alert } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://192.168.0.21:8000/api/account/jwt/create/', {
        phone,
        password,
      });
      const token = response.data.access;
      // 儲存 token，例如 AsyncStorage.setItem('token', token)
      Alert.alert('登入成功');
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('登入失敗', '請檢查帳號密碼');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Phone:</Text>
      <TextInput value={phone} onChangeText={setPhone} />
      <Text>Password:</Text>
      <TextInput value={password} secureTextEntry onChangeText={setPassword} />
      <Button title="登入" onPress={handleLogin} />
    </View>
  );
}
