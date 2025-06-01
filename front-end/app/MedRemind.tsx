import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function MedicineReminder() {
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

      {/* Profile and Title */}
      <View style={styles.profileRow}>
        <View style={styles.profileBox}>
          <Image source={require('../img/medicine/elderly.png')} style={styles.profileIcon} />
          <Text style={styles.profileText}>爺爺</Text>
        </View>
        <Text style={styles.sectionTitle}>用藥提醒</Text>
      </View>

      {/* Time Period Box */}
      <View style={styles.periodBox}>
        <Text style={styles.periodText}>早上</Text>
      </View>

      {/* Medicine Reminders */}
      <View style={styles.reminderBox}>
        <View style={styles.reminderItem}>
          <View style={styles.iconContainer}>
            <Image source={require('../img/medicine/clock.png')} style={styles.icon} />
            <Image source={require('../img/medicine/health.png')} style={styles.iconSmall} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.timeText}>早上 08:00</Text>
            <Text style={styles.medicineText}>保健品</Text>
          </View>
        </View>
        <View style={styles.reminderItem}>
          <View style={styles.iconContainer}>
            <Image source={require('../img/medicine/clock.png')} style={styles.icon} />
            <Image source={require('../img/medicine/health.png')} style={styles.iconSmall} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.timeText}>早上 08:30</Text>
            <Text style={styles.medicineText}>高血壓</Text>
          </View>
        </View>
      </View>

      {/* Home Button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#FF9500' }]}
        onPress={() => router.push('/medicine')}
      >
        <Text style={styles.buttonText}>回前頁</Text>
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
    backgroundColor: '#65B6E4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10
  },
  home: { 
    width: 50, 
    height: 50,
    marginTop: 15 
  },
  logo: { 
    width: 60, 
    height: 60,
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

  periodBox: {
    marginTop: 10,
    backgroundColor: '#F4C80B',
    borderWidth: 4,
    borderColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 40,
    borderRadius: 0,
    alignSelf: 'center',
    height: 60
  },
  periodText: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center'
  },

  reminderBox: {
    marginTop: 20,
    width: '90%',
    gap: 12,
    alignSelf: 'center'
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4FA878',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 4,
    borderColor: '#000',
    height: 100
  },
  iconContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 10
  },
  icon: {
    width: 30,
    height: 30,
  },
  iconSmall: {
    width: 30,
    height: 30,
  },
  textContainer: {
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'center'
  },
  timeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10 // 增加兩行間距
  },
  medicineText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff'
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