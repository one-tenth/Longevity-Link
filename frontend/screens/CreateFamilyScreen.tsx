import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type NavProp = StackNavigationProp<RootStackParamList, 'index'>;

const CreateFamilyScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [familyName, setFamilyName] = useState('');
  const [fcode, setFcode] = useState('');

  // ✅ 畫面一打開先判斷是否已有家庭
  useEffect(() => {
    const checkFamily = async () => {
      const token = await AsyncStorage.getItem('access');
      if (!token) return;

      try {
        const res = await fetch('http://172.20.10.2:8000/api/account/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = await res.json();

        if (userData.FamilyID) {
          navigation.navigate('index'); // 已有家庭 → 回首頁
        } else {
          // 沒有家庭 → 產生代碼
          const code = Math.floor(1000 + Math.random() * 9000).toString();
          setFcode(code);
        }
      } catch (err) {
        console.log('⚠️ 取得使用者資料失敗:', err);
      }
    };

    checkFamily();
  }, []);

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('錯誤', '請輸入家庭名稱');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        Alert.alert('錯誤', '尚未登入，請先登入');
        return;
      }

      const response = await fetch('http://172.20.10.2:8000/api/family/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ FamilyName: familyName, Fcode: fcode }),
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
        Alert.alert('成功', `家庭建立成功，代碼為 ${fcode}`, [
          { text: '確定', onPress: () => navigation.navigate('index') },
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
      <Text style={styles.title}>家庭設定</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>家庭名稱</Text>
        <TextInput
          style={styles.input}
          placeholder="請輸入家庭名稱"
          value={familyName}
          onChangeText={setFamilyName}
        />
      </View>

      {fcode ? (
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>您的家庭代碼為</Text>
          <Text style={styles.codeValue}>{fcode}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.button} onPress={handleCreateFamily}>
        <Text style={styles.buttonText}>創建</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CreateFamilyScreen;

// ✅ 樣式不變
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9EB',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    color: '#999',
    marginBottom: 12,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#D2E3C8',
    borderRadius: 12,
    padding: 12,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 8,
    borderColor: '#333',
    borderWidth: 1,
  },
  codeBox: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 20,
    width: '80%',
  },
  codeText: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
  },
  codeValue: {
    fontSize: 28,
    color: '#000',
    fontWeight: 'bold',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#F7901E',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
