import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // 確認 App.tsx 裡定義了這個

// ElderHome 頁面的 navigation 型別
type AddHospitalRecordNavProp = StackNavigationProp<RootStackParamList, 'AddHospitalRecord'>;


export default function AddHospitalRecord() {
  const navigation = useNavigation<AddHospitalRecordNavProp>();

  const [dateText, setDateText] = useState('05/25');
  const [timeText, setTimeText] = useState('09:30');
  const [location, setLocation] = useState('臺大醫院');
  const [doctor, setDoctor] = useState('XXX');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('ChildHome')}>
          <Image source={require('../img/hospital/hospital.png')} style={styles.hospitalIcon} />
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

      <View style={styles.cardBox}>
        <View style={styles.cardRow}>
          <Image source={require('../img/hospital/clock.png')} style={styles.icon} />
          <Text style={styles.cardTitle}>時間</Text>
        </View>
        <View style={styles.rowInput}>
          <TextInput style={styles.timeInput} value={dateText} onChangeText={setDateText} placeholder="MM/DD" />
          <TextInput style={styles.timeInput} value={timeText} onChangeText={setTimeText} placeholder="HH:MM" />
        </View>
      </View>

      <View style={styles.cardBox}>
        <View style={styles.cardRow}>
          <Image source={require('../img/hospital/locate.png')} style={styles.icon} />
          <Text style={styles.cardTitle}>地點</Text>
        </View>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="臺大醫院"
        />
      </View>

      <View style={styles.cardBox}>
        <View style={styles.cardRow}>
          <Image source={require('../img/hospital/doctor.png')} style={styles.icon} />
          <Text style={styles.cardTitle}>醫師</Text>
        </View>
        <TextInput
          style={styles.input}
          value={doctor}
          onChangeText={setDoctor}
          placeholder="XXX"
        />
      </View>

      <TouchableOpacity style={[styles.button, styles.addButton]}>
        <Text style={styles.buttonText}>新增</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.backButton]}
        onPress={() => navigation.navigate('ChildHome')}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#65B6E4',
    padding: 10
  },
  hospitalIcon: {
    width: 50,
    height: 50
  },
  logo: {
    width: 60,
    height: 60
  },
  title: {
    fontSize: 36,
    fontWeight: '900'
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin:5,
    marginLeft: 10,
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
    padding: 5,
    borderRadius: 10
  },
  profileIcon: {
    width: 50,
    height: 50,
    marginRight: 10
  },
  profileText: {
    fontSize: 24,
    fontWeight: '900'
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginLeft: 20
  },
  cardBox: {
    backgroundColor: '#F4C80B',
    margin: 10,
    marginBottom: 3,
    borderRadius: 10,
    padding: 5,
    borderWidth: 3
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 10
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900'
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    fontSize: 18,
        color:'#111'

  },
  timeInput: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    fontSize: 18,
    flex: 1,
    marginHorizontal: 5,
    textAlign: 'center'
  },
  rowInput: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  button: {
    marginTop: 10,
    marginHorizontal: 30,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center'
  },
  addButton: {
    backgroundColor: '#65B6E4',
    borderWidth: 3

  },
  backButton: {
    backgroundColor: '#F58402',

  },
  buttonText: {
    fontSize: 22,
    fontWeight: '900',
  }
});
