import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function MedicineInfo() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/childhome')}>
          <Image source={require('../img/medicine/med.png')} style={styles.home} />
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/medicine/logo.png')} style={styles.logo} />
      </View>

      {/* Profile */}
      <View style={styles.profileRow}>
        <View style={styles.profileBox}>
          <Image source={require('../img/medicine/elderly.png')} style={styles.profileIcon} />
          <Text style={styles.profileText}>爺爺</Text>
        </View>
        <Text style={styles.sectionTitle}>用藥資訊</Text>
      </View>

      {/* Illness label */}
      <View style={styles.illnessBox}>
        <Image source={require('../img/medicine/illness.png')} style={styles.illnessIcon} />
        <Text style={styles.illnessText}>高血壓</Text>
      </View>

      {/* Medicine Cards */}
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Image source={require('../img/medicine/medicine.png')} style={styles.icon} />
            <Text style={styles.cardText}>Diovan 得安穩{"\n"}每次使用一顆</Text>
          </View>
          <View style={styles.row}>
            <Image source={require('../img/medicine/clock.png')} style={styles.icon} />
            <Text style={styles.cardText}>三餐飯後</Text>
          </View>
          <View style={styles.actionRow}>
            <Image source={require('../img/medicine/edit.png')} style={styles.actionIcon} />
            <Image source={require('../img/medicine/delete.png')} style={styles.actionIcon} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Image source={require('../img/medicine/medicine.png')} style={styles.icon} />
            <Text style={styles.cardText}>Fluitran{"\n"}服爾伊得安{"\n"}每次使用半顆</Text>
          </View>
          <View style={styles.row}>
            <Image source={require('../img/medicine/clock.png')} style={styles.icon} />
            <Text style={styles.cardText}>睡前</Text>
          </View>
          <View style={styles.actionRow}>
            <Image source={require('../img/medicine/edit.png')} style={styles.actionIcon} />
            <Image source={require('../img/medicine/delete.png')} style={styles.actionIcon} />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#F58402' }]}
          onPress={() => router.push('/medicine')}>
          <Text style={styles.buttonText}>回前頁</Text>
        </TouchableOpacity>
      </ScrollView>
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
  illnessBox: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#000',
    padding: 10,
    backgroundColor: '#fff',
    marginTop: 10,
    alignItems: 'center',
    alignSelf: 'center'
  },
  illnessIcon: {
    width: 40,
    height: 40,
    marginRight: 10
  },
  illnessText: {
    fontSize: 24,
    fontWeight: '900'
  },
  scrollContainer: {
    flex: 1,
    width: '100%'
  },
  card: {
    backgroundColor: '#F4C80B',
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#000',
    padding: 12,
    marginTop: 15,
    width: '90%',
    alignSelf: 'center'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 10
  },
  cardText: {
    fontSize: 20,
    fontWeight: '900',
    flexShrink: 1
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5
  },
  actionIcon: {
    width: 30,
    height: 30,
    marginLeft: 20
  },
  button: {
    marginTop: 20,
    marginBottom: 20,
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