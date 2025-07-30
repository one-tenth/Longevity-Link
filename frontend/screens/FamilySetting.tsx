import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type NavProp = StackNavigationProp<RootStackParamList, 'index'>;

export default function CreateFamily() {
  const navigation = useNavigation<NavProp>();
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');

  // ✅ 檢查是否已有家庭（若有則導回首頁）
  useEffect(() => {
    const checkFamily = async () => {
      const token = await AsyncStorage.getItem('access');
      if (!token) return;

      try {
        const res = await fetch('http://172.20.10.3:8000/account/me/', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const text = await res.text();
        if (text.startsWith('<')) return;
        const userData = JSON.parse(text);
        if (userData.FamilyID) {
          navigation.navigate('index');
        }
      } catch (err) {
        console.log('⚠️ 取得使用者資料失敗:', err);
      }
    };

    checkFamily();
  }, []);

  // ✅ 建立家庭流程
  const handleCreate = async () => {
    if (!familyName.trim()) {
      Alert.alert('錯誤', '請輸入家庭名稱');
      return;
    }

    const token = await AsyncStorage.getItem('access');
    if (!token) {
      Alert.alert('錯誤', '尚未登入，請先登入');
      return;
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setFamilyCode(code);

    try {
      const response = await fetch('http://172.20.10.3:8000/api/family/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ FamilyName: familyName, Fcode: code }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.log('⚠️ 無法解析回應:', text);
        throw new Error('後端格式錯誤');
      }

      if (response.ok) {
        Alert.alert('成功', `家庭建立成功，代碼為 ${code}`, [
          { text: '確定', onPress: () => navigation.navigate('FamilyScreen') },
        ]);
      } else {
        Alert.alert('建立失敗', data.error || '請稍後再試');
      }
    } catch (err: any) {
      Alert.alert('錯誤', err.message || '無法建立家庭');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../img/family/key.png')} style={styles.icon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/family/logo.png')} style={styles.logo} />
      </View>

      {/* 輸入區塊 */}
      <View style={styles.inputContainer}>
        {/* 上方綠底區塊 */}
        <View style={styles.inputBoxTop}>
          <Image source={require('../img/family/familyName.png')} style={styles.inputIcon} />
          <Text style={styles.inputLabel}>家庭名稱</Text>
        </View>

        {/* 黑線 */}
        <View style={styles.divider} />

        {/* 白底框 */}
        <View style={styles.inputOuterBox}>
          <TextInput
            style={styles.inputInnerBox}
            placeholder="請輸入家庭名稱"
            value={familyName}
            onChangeText={setFamilyName}
            placeholderTextColor="#888"
          />
        </View>
      </View>

      {/* 家庭代碼顯示 */}
      {familyCode ? (
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>您的家庭代碼為</Text>
          <Text style={styles.codeText}>{familyCode}</Text>
        </View>
      ) : null}

      {/* 建立按鈕 */}
      <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
        <Text style={styles.createText}>創建</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFF0',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    marginBottom: 20,
    paddingLeft: 10,
    paddingRight: 10,
  },
  icon: {
    width: 40,
    height: 40,
    marginTop: 15,
  },
  title: {
    fontSize: 50,
    fontWeight: '900',
    color: '#000',
  },
  logo: {
    width: 60,
    height: 60,
    marginTop: 15,
  },
  inputContainer: {
    width: '75%',
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#000',
    overflow: 'hidden',
  },
  inputBoxTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#549D77',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputIcon: {
    width: 26,
    height: 26,
  },
  inputLabel: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 'auto',
  },
  divider: {
    height: 4,
    backgroundColor: '#000',
  },
  inputOuterBox: {
    backgroundColor: '#77A88D',
    padding: 8,
  },
  inputInnerBox: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: '900',
    borderRadius: 8,
  },
  codeContainer: {
    marginTop: 27,
    backgroundColor: '#fff4a3',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderColor: '#ffb600',
    borderWidth: 4,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 30,
    fontWeight: '900',
    color: '#333',
  },
  codeText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#000',
    marginTop: 5,
  },
  createButton: {
    backgroundColor: '#ffb600',
    marginTop: 33,
    paddingVertical: 10,
    paddingHorizontal: 50,
    borderRadius: 10,
    borderWidth: 3,
  },
  createText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000',
  },
});
