import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

export default function ElderMedRemind() {
  return (
    <View style={styles.container}>
      {/* 標題區 */}
      <View style={styles.header}>
        <Image source={require('../img/elderlyMed/top.png')} style={styles.topIcon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/elderlyMed/logo.png')} style={styles.logo} />
      </View>

      {/* 主內容區 */}
      <Text style={styles.pageTitle}>用藥提醒</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Image source={require('../img/elderlyMed/clock.png')} style={styles.icon} />
          <Text style={styles.timeText}>早上8:00</Text>
        </View>

        <View style={styles.row}>
          <Image source={require('../img/elderlyMed/type.png')} style={styles.icon} />
          <Text style={styles.medType}>保健品</Text>
        </View>

        <View style={styles.row}>
          <Image source={require('../img/elderlyMed/name.png')} style={styles.icon} />
          <Text style={styles.medName}>維他命C</Text>
        </View>

        {/* 按鈕區 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.orange]}>
            <Text style={styles.buttonText}>延遲</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.orange]}>
            <Text style={styles.buttonText}>取消</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.button, styles.startButton]}>
          <Text style={styles.buttonText}>開始服藥</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFF0',
    alignItems: 'center',
    paddingTop: 40,
  },
  header: {
    width: '100%',
    backgroundColor: '#87CEEB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  topIcon: {
    width: 30,
    height: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  logo: {
    width: 40,
    height: 40,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
  },
  card: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#000',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    width: 30,
    height: 30,
    marginRight: 12,
  },
  timeText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  medType: {
    fontSize: 18,
  },
  medName: {
    fontSize: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  orange: {
    backgroundColor: '#FFA500',
  },
  startButton: {
    marginTop: 10,
    backgroundColor: '#FFA500',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
