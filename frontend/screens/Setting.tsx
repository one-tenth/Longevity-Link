import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // 確認 App.tsx 裡定義了這個

// ElderHome 頁面的 navigation 型別
type SettingNavProp = StackNavigationProp<RootStackParamList, 'Setting'>;

export default function Setting() {
  const navigation = useNavigation<SettingNavProp>();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Setting')}>
          <Image source={require('../img/childhome/13866.png')} style={styles.setting} />
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/childhome/logo.png')} style={styles.logo} />
      </View>

      {/* Menu */}
      <View style={styles.menuBox}>
        <TouchableOpacity style={styles.menuItem}>
          <Image source={require('../img/setting/user.png')} style={styles.menuIcon} />
          <Text style={styles.menuText}>個人設定</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Image source={require('../img/setting/family.png')} style={styles.menuIcon} />
          <Text style={styles.menuText}>家庭設定</Text>
        </TouchableOpacity>
      </View>

      {/* Back Button - 中間右側 */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('ChildHome')}
      >
        <Image source={require('../img/setting/back.png')} style={styles.backIcon} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F4C80B',
  },
  header: {
    width: '100%',
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    position: 'relative',
    marginBottom: 20,
    paddingLeft: 10,
    paddingRight: 10,
  },
  logo: {
    width: 60,
    height: 60,
    marginTop: 15,
  },
  setting: {
    width: 40,
    height: 40,
    marginTop: 15,
  },
  title: {
    fontSize: 50,
    fontWeight: '900',
    color: '#000',
  },
  menuBox: {
    marginTop: 20,
    paddingLeft: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  menuIcon: {
    width: 50,
    height: 50,
    marginRight: 10,
  },
  menuText: {
    fontSize: 22,
    fontWeight: '900',
  },
  backButton: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -25 }],
    zIndex: 10,
  },
  backIcon: {
    width: 50,
    height: 50,
  },
});