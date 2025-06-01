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

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContainer}>
        {/* 藥物提醒 */}
        <View style={[styles.boxGreen, { marginTop: 20 }]}>
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
            onPress={() => router.push('/ElderlyUpload')}
          >
            <Image source={require('../img/elderlyhome/add-photo.png')} style={styles.icon} />
            <Text style={styles.buttonText}>拍照上傳</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonOrange}
            onPress={() => router.push('/ElderlyHealth')}
          >
            <Image source={require('../img/elderlyhome/health-check.png')} style={styles.icon} />
            <Text style={styles.buttonText}>健康狀況</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={styles.alertText2}>切換使用者</Text>
        </TouchableOpacity>
      </ScrollView>
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
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 50,
    fontWeight: '900',
    color: '#000',
  },
  logo: {
    width: 60,
    height: 60,
    marginTop: 15,
  },
  settingIcon: {
    width: 50,
    height: 50,
    marginTop: 15,
  },
  scrollContainer: {
    width: '90%',
    alignSelf: 'center',
  },
  boxGreen: {
    backgroundColor: '#549D77',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'black',
  },
  boxYellow: {
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
    fontSize: 30,
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
    marginTop: 2, // 移除無效的 textAlign
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  buttonGreen: {
    flex: 1,
    backgroundColor: '#549D77',
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
  alertText2: {
    fontSize: 20,
    fontWeight: '900',
    alignSelf: 'center', // 置中顯示
    marginTop: 30,
    marginBottom: 20, // 增加底部間距
  },
});