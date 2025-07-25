import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // 確保你在 App.tsx 定義了 index 頁面

type NavProp = StackNavigationProp<RootStackParamList, 'MemberSetting'>;

export default function MemberSetting() {
  const navigation = useNavigation<NavProp>();

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [birthYear, setBirthYear] = useState('1970');
  const [birthMonth, setBirthMonth] = useState('01');
  const [birthDay, setBirthDay] = useState('01');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const years = Array.from({ length: 60 }, (_, i) => `${1970 + i}`);
  const months = Array.from({ length: 12 }, (_, i) => `${(i + 1).toString().padStart(2, '0')}`);
  const days = Array.from({ length: 31 }, (_, i) => `${(i + 1).toString().padStart(2, '0')}`);

  const handleSubmit = () => {
    console.log({ name, gender, birthYear, birthMonth, birthDay, phone, password });
    // 將來可串接 API，現在直接跳轉
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../img/family/member.png')} style={styles.icon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/family/logo.png')} style={styles.logo} />
      </View>

      {/* 姓名 */}
      <View style={styles.inputGroup}>
        <Image source={require('../img/family/name.png')} style={styles.inputIcon} />
        <View style={styles.inputBox}>
          <Text style={styles.label}>姓名</Text>
          <TextInput
            style={styles.input}
            placeholder="Value"
            value={name}
            onChangeText={setName}
          />
        </View>
      </View>

      {/* 性別 */}
      <View style={styles.genderContainer}>
        <Text style={styles.label}>性別</Text>
        <View style={styles.genderButtons}>
          <TouchableOpacity
            style={[styles.genderButton, gender === '男' && styles.selectedGender]}
            onPress={() => setGender('男')}
          >
            <Text style={styles.genderText}>男</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderButton, gender === '女' && styles.selectedGender]}
            onPress={() => setGender('女')}
          >
            <Text style={styles.genderText}>女</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 生日 */}
      <View style={styles.birthContainer}>
        <Text style={styles.label}>生日</Text>
        <View style={styles.pickerRow}>
          <Picker selectedValue={birthYear} style={styles.picker} onValueChange={setBirthYear}>
            {years.map((year) => (
              <Picker.Item key={year} label={year} value={year} />
            ))}
          </Picker>
          <Picker selectedValue={birthMonth} style={styles.picker} onValueChange={setBirthMonth}>
            {months.map((month) => (
              <Picker.Item key={month} label={month} value={month} />
            ))}
          </Picker>
          <Picker selectedValue={birthDay} style={styles.picker} onValueChange={setBirthDay}>
            {days.map((day) => (
              <Picker.Item key={day} label={day} value={day} />
            ))}
          </Picker>
        </View>
      </View>

      {/* 帳號 */}
      <View style={styles.inputGroup}>
        <Image source={require('../img/family/phone.png')} style={styles.inputIcon} />
        <View style={styles.inputBox}>
          <Text style={styles.label}>帳號（電話號碼）</Text>
          <TextInput
            style={styles.input}
            placeholder="Value"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* 密碼 */}
      <View style={styles.inputGroup}>
        <Image source={require('../img/family/lock.png')} style={styles.inputIcon} />
        <View style={styles.inputBox}>
          <Text style={styles.label}>密碼</Text>
          <TextInput
            style={styles.input}
            placeholder="Value"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      {/* 新增按鈕 */}
      <TouchableOpacity style={styles.submitButton} 
      onPress={() => navigation.navigate('index')}>
        <Text style={styles.submitText}>新增</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFF0',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height:70,
    flexDirection: 'row', 
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    position: 'relative',
    marginBottom:20,
    paddingLeft:10,
    paddingRight:10,
  },
    icon: {
    width: 40, 
    height: 40,
    marginTop:15,
  },
  title: {
    fontSize: 50, 
    fontWeight:'900', 
    color: '#000', 
  },
  logo: {
    width: 60, 
    height: 60,
    marginTop:15,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#a6d5a7',
    marginTop: 20,
    padding: 10,
    borderRadius: 10,
  },
  inputIcon: {
  width: 26,
  height: 26,
},

  inputBox: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 10,
    width: 220,
  },
  label: { fontSize: 14, color: '#333', marginBottom: 2 },
  input: { fontSize: 16, color: '#000', paddingVertical: 4 },

  genderContainer: { marginTop: 20, alignItems: 'center' },
  genderButtons: { flexDirection: 'row', marginTop: 5 },
  genderButton: {
    backgroundColor: '#f2c94c',
    paddingVertical: 8,
    paddingHorizontal: 30,
    marginHorizontal: 5,
    borderRadius: 5,
  },
  selectedGender: {
    backgroundColor: '#f7941d',
  },
  genderText: { fontSize: 16, fontWeight: 'bold' },

  birthContainer: { marginTop: 20, alignItems: 'center' },
  pickerRow: { flexDirection: 'row' },
  picker: { width: 80, backgroundColor: '#fff', marginHorizontal: 5 },

  submitButton: {
    backgroundColor: '#f7941d',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 60,
    marginTop: 30,
  },
  submitText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});
