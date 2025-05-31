import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HospitalRecord() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/childhome')}>
          <Image source={require('../img/hospital/home.png')} style={styles.home} />
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/hospital/logo.png')} style={styles.logo} />
      </View>

      <View style={styles.profileRow}>
        <View style={styles.profileBox}>
          <Image source={require('../img/hospital/elderly.png')} style={styles.profileIcon} />
          <Text style={styles.profileText}>爺爺</Text>
        </View>
        <Text style={styles.sectionTitle}>看診紀錄</Text>
      </View>

      <View style={styles.recordBox}>
        <View style={styles.recordItem}>
          <Image source={require('../img/hospital/clock.png')} style={styles.recordIcon} />
          <Text style={styles.recordText}>早上8:00</Text>
        </View>
        <View style={styles.recordItem}>
          <Image source={require('../img/hospital/locate.png')} style={styles.recordIcon} />
          <Text style={styles.recordText}>臺大醫院</Text>
        </View>
        <View style={styles.recordItem}>
          <Image source={require('../img/hospital/doctor.png')} style={styles.recordIcon} />
          <Text style={styles.recordText}>XXX</Text>
        </View>
        <View style={styles.editRow}>
          <Image source={require('../img/hospital/edit.png')} style={styles.actionIcon} />
          <Image source={require('../img/hospital/delete.png')} style={styles.actionIcon} />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#65B6E4' }]}
        onPress={() => router.push('/AddHospitalRecord')}
      >
        <Text style={styles.buttonText}>新增紀錄</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#F58402' }]}
        onPress={() => router.back()}
      >
        <Text style={styles.buttonText}
        onPress={() => router.push('/childhome')}>回首頁</Text>
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
    position: 'relative',
    marginBottom: 20,
    paddingLeft: 10,
    paddingRight: 10
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
    flexDirection: 'row',
    marginBottom: 10,
    marginLeft: 5
  },
  profileBox: {
    width: '40%',
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 4,
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
  recordBox: {
    marginLeft: 10,
    width: '90%',
    backgroundColor: '#F4C80B',
    borderRadius: 12,
    padding: 15,
    borderWidth: 4,
    borderColor: '#000'
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  recordIcon: {
    width: 50,
    height: 50,
    marginRight: 10
  },
  recordText: {
    fontSize: 24,
    fontWeight: '900'
  },
  editRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  actionIcon: {
    width: 25,
    height: 25,
    marginLeft: 10
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