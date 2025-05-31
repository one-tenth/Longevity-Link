import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export default function ElderHome() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../img/elderlyhome/logo.png')} style={styles.logo} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/elderlyhome/home.png')} style={styles.iconSmall} />
      </View>

      {/* 藥物提醒 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>吃藥提醒</Text>
        <View style={styles.greenBox}>
          <View style={styles.row}>
            <Image source={require('../img/elderlyhome/clock.png')} style={styles.icon} />
            <Text style={styles.timeText}> 早上8:00</Text>
          </View>
          <Text style={styles.medText}>保健品</Text>
        </View>
      </View>

      {/* 看診提醒 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>看診提醒</Text>
        <View style={styles.yellowBox}>
          <View style={styles.row}>
            <Image source={require('../img/elderlyhome/clock.png')} style={styles.icon} />
            <Text style={styles.timeTextBlack}> 早上8:00</Text>
          </View>
          <View style={styles.row}>
            <Image source={require('../img/elderlyhome/location.png')} style={styles.icon} />
            <Text style={styles.hospitalText}> 臺大醫院</Text>
          </View>
          <View style={styles.row}>
            <Image source={require('../img/elderlyhome/doctor.png')} style={styles.icon} />
            <Text style={styles.doctorText}> XXX</Text>
          </View>
        </View>
      </View>

      {/* 下方按鈕 */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.uploadButton}>
          <Image source={require('../img/elderlyhome/add-photo.png')} style={styles.icon} />
          <Text style={styles.buttonText}>拍照上傳</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.healthButton}>
          <Image source={require('../img/elderlyhome/health-check.png')} style={styles.icon} />
          <Text style={styles.buttonText}>健康狀況</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d4eaf7',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0077aa' },
  logo: { width: 24, height: 24, marginRight: 8 },
  iconSmall: { width: 24, height: 24 },
  section: { marginVertical: 6 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  greenBox: { backgroundColor: '#56b381', padding: 10, borderRadius: 10 },
  yellowBox: { backgroundColor: '#ffcc4d', padding: 10, borderRadius: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  icon: { width: 20, height: 20 },
  timeText: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  timeTextBlack: { fontSize: 18, fontWeight: 'bold', color: 'black' },
  medText: { fontSize: 16, color: 'white', marginTop: 4 },
  hospitalText: { fontSize: 16, color: 'black' },
  doctorText: { fontSize: 16, color: 'black' },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#7ac3a3',
    padding: 12,
    borderRadius: 10,
    marginRight: 6,
    alignItems: 'center',
  },
  healthButton: {
    flex: 1,
    backgroundColor: '#f86c5b',
    padding: 12,
    borderRadius: 10,
    marginLeft: 6,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: 'bold', marginTop: 4 },
});
