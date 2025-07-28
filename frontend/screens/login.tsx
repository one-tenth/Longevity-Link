import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Text as SvgText, TextPath, Defs, Path } from 'react-native-svg';

type LoginScreenNavProp = StackNavigationProp<RootStackParamList, 'LoginScreen'>;

function ArcText() {
  return (
    <Svg width={360} height={90} viewBox="0 0 360 90" style={{ alignSelf: 'center' }}>
      <Defs>
        <Path id="curve" d="M60,70 Q180,10 300,70" fill="none" />
      </Defs>
      <SvgText
        fill="#000000"
        fontSize="42"
        fontWeight="bold"
        fontFamily="FascinateInline-Regular"
      >
        <TextPath href="#curve" startOffset="0%" textAnchor="start">
          .CareMate.
        </TextPath>
      </SvgText>
    </Svg>
  );
}

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
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* 彎曲文字 + logo + 標題 */}
        <View style={styles.headerContainer}>
          <ArcText />
          <Image source={require('../img/childhome/1.png')} style={styles.logo} />
          <Text style={styles.footerText}>@ 長照通</Text>
        </View>

        {/* 帳號欄位 */}
        <View style={styles.inputGroup}>
          <View style={styles.inputBox}>
            <Text style={styles.inputLabelInline}>帳號</Text>
            <TextInput
              style={styles.input}
              value={Phone}
              onChangeText={setPhone}
              placeholder="請輸入手機號碼"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* 密碼欄位 */}
        <View style={styles.inputGroup}>
          <View style={styles.inputBox}>
            <Text style={styles.inputLabelInline}>密碼</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="請輸入密碼"
              secureTextEntry
            />
          </View>
        </View>

        {/* 登入按鈕 */}
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>登入</Text>
        </TouchableOpacity>

        {/* 註冊連結 */}
        <TouchableOpacity onPress={() => navigation.navigate('RegisterScreen')}>
          <Text style={styles.registerText}>沒有帳號？註冊</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    marginTop: -30,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#555',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  inputBox: {
    flexDirection: 'row',
    height:80,
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputLabelInline: {
    color: '#333',
    fontWeight: '900',
    fontSize: 20,
    marginRight: 10,
    width: 50,
  },
  input: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#37613C',
    paddingVertical: 12,
    paddingHorizontal: 60,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 20,
    textAlign: 'center',
  },
  registerText: {
    marginTop: 10,
    color: '#00288c',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
