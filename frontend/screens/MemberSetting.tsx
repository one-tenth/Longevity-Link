import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image source={require('../img/family/member.png')} style={styles.icon} />
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/family/logo.png')} style={styles.logo} />
      </View>

      {/* 姓名輸入欄 */}
      <View style={styles.inputContainer}>
        <View style={styles.inputBoxTop}>
          <Image source={require('../img/family/name.png')} style={styles.inputIcon} />
          <Text style={styles.inputLabel}>姓名</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.inputOuterBox}>
          <TextInput
            style={styles.inputInnerBox}
            placeholder="請輸入姓名"
            value={name}
            onChangeText={setName}
          />
        </View>
      </View>

      {/* 性別選擇 */}
      <View style={styles.genderContainer}>
        <Text style={styles.genderLabel}>性別</Text>
        <View style={styles.genderButtons}>
          <TouchableOpacity style={[styles.genderButton, gender === '男' && styles.selectedGender]} onPress={() => setGender('男')}>
            <Text style={styles.genderText}>男</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.genderButton, gender === '女' && styles.selectedGender]} onPress={() => setGender('女')}>
            <Text style={styles.genderText}>女</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 生日選擇 */}
      <View style={styles.birthContainer}>
        <Text style={styles.genderLabel}>生日</Text>
        <View style={styles.pickerRow}>
          <View style={styles.pickerWrapper}><Picker selectedValue={birthYear} onValueChange={setBirthYear} style={styles.picker}>{years.map(year => <Picker.Item key={year} label={year} value={year} />)}</Picker></View>
          <View style={styles.pickerWrapper}><Picker selectedValue={birthMonth} onValueChange={setBirthMonth} style={styles.picker}>{months.map(month => <Picker.Item key={month} label={month} value={month} />)}</Picker></View>
          <View style={styles.pickerWrapper}><Picker selectedValue={birthDay} onValueChange={setBirthDay} style={styles.picker}>{days.map(day => <Picker.Item key={day} label={day} value={day} />)}</Picker></View>
        </View>
      </View>

      {/* 帳號輸入欄 */}
      <View style={styles.inputContainer}>
        <View style={styles.inputBoxTop}>
          <Image source={require('../img/family/phone.png')} style={styles.inputIcon} />
          <Text style={styles.inputLabel}>帳號（電話號碼）</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.inputOuterBox}>
          <TextInput
            style={styles.inputInnerBox}
            placeholder="請輸入電話"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* 密碼輸入欄 */}
      <View style={styles.inputContainer}>
        <View style={styles.inputBoxTop}>
          <Image source={require('../img/family/lock.png')} 
          style={styles.inputIcon}
          resizeMode="contain" />
          <Text style={styles.inputLabel}>密碼</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.inputOuterBox}>
          <TextInput
            style={styles.inputInnerBox}
            placeholder="請輸入密碼"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={() => navigation.navigate('index')}>
        <Text style={styles.submitText}>新增</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#FFFFF0',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  icon: { 
    width: 40, 
    height: 40, 
    marginTop: 15 
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

  inputContainer: {
    width: '75%',
    alignSelf: 'center',
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#000',
    overflow: 'hidden',
  },
  inputBoxTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#549D77',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputIcon: { 
    width: 24, 
    height: 24 
  },
  inputLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 'auto',
  },
  divider: { 
    height: 3, 
    backgroundColor: '#000' 
  },
  inputOuterBox: { 
    backgroundColor: '#77A88D', 
    padding: 3
  },
  inputInnerBox: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '900',
    borderRadius: 8,
  },

  genderContainer: { 
    width: '75%', 
    marginTop: 10, 
    alignSelf: 'flex-start', 
    paddingLeft: '12.5%' 
  },
  genderLabel: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#000' 
  },
  genderButtons: { 
    flexDirection: 'row', 
    marginTop: 8 
  },
  genderButton: {
    backgroundColor: '#f2c94c',
    paddingVertical: 10,
    paddingHorizontal: 57,
    borderRadius: 6,
    marginRight: 15,
    borderWidth: 3,
    borderColor: '#000',
  },
  selectedGender: { 
    backgroundColor: '#f7941d' 
  },
  genderText: { 
    fontSize: 20, 
    fontWeight: '900' 
  },

  birthContainer: { 
    width: '75%', 
    marginTop: 20, 
    alignSelf: 'flex-start', 
    paddingLeft: '12.5%' 
  },
  pickerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  pickerWrapper: {
    backgroundColor: '#f2c94c',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 6,
    paddingHorizontal: 4,
    marginRight: 10,
  },
  picker: { 
    width: 80, 
    backgroundColor: '#fff' 
  },

  submitButton: {
    backgroundColor: '#f7941d',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 80,
    marginVertical: 30,
    borderWidth: 3,
  },
  submitText: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#000' 
  },
});
