import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function Medicine() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/childhome')}>
          <Image source={require('../img/medicine/med.png')} style={styles.home} />
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/medicine/logo.png')} style={styles.logo} />
      </View>

      <View style={styles.profileRow}>
        <View style={styles.profileBox}>
          <Image source={require('../img/medicine/elderly.png')} style={styles.profileIcon} />
          <Text style={styles.profileText}>爺爺</Text>
        </View>
        <Text style={styles.sectionTitle}>用藥</Text>
      </View>

      <TouchableOpacity style={[styles.featureButton, { backgroundColor: '#F4C80B' }]}>
        <Image source={require('../img/medicine/clock.png')} style={styles.featureIcon} />
        <Text style={styles.featureText}
          onPress={() => router.push('/MedTimeSetting')}>用藥時間設定</Text>
      </TouchableOpacity>

      <View style={styles.rowButtons}>
        <TouchableOpacity style={[styles.gridButton, { backgroundColor: '#F58402' }]}>
          <Image source={require('../img/medicine/med.png')} style={styles.gridIcon} />
          <Text style={styles.featureText}
          onPress={() => router.push('/MedRemind')}
          >用藥提醒</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.gridButton, { backgroundColor: '#65B6E4' }]}>
          <Image source={require('../img/medicine/information.png')} style={styles.gridIcon1} />
          <Text style={styles.featureText}>用藥資訊</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#F58402' }]}
        onPress={() => router.push('/childhome')}
      >
        <Text style={styles.buttonText}>回首頁</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFEED'
  },
  header: {
    width: '100%',
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    paddingLeft: 10,
    paddingRight: 10,
    alignItems: 'center'
  },
  logo: {
    width: 60,
    height: 60,
    marginTop: 15
  },
  home: {
    width: 50,
    height: 50,
    marginTop: 15
  },
  title: {
    fontSize: 50,
    fontWeight: '900',
    color: '#000'
  },
  profileRow: {
    marginTop: 20,
    flexDirection: 'row',
    marginBottom: 10,
    marginLeft: 5
  },
  profileBox: {
    width: '40%',
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 1
  },
  profileIcon: {
    width: 55,
    height: 55,
    marginRight: 10
  },
  profileText: {
    fontSize: 30,
    fontWeight: '900'
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    paddingLeft: 10,
    marginTop: 20
  },
  featureButton: {
    marginTop: 10,
    width: '90%',
    padding: 15,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#000',
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row'
  },
  featureIcon: {
    width: 60,
    height: 60,
    marginRight: 10
  },
  featureText: {
    fontSize: 24,
    fontWeight: '900'
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20
  },
  gridButton: {
    width: '40%',
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center', // 確保內容垂直居中
    padding: 10,
    flexDirection: 'column' // 將圖片和文字垂直排列
  },
  gridIcon: {
    width: 40, // 調整圖片大小為 40x40
    height: 40,
    marginBottom: 5 // 圖片和文字之間留點空間
  },

  gridIcon1: {
    width: 50, // 調整圖片大小為 40x40
    height: 50,
    marginBottom: 5 // 圖片和文字之間留點空間
  },
  button: {
    marginTop: 20,
    width: '60%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 4,
    borderColor: '#000',
    alignItems: 'center',
    alignSelf: 'center'
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000'
  }
});