import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // 確保這裡定義了對應頁面名稱

type CreateFamilyNavProp = StackNavigationProp<RootStackParamList, 'CreateFamily'>;

export default function CreateFamily() {
  const navigation = useNavigation<CreateFamilyNavProp>();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../img/family/key.png')} style={styles.icon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/family/logo.png')} style={styles.logo} />
      </View>

      {/* 中間房子圖示 */}
      <Image source={require('../img/family/house.png')} style={styles.house} />

      {/* 按鈕區塊 */}
      <TouchableOpacity style={styles.button} 
        onPress={() => navigation.navigate('FamilySetting')}>
        <Text style={styles.buttonText}>創建家庭</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} 
        onPress={() => navigation.navigate('JoinFamily')}>
        <Text style={styles.buttonText}>加入家庭</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffde8',
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
  house: {
    width: 180,
    height: 180,
    marginVertical: 40,
  },
  button: {
    backgroundColor: '#f7941d',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 40,
    marginVertical: 10,
  },
  buttonText: {
    fontSize: 18,
    color: '#000',
    fontWeight: 'bold',
  },
});
