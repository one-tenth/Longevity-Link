import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../App';

type HomeNavProp = StackNavigationProp<RootStackParamList, 'index'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavProp>();
  const isFocused = useIsFocused();

  const [userName, setUserName] = useState<string | null>(null);
  const [fcode, setFcode] = useState<string | null>(null);

  useEffect(() => {
  const fetchUserInfo = async () => {
    const token = await AsyncStorage.getItem('access');
    const name = await AsyncStorage.getItem('userName');
    setUserName(name);

    if (!token) return;

    try {
      const res = await fetch('http://172.20.10.2:8000/account/me/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();
      if (text.startsWith('<')) {
        console.warn('⚠️ 後端回傳 HTML，可能未登入');
        console.warn(text);
        return;
      }

      const userData = JSON.parse(text);
      console.log('✅ 抓到 userData:', userData);

      // ✅ 正確取得 Fcode
      if (userData.FamilyID && userData.FamilyID.Fcode) {
        setFcode(userData.FamilyID.Fcode);
      } else {
        console.warn('⚠️ 沒有 Fcode 可顯示');
      }
    } catch (err) {
      console.log('⚠️ 抓使用者資訊失敗:', err);
    }
  };

  if (isFocused) fetchUserInfo();
}, [isFocused]);

  const handleLogout = () => {
    Alert.alert('確定要登出嗎？', '', [
      { text: '取消', style: 'cancel' },
      {
        text: '確定登出',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('access');
          await AsyncStorage.removeItem('refresh');
          await AsyncStorage.removeItem('userName');
          setUserName(null);
          Alert.alert('已成功登出');
          navigation.navigate('index');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/hospital/logo.png')} style={styles.logo} />
      </View>

      {userName && (
        <>
          <View style={styles.welcomeRow}>
            <Text style={styles.welcomeText}>歡迎，{userName}</Text>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.logoutText}>登出</Text>
            </TouchableOpacity>
          </View>

          {fcode && (
            <Text style={styles.familyCodeText}>家庭代碼：{fcode}</Text>
          )}
        </>
      )}

      <View style={styles.gridRow}>
        <TouchableOpacity
          style={[styles.gridBox, { backgroundColor: '#F4C80B' }]}
          onPress={() => navigation.navigate('ElderHome')}
        >
          <Image source={require('../img/setting/elderly.png')} style={styles.elderly} />
          <Text style={styles.gridText}>長者首頁</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridBox, { backgroundColor: '#F58402' }]}
          onPress={() => navigation.navigate('ChildHome')}
        >
          <Image source={require('../img/setting/young.png')} style={styles.young} />
          <Text style={styles.gridText}>家人首頁</Text>
        </TouchableOpacity>
      </View>

      {!userName && (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('LoginScreen')}
          >
            <Text style={styles.buttonText}>登入</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('RegisterScreen')}
          >
            <Text style={styles.buttonText}>註冊</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCFEED', alignItems: 'center' },
  header: {
    width: '100%',
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#65B6E4',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  title: { fontSize: 50, fontWeight: '900', color: '#000' },
  logo: { width: 60, height: 60, resizeMode: 'contain' },

  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: 10,
  },
  welcomeText: { fontSize: 18, fontWeight: '600' },
  logoutText: { fontSize: 16, color: 'red', fontWeight: 'bold' },

  familyCodeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#33691E',
    marginBottom: 10,
  },

  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
  },
  gridBox: {
    width: '45%',
    height: 100,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  gridText: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
    textAlign: 'center',
  },
  elderly: { width: 50, height: 50 },
  young: { width: 54, height: 50 },

  buttonsContainer: {
    marginTop: 20,
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    width: '45%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
});

export default HomeScreen;
