import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // 確保有定義 MemberSetting 頁面

type NavProp = StackNavigationProp<RootStackParamList, 'AddMember'>;

export default function AddMember() {
  const navigation = useNavigation<NavProp>();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../img/family/add.png')} style={styles.icon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/family/logo.png')} style={styles.logo} />
      </View>

      {/* 中間圖片 */}
      <Image source={require('../img/family/familyold.png')} style={styles.image} />

      {/* 按鈕 */}
      <TouchableOpacity style={styles.button}
      onPress={() => navigation.navigate('MemberSetting')}>
        <Text style={styles.buttonText}>新增成員</Text>
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
  image: {
    width: 200,
    height: 200,
    marginVertical: 40,
    resizeMode: 'contain',
  },
  button: {
    backgroundColor: '#f7941d',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 50,
  },
  buttonText: {
    fontSize: 20,
    color: '#000',
    fontWeight: 'bold',
  },
});
