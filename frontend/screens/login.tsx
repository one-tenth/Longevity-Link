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
    const response = await fetch('http://172.20.10.2:8000/api/account/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Phone, password }),
    });

    const text = await response.text();
    console.log('status:', response.status);
    console.log('response text:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('伺服器回傳非 JSON:', text);
      throw new Error('伺服器回傳格式錯誤');
    }

    if (response.ok) {
      const { token, user } = data;
      await AsyncStorage.setItem('access', token.access);
      await AsyncStorage.setItem('refresh', token.refresh);
      await AsyncStorage.setItem('userName', user.Name);

      Alert.alert('登入成功', `歡迎 ${user.Name}`);

      // ✅ 判斷導向
      if (!user.FamilyID) {
        navigation.navigate('CreateFamilyScreen' as never); // 尚未創建家庭
      } else if (user.RelatedID) {
        navigation.navigate('ElderHome' as never); // 有家庭＋有 RelatedID（長者）
      } else {
        navigation.navigate('ChildHome' as never); // 有家庭＋沒 RelatedID（家人）
      }

    } else {
      Alert.alert('登入失敗', data.error || '帳號或密碼錯誤');
    }
  } catch (error: any) {
    Alert.alert('發生錯誤', error?.message || '未知錯誤');
  }
};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../img/childhome/logo.png')} style={styles.logo} />
        <Text style={styles.headerText}>CareMate</Text>
        <Image source={require('../img/childhome/logo.png')} style={styles.icon} />
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputLabel}>
          <Image source={require('../img/childhome/logo.png')} style={styles.iconSmall} />
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

      <View style={styles.inputGroup}>
        <View style={styles.inputLabel}>
          <Image source={require('../img/childhome/logo.png')} style={styles.iconSmall} />
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

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>登入</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('RegisterScreen')}>
        <Text style={styles.registerText}>沒有帳號？註冊</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('index')}>
        <Text style={styles.homeText}>返回首頁</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 8,
    color: '#004F7A',
  },
  icon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
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
  iconSmall: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  labelText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#333',
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
    color: '#000',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  homeText: {
    marginTop: 12,
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
