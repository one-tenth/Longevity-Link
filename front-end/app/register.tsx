import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Button, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { register } from '../api/authApi';

const years = Array.from({ length: 60 }, (_, i) => 1970 + i);
const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

export default function RegisterScreen({ navigation }: any) {
  const [form, setForm] = useState({
    Name: '',
    Gender: 'M',
    year: '1970',
    month: '01',
    day: '01',
    Phone: '',
    Password: '',
  });

  const handleGender = (Gender: 'M' | 'F') => setForm({ ...form, Gender });

  const handleRegister = async () => {
  const Borndate = `${form.year}-${form.month}-${form.day}`;
  try {
    await register({
      Name: form.Name,
      Gender: form.Gender as 'M' | 'F',
      Borndate,
      Phone: form.Phone,
      password: form.Password,
    });
    Alert.alert('註冊成功', '請前往登入');
    navigation.navigate('Login' as never);
  } catch (error: any) {
    console.error(error.response?.data || error.message);
    Alert.alert('註冊失敗', '請確認資訊是否填寫正確');
  }
};


  return (
    <View style={styles.container}>
      {/* Logo區 */}
      <View style={styles.logoArea}>
        {/* 這裡可用Image元件放Logo */}
        <Text style={styles.logo}>🧑‍🦳 CareMate</Text>
      </View>

      {/* 姓名 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>姓名</Text>
        <TextInput
          placeholder="請輸入姓名"
          value={form.Name}
          onChangeText={(text) => setForm({ ...form, Name: text })}
          style={styles.input}
        />
      </View>

      {/* 性別 */}
      <Text style={[styles.label, { alignSelf: 'flex-start', marginLeft: 20 }]}>性別</Text>
<View style={styles.genderRow}>
  <TouchableOpacity
    style={[styles.genderBtn, form.Gender === 'M' && styles.genderSelected]}
    onPress={() => setForm({ ...form, Gender: 'M' })}
  >
    <Text style={styles.genderText}>男</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.genderBtn, form.Gender === 'F' && styles.genderSelected]}
    onPress={() => setForm({ ...form, Gender: 'F' })}
  >
    <Text style={styles.genderText}>女</Text>
  </TouchableOpacity>
</View>


      {/* 生日 */}
      <Text style={[styles.label, { alignSelf: 'flex-start', marginLeft: 20 }]}>生日</Text>
      <View style={styles.birthdayRow}>
        <Picker
          selectedValue={form.year}
          style={styles.picker}
          onValueChange={(value) => setForm({ ...form, year: value })}
        >
          {years.map((y) => (
            <Picker.Item key={y} label={y.toString()} value={y.toString()} />
          ))}
        </Picker>
        <Picker
          selectedValue={form.month}
          style={styles.picker}
          onValueChange={(value) => setForm({ ...form, month: value })}
        >
          {months.map((m) => (
            <Picker.Item key={m} label={m} value={m} />
          ))}
        </Picker>
        <Picker
          selectedValue={form.day}
          style={styles.picker}
          onValueChange={(value) => setForm({ ...form, day: value })}
        >
          {days.map((d) => (
            <Picker.Item key={d} label={d} value={d} />
          ))}
        </Picker>
      </View>

      {/* 手機號碼 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>電話號碼</Text>
        <TextInput
          placeholder="請輸入手機號碼 EX:09XXXXXXXX"
          value={form.Phone}
          onChangeText={(text) => setForm({ ...form, Phone: text })}
          keyboardType="phone-pad"
          style={styles.input}
        />
      </View>

      {/* 密碼 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>密碼</Text>
        <TextInput
          placeholder="Value"
          value={form.Password}
          onChangeText={(text) => setForm({ ...form, Password: text })}
          secureTextEntry
          style={styles.input}
        />
      </View>

      {/* 註冊按鈕 */}
      <TouchableOpacity style={styles.btn} onPress={handleRegister}>
        <Text style={styles.btnText}>註冊</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#FEFEE7', paddingTop: 0 },
  logoArea: { backgroundColor: '#A3D8F4', width: '100%', alignItems: 'center', paddingVertical: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'center' },
  logo: { fontSize: 26, fontWeight: 'bold', color: '#222', marginLeft: 8 },
  inputGroup: { width: '90%', marginTop: 6 },
  label: { fontWeight: 'bold', color: '#2E2E2E', marginBottom: 2 },
  input: { backgroundColor: '#E6F7EE', borderRadius: 7, borderColor: '#196F3D', borderWidth: 2, padding: 8, marginBottom: 2 },
  genderRow: { flexDirection: 'row', width: '90%', marginBottom: 6, justifyContent: 'space-between' },
  genderBtn: { flex: 1, backgroundColor: '#FFDB5C', marginHorizontal: 5, borderRadius: 4, alignItems: 'center', padding: 10, borderWidth: 2, borderColor: '#FFB800' },
  genderSelected: { backgroundColor: '#FFB800' },
  genderText: { fontWeight: 'bold', fontSize: 18 },

  birthdayRow: {
    flexDirection: 'row',
    width: '100%',     // 讓三個 picker 有夠寬空間
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  picker: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 4,
    backgroundColor: '#F7F9F9',
    borderRadius: 5,
  },
  // 👆這裡結束

  btn: { backgroundColor: '#FFB800', borderRadius: 6, marginTop: 18, width: '90%', alignItems: 'center', padding: 12 },
  btnText: { color: '#222', fontSize: 18, fontWeight: 'bold' },
});
