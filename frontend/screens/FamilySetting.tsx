import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // 確保有定義 AddMember 頁面

type NavProp = StackNavigationProp<RootStackParamList, 'FamilySetting'>;

export default function FamilySetting() {
  const navigation = useNavigation<NavProp>();
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');

  // 自動產生 4 碼家庭代碼
  useEffect(() => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setFamilyCode(code);
  }, []);

  const handleCreate = () => {
    // 這裡可以串接 API 發送 familyName 和 familyCode
    console.log('家庭名稱:', familyName);
    console.log('家庭代碼:', familyCode);
    navigation.navigate('AddMember');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../img/family/key.png')} style={styles.icon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/family/logo.png')} style={styles.logo} />
      </View>

      {/* 輸入區 */}
      <View style={styles.inputContainer}>
        <Image source={require('../img/family/familyName.png')} style={styles.inputIcon} />
        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>家庭名稱</Text>
          <TextInput
            style={styles.input}
            placeholder="Value"
            value={familyName}
            onChangeText={setFamilyName}
          />
        </View>
      </View>

      {/* 家庭代碼顯示 */}
      <View style={styles.codeContainer}>
        <Text style={styles.codeLabel}>您的家庭代碼為</Text>
        <Text style={styles.codeText}>{familyCode}</Text>
      </View>

      {/* 創建按鈕 */}
      <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
        <Text style={styles.createText}>創建</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffef0',
    alignItems: 'center',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c8e3f9',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  icon: {
    width: 30,
    height: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  logo: {
    width: 35,
    height: 35,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    backgroundColor: '#a6d5a7',
    padding: 10,
    borderRadius: 10,
  },
  inputIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  inputBox: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 200,
  },
  inputLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  input: {
    fontSize: 16,
    color: '#000',
  },
  codeContainer: {
    marginTop: 40,
    backgroundColor: '#fff4a3',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderColor: '#ffb600',
    borderWidth: 2,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 5,
  },
  createButton: {
    backgroundColor: '#f7941d',
    marginTop: 30,
    paddingVertical: 10,
    paddingHorizontal: 50,
    borderRadius: 10,
  },
  createText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
});
