import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/hospital/logo.png')} style={styles.logo} />
      </View>

      <View style={styles.gridRow}>
        <TouchableOpacity
          style={[styles.gridBox, { backgroundColor: '#F4C80B' }]}
          onPress={() => router.push('/elderlyhome')}>
          <Image source={require('../img/setting/elderly.png')} style={styles.elderly} />
          <Text style={styles.gridText1}>長者首頁</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gridBox, { backgroundColor: '#F58402' }]}
          onPress={() => router.push('/childhome')}>
          <Image source={require('../img/setting/young.png')} style={styles.young} />
          <Text style={styles.gridText1}>家人首頁</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FCFEED', 
    alignItems: 'center' 
  },
  header: {
    width: '100%',
    height: 70,
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#65B6E4',
    position: 'relative',
    marginBottom: 20,
    paddingLeft: 10,
    paddingRight: 10,
  },
  home: {
    width: 40, 
    height: 40,
    marginTop: 15,
    resizeMode: 'contain',
  },
  logo: { 
    width: 60, 
    height: 60,
    marginTop: 15,
    resizeMode: 'contain',
  },
  title: { 
    fontSize: 50, 
    fontWeight: '900', 
    color: '#000', 
  },
  gridRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '90%',
    marginTop: 10,
  },
  gridBox: {
    width: '45%', 
    height: 100, // 增加高度以容納圖片和文字
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center', // 讓內容垂直居中
    borderWidth: 3, 
  },
  gridText1: { 
    fontSize: 20, 
    fontWeight: '900',  
    marginTop: 6, 
    textAlign: 'center',
  },
  elderly: {
    width: 50, 
    height: 50,  
  },
  young: {
    width: 54, 
    height: 50, 
  },
});