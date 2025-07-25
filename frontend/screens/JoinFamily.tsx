import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // 確保 App.tsx 有定義 'index' 頁面

type JoinFamilyNavProp = StackNavigationProp<RootStackParamList, 'JoinFamily'>;

export default function JoinFamily() {
  const navigation = useNavigation<JoinFamilyNavProp>();
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');

  const handleJoin = () => {
    console.log('加入家庭:', familyName, familyCode);
    // 導向首頁（或你要的下一個頁面）
    navigation.navigate('index');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../img/family/key.png')} style={styles.icon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/family/logo.png')} style={styles.logo} />
      </View>

      {/* 家庭名稱 */}
      <View style={styles.inputGroup}>
        <Image source={require('../img/family/familyName.png')} style={styles.inputIcon} />
        <View style={styles.inputBox}>
          <Text style={styles.label}>家庭名稱</Text>
          <TextInput
            style={styles.input}
            placeholder="Value"
            value={familyName}
            onChangeText={setFamilyName}
          />
        </View>
      </View>

      {/* 家庭代碼 */}
      <View style={styles.inputGroup}>
        <Image source={require('../img/family/familyName.png')} style={styles.inputIcon} />
        <View style={styles.inputBox}>
          <Text style={styles.label}>家庭代碼</Text>
          <TextInput
            style={styles.input}
            placeholder="Value"
            value={familyCode}
            onChangeText={setFamilyCode}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* 加入按鈕 */}
      <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
        <Text style={styles.joinText}>加入</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFF0',
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
  logo: {
    width: 35,
    height: 35,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#a6d5a7',
    marginTop: 30,
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
    width: 220,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  input: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 4,
  },
  joinButton: {
    backgroundColor: '#f7941d',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 60,
    marginTop: 40,
  },
  joinText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});
