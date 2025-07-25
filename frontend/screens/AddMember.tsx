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
    backgroundColor: '#FFFFF0',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height:70,
    backgroundColor: '#65B6E4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    marginBottom: 20,
    paddingLeft: 10,
    paddingRight: 10,
  },
  icon: {
    width: 40,
    height: 40,
    marginTop: 15
  },
  title: {
    fontSize: 50,
    fontWeight: '900',
    color: '#000',
  },
  logo: {
    width: 60,
    height: 60,
    marginTop: 15
  },
  image: {
    width: 240,
    height: 240,
    marginVertical: 40,
  },
  button: {
    backgroundColor: '#FFA726',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 4,
    borderColor: '#000',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 26,
    color: '#000',
    fontWeight: '900',
  },
});
