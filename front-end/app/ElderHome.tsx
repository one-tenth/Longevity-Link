import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function ElderHome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/setting')}>
          <Image source={require('../img/elderlyhome/home.png')} style={styles.settingIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/elderlyhome/logo.png')} style={styles.logo} />
      </View>

      {/* 藥物提醒 */}
      <View style={styles.boxGreen}>
        <Text style={styles.boxTitle}>吃藥提醒</Text>
        <View style={styles.row}>
          <Image source={require('../img/elderlyhome/clock.png')} style={styles.icon} />
          <Text style={styles.boxText}>早上8:00</Text>
        </View>
        <View style={styles.row}>
          <Image source={require('../img/elderlyhome/health.png')} style={styles.icon} />
          <Text style={styles.boxText}>保健品</Text>
        </View>
      </View>

      {/* 看診提醒 */}
      <View style={styles.boxYellow}>
        <Text style={styles.boxTitle}>看診提醒</Text>
        <View style={styles.row}>
          <Image source={require('../img/elderlyhome/clock.png')} style={styles.icon} />
          <Text style={styles.boxText}>早上8:00</Text>
        </View>
        <View style={styles.row}>
          <Image source={require('../img/elderlyhome/location.png')} style={styles.icon} />
          <Text style={styles.boxText}>臺大醫院</Text>
        </View>
        <View style={styles.row}>
          <Image source={require('../img/elderlyhome/doctor.png')} style={styles.icon} />
          <Text style={styles.boxText}>XXX</Text>
        </View>
      </View>

      {/* 下方按鈕 */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.buttonGreen}
          onPress={() => router.push('/PhotoUpload')}
        >
          <Image source={require('../img/elderlyhome/add-photo.png')} style={styles.icon} />
          <Text style={styles.buttonText}>拍照上傳</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonOrange}
          onPress={() => router.push('/ElderHealth')}
        >
          <Image source={require('../img/elderlyhome/health-check.png')} style={styles.icon} />
          <Text style={styles.buttonText}>健康狀況</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: '#FCFEED',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height:70,
    flexDirection: 'row', 
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    position: 'relative',
    marginBottom:20,
    paddingLeft:10,
    paddingRight:10,
  },
  title: {
    fontSize: 50, 
    fontWeight:'900', 
    color: '#000', 
  },
  logo: {
    width: 60, 
    height: 60,
    marginTop:15,
  },
  settingIcon: {
    width: 40, 
    height: 40,
    marginTop:15,
  },
  boxGreen: {
    width: '90%',
    backgroundColor: '#549D77',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'black',
  },
  boxYellow: {
    width: '90%',
    backgroundColor: '#F4C80B',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'black',
  },
  boxTitle: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 12,
    color: 'black',
  },
  boxText: {
    fontSize: 24,
    fontWeight: '900',
    color: 'black',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    width: 62, 
    height: 62, 
    textAlign:'center',
    marginTop:2,
  },
  buttonRow: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonGreen: {
    flex: 1,
    backgroundColor: '#7ac3a3',
    paddingVertical: 16,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 3,
    borderColor: 'black',
    alignItems: 'center',
  },
  buttonOrange: {
    flex: 1,
    backgroundColor: '#F58402',
    paddingVertical: 16,
    borderRadius: 10,
    marginLeft: 8,
    borderWidth: 3,
    borderColor: 'black',
    alignItems: 'center',
  },
  buttonText: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '900',
    color: 'white',
  },
});
