import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function Setting() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={require('../img/childhome/image-1.png')} style={styles.icon} />
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/childhome/logo.png')} style={styles.logo} />
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F4C80B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    padding: 10,
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  icon: {
    width: 40,
    height: 40,
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
    fontWeight: 'bold',
  },
});