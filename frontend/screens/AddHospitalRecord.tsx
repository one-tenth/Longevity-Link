import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Image,
  TouchableOpacity, Alert, Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type AddHospitalRecordNavProp = StackNavigationProp<RootStackParamList, 'AddHospitalRecord'>;

export default function AddHospitalRecord() {
  const navigation = useNavigation<AddHospitalRecordNavProp>();

  const [clinicDate, setClinicDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState('臺大醫院');
  const [doctor, setDoctor] = useState('XXX');

  const handleSubmit = async () => {
    try {
      const dateStr = clinicDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const hour = clinicDate.getHours().toString().padStart(2, '0');
      const minute = clinicDate.getMinutes().toString().padStart(2, '0');
      const time = `${hour}:${minute}`;

      const token = '你的Token'; // TODO: 改成實際 token
      const response = await fetch('http://172.20.10.2:8000/api/hos/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ClinicDate: dateStr,
          ClinicPlace: location,
          Doctor: doctor,
          Num: 1  // TODO: 可依需求設定
        }),
      });

      if (response.ok) {
        Alert.alert('成功', '回診資料已新增');
        navigation.goBack();
      } else {
        Alert.alert('失敗', '無法新增資料');
      }
    } catch (error) {
      console.error('錯誤:', error);
      Alert.alert('錯誤', '請檢查網路或資料格式');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('ChildHome')}>
          <Image source={require('../img/hospital/hospital.png')} style={styles.hospitalIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/hospital/logo.png')} style={styles.logo} />
      </View>

      {/* Profile */}
      <View style={styles.profileRow}>
        <View style={styles.profileBox}>
          <Image source={require('../img/hospital/elderly.png')} style={styles.profileIcon} />
          <Text style={styles.profileText}>爺爺</Text>
        </View>
        <Text style={styles.sectionTitle}>看診紀錄</Text>
      </View>

      {/* 日期與時間 */}
      <View style={styles.cardBox}>
        <View style={styles.cardRow}>
          <Image source={require('../img/hospital/clock.png')} style={styles.icon} />
          <Text style={styles.cardTitle}>時間</Text>
        </View>
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
          <Text style={styles.input}>日期：{clinicDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowTimePicker(true)}>
          <Text style={styles.input}>時間：{clinicDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </TouchableOpacity>
      </View>

      {/* 日期與時間選擇器 */}
      {showDatePicker && (
  <DateTimePicker
    value={clinicDate}
    mode="date"
    display="default" // 不要用 spinner！
    onChange={(event, selectedDate) => {
      setShowDatePicker(false);
      if (selectedDate) setClinicDate(selectedDate);
    }}
  />
)}

// 時間選擇
{showTimePicker && (
  <DateTimePicker
    value={clinicDate}
    mode="time"
    display="default"
    is24Hour={true}
    onChange={(event, selectedTime) => {
      setShowTimePicker(false);
      if (selectedTime) {
        const updated = new Date(clinicDate);
        updated.setHours(selectedTime.getHours());
        updated.setMinutes(selectedTime.getMinutes());
        setClinicDate(updated);
      }
    }}
  />
)}

      {/* 地點 */}
      <View style={styles.cardBox}>
        <View style={styles.cardRow}>
          <Image source={require('../img/hospital/locate.png')} style={styles.icon} />
          <Text style={styles.cardTitle}>地點</Text>
        </View>
        <Picker
          selectedValue={location}
          onValueChange={itemValue => setLocation(itemValue)}
          style={styles.input}
        >
          <Picker.Item label="臺大醫院" value="臺大醫院" />
          <Picker.Item label="長庚醫院" value="長庚醫院" />
          <Picker.Item label="馬偕醫院" value="馬偕醫院" />
        </Picker>
      </View>

      {/* 醫師 */}
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

      {/* 按鈕 */}
      <TouchableOpacity style={[styles.button, styles.addButton]} onPress={handleSubmit}>
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

// ✅ 原本的樣式不動（如有其他 style 檔也可繼續沿用）
const styles = StyleSheet.create({
  // ...維持原樣...
  container: { flex: 1, backgroundColor: '#FCFEED' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: '#65B6E4', padding: 10
  },
  hospitalIcon: { width: 50, height: 50 },
  logo: { width: 60, height: 60 },
  title: { fontSize: 36, fontWeight: '900' },
  profileRow: { flexDirection: 'row', alignItems: 'center', margin: 5, marginLeft: 10 },
  profileBox: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 2,
    borderColor: '#000', backgroundColor: '#fff', padding: 5, borderRadius: 10
  },
  profileIcon: { width: 50, height: 50, marginRight: 10 },
  profileText: { fontSize: 24, fontWeight: '900' },
  sectionTitle: { fontSize: 24, fontWeight: '900', marginLeft: 20 },
  cardBox: {
    backgroundColor: '#F4C80B', margin: 10, marginBottom: 3,
    borderRadius: 10, padding: 5, borderWidth: 3
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  icon: { width: 40, height: 40, marginRight: 10 },
  cardTitle: { fontSize: 24, fontWeight: '900' },
  input: {
    backgroundColor: '#fff', padding: 10, borderRadius: 5,
    fontSize: 18, color: '#111'
  },
  button: {
    marginTop: 10, marginHorizontal: 30, padding: 12,
    borderRadius: 10, borderWidth: 2, borderColor: '#000', alignItems: 'center'
  },
  addButton: { backgroundColor: '#65B6E4', borderWidth: 3 },
  backButton: { backgroundColor: '#F58402' },
  buttonText: { fontSize: 22, fontWeight: '900' }
});
