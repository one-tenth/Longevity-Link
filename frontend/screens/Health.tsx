import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

type NavProp = StackNavigationProp<RootStackParamList, 'ChildHome'>;

export default function HealthStatus() {
  const navigation = useNavigation<NavProp>();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [steps, setSteps] = useState<number | null>(null);
  const [bpData, setBpData] = useState<{ systolic: number; diastolic: number; pulse: number } | null>(null);

  const fetchData = async (date: Date) => {
    const token = await AsyncStorage.getItem('access');
    const selected = await AsyncStorage.getItem('selectedMember');
    if (!token || !selected) return;

    const member = JSON.parse(selected); // 👈 這就是你選的老人
    const dateStr = date.toLocaleDateString('sv-SE');

    try {
      const stepRes = await axios.get(
        `http://192.168.0.55:8000/api/fitdata/by-date/?date=${dateStr}&user_id=${member.UserID}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSteps(stepRes.data.steps);
    } catch (e) {
      setSteps(null);
    }

    try {
      const bpRes = await axios.get(
        `http://192.168.0.55:8000/api/healthcare/by-date/?date=${dateStr}&user_id=${member.UserID}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBpData({
        systolic: bpRes.data.systolic,
        diastolic: bpRes.data.diastolic,
        pulse: bpRes.data.pulse,
      });
    } catch (e) {
      setBpData(null);
    }
  };


  useEffect(() => {
    fetchData(selectedDate);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/childhome/logo.png')} style={styles.logo} />
      </View>

      <View style={styles.profileRow}>
        <View style={styles.profileBox}>
          <Image source={require('../img/medicine/elderly.png')} style={styles.profileIcon} />
          <Text style={styles.profileText}>爺爺</Text>
        </View>
        <Text style={styles.sectionTitle}>用藥資訊</Text>
      </View>


      <TouchableOpacity onPress={() => setShowPicker(true)}>
        <Text style={{ textAlign: 'center', marginTop: 5 }}>
          📅 選擇日期（目前：{selectedDate.toLocaleDateString('sv-SE')}）
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowPicker(false);
            if (date) {
              setSelectedDate(date);
              fetchData(date);
            }
          }}
        />
      )}

      <View style={styles.card}>
        <Image source={require('../img/health/foot.png')} style={styles.cardIcon} />
        <Text style={styles.cardText}>{steps !== null ? `${steps} 步` : '查無紀錄'}</Text>

      </View>

      <View style={styles.card}>
        <View>
          <Text style={styles.cardText}>收縮壓：{bpData ? bpData.systolic : '未紀錄'}</Text>
          <Text style={styles.cardText}>舒張壓：{bpData ? bpData.diastolic : '未紀錄'}</Text>
          <Text style={styles.cardText}>脈搏：{bpData ? bpData.pulse : '未紀錄'}</Text>
        </View>
      </View>


      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ChildHome')}>

        <Text style={styles.buttonText}>回首頁</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEF4',
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
  title: {
    fontSize: 50,
    fontWeight: '900',
    color: '#000'
  },
  logo: {
    width: 60,
    height: 60,
    marginTop: 15
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
  card: {
    flexDirection: 'row',
    backgroundColor: '#F4C80B',
    marginTop: 20,
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#000',
    alignItems: 'center',
  },
  cardIcon: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  cardText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    marginBottom: 5,
  },
  button: {
    marginTop: 30,
    alignSelf: 'center',
    backgroundColor: '#F58402',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#000',
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000',
  },
});
