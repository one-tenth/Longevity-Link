import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

export default function ChildHome() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../img/childhome/logo.png')} style={styles.logo} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/childhome/image-1.png')} style={styles.iconSmall} />
      </View>

      <View style={styles.userBox}>
        <Image source={require('../img/childhome/image.png')} style={styles.userIcon} />
        <Text style={styles.userText}>爺爺</Text>
        <Image source={require('../img/childhome/Vector.png')} style={styles.editIcon} />
      </View>

      <View style={styles.alertBox}>
        <Image source={require('../img/childhome/2058160.png')} style={styles.alertIcon} />
        <View>
          <Text style={styles.alertText}>時間：20:00</Text>
          <Text style={styles.alertText}>來電號碼：0900-123-456</Text>
        </View>
      </View>

      <View style={styles.gridRow}>
        <TouchableOpacity style={[styles.gridBox, { backgroundColor: '#549D77' }]}> 
          <Image source={require('../img/childhome/13866.png')} style={styles.gridIcon} />
          <Text style={styles.gridText}>即時位置</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.gridBox, { backgroundColor: '#F4C80B' }]}> 
          <Image source={require('../img/childhome/image-3.png')} style={styles.gridIcon} />
          <Text style={styles.gridText}>健康狀況</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.gridRow}>
        <TouchableOpacity style={[styles.gridBox, { backgroundColor: '#F58402' }]}> 
          <Image source={require('../img/childhome/61456.png')} style={styles.gridIcon} />
          <Text style={styles.gridText}>用藥</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.gridBox, { backgroundColor: '#65B6E4' }]}> 
          <Image source={require('../img/childhome/4320350.png')} style={styles.gridIcon} />
          <Text style={styles.gridText}>看診</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.callBox, { backgroundColor: '#F4C80B' }]}> 
        <Image source={require('../img/childhome/Group.png')} style={styles.gridIcon} />
        <Text style={styles.callText}>通話紀錄</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCFEED', padding: 20, alignItems: 'center' },
  header: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16, backgroundColor: '#65B6E4', padding: 10, borderRadius: 10,
  },
  logo: { width: 40, height: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  iconSmall: { width: 40, height: 40 },
  userBox: {
    backgroundColor: 'white', width: '100%', borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', padding: 10,
    marginBottom: 10, borderWidth: 2,
  },
  userIcon: { width: 40, height: 40, marginRight: 10 },
  userText: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  editIcon: { width: 20, height: 20 },
  alertBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 10, padding: 10, borderWidth: 2, marginBottom: 10, width: '100%',
  },
  alertIcon: { width: 40, height: 40, marginRight: 10 },
  alertText: { fontSize: 16, fontWeight: 'bold' },
  gridRow: {
    flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10,
  },
  gridBox: {
    width: '48%', borderRadius: 10, alignItems: 'center', padding: 10,
  },
  gridIcon: { width: 40, height: 40, marginBottom: 6 },
  gridText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  callBox: {
    width: '100%', borderRadius: 10, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', padding: 10, marginTop: 10,
  },
  callText: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
});
