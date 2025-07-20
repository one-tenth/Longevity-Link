import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LoginScreenNavProp = StackNavigationProp<RootStackParamList, 'LoginScreen'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavProp>();
  const [Phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await fetch('http://192.168.0.55:8000/api/account/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Phone, password }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('伺服器回傳格式錯誤');
      }

      if (response.ok) {
        await AsyncStorage.setItem('access', data.token.access);
        await AsyncStorage.setItem('refresh', data.token.refresh);
        Alert.alert('登入成功', `歡迎 ${data.user.Name}`);
        navigation.navigate('index');
      } else {
        Alert.alert('登入失敗', data.error || '帳號或密碼錯誤');
      }
    } catch (error: any) {
      Alert.alert('發生錯誤', error?.message || '未知錯誤');
    }
  };

  return (
    <View style={styles.container}>
      {/* CareMate LOGO + 文字上下排列 */}
      <View style={styles.headerWrapper}>
        <Image source={require('../img/childhome/logo1.png')} style={styles.logo} />
        <Text style={styles.headerText}>CareMate</Text>
      </View>

      {/* 帳號欄位 */}
      <View style={styles.inputGroup}>
        <View style={styles.inputLabel}>
          <Text style={styles.labelText}>帳號</Text>
        </View>
        <TextInput
          style={styles.input}
          value={Phone}
          onChangeText={setPhone}
          placeholder="請輸入手機號碼"
          keyboardType="phone-pad"
        />
      </View>

      {/* 密碼欄位 */}
      <View style={styles.inputGroup}>
        <View style={styles.inputLabel}>
          <Text style={styles.labelText}>密碼</Text>
        </View>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="請輸入密碼"
          secureTextEntry
        />
      </View>

      {/* 登入按鈕 */}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>登入</Text>
      </TouchableOpacity>

      {/* 註冊導向 */}
      <TouchableOpacity onPress={() => navigation.navigate('RegisterScreen')}>
        <Text style={styles.registerText}>沒有帳號？註冊</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9ECE4',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  headerWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 130,
    height: 130,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0000E3',
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    backgroundColor: '#77A88D',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  labelText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#FFF',
    padding: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#F7901E',
    paddingVertical: 12,
    paddingHorizontal: 60,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  registerText: {
    marginTop: 10,
    color: '#00288c',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
