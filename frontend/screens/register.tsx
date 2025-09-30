import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Image,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Text as SvgText, TextPath, Defs, Path } from 'react-native-svg';
import { avatarMap, avatarKeys } from '../utils/avatarMap';  // ⭐ 共用頭貼

/** 弧形標題 */
function ArcText() {
  return (
    <Svg width={360} height={90} viewBox="0 0 360 90" style={{ alignSelf: 'center' }}>
      <Defs>
        <Path id="curve" d="M60,70 Q180,10 300,70" fill="none" />
      </Defs>
      <SvgText fill="#000000" fontSize={42} fontWeight="bold" fontFamily="FascinateInline-Regular">
        <TextPath href="#curve" startOffset="0%" textAnchor="start">
          .CareMate.
        </TextPath>
      </SvgText>
    </Svg>
  );
}

/** Picker 選項 */
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => String(1930 + i));
const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

type RootStackParamList = {
  RegisterScreen: { mode: 'register' | 'addElder'; creatorId?: number };
};
type RegisterRouteProp = RouteProp<RootStackParamList, 'RegisterScreen'>;

interface RegisterData {
  Name: string;
  Gender: 'M' | 'F';
  Borndate: string;
  Phone: string;
  password: string;
  creator_id?: number;
  avatar?: string;
}

const API_BASE = 'http://192.108.1.106:8000';



export default function RegisterScreen() {
  const navigation = useNavigation();
  const route = useRoute<RegisterRouteProp>();
  const { mode, creatorId } = route.params || { mode: 'register' as const };

  const [form, setForm] = useState({
    Name: '',
    Gender: 'M' as 'M' | 'F',
    year: years[0],
    month: '01',
    day: '01',
    Phone: '',
    Password: '',
    confirmPassword: '',
    avatarKey: avatarKeys[0], // ⭐ 預設第一張
  });

  const handleRegister = async () => {
    if (!form.Name.trim()) return Alert.alert('錯誤', '請輸入姓名');
    if (!/^09\d{8}$/.test(form.Phone)) return Alert.alert('錯誤', '請輸入正確的手機號碼格式 (09開頭，共10碼)');
    if (!form.Password || !form.confirmPassword) return Alert.alert('錯誤', '請輸入密碼與確認密碼');
    if (form.Password.length < 6) return Alert.alert('錯誤', '密碼長度需至少6碼');
    if (form.Password !== form.confirmPassword) return Alert.alert('錯誤', '兩次密碼不一致');

    const Borndate = `${form.year}-${form.month}-${form.day}`;
    const payload: RegisterData = {
      Name: form.Name,
      Gender: form.Gender,
      Borndate,
      Phone: form.Phone,
      password: form.Password,
      avatar: form.avatarKey,
      ...(mode === 'addElder' && creatorId ? { creator_id: creatorId } : {}),
    };

    try {
      const res = await fetch(`${API_BASE}/api/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        if (errorText.includes('Duplicate entry')) {
          Alert.alert('註冊失敗', '此電話號碼已被註冊，請改用其他號碼');
        } else {
          console.error('錯誤回應內容:', errorText);
          Alert.alert('註冊失敗', '請確認資訊是否填寫正確');
        }
        return;
      }

      if (mode === 'addElder') {
        Alert.alert('新增成功', '已成功將長者加入家庭');
        // @ts-ignore
        navigation.navigate('ChildHome');
      } else {
        Alert.alert('註冊成功', '請前往登入');
        // @ts-ignore
        navigation.navigate('LoginScreen');
      }
    } catch (err: any) {
      console.error(err?.message || err);
      Alert.alert('註冊失敗', '請確認伺服器連線或資訊是否正確');
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <ArcText />
          <Image source={require('../img/childhome/1.png')} style={styles.logo} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.formWrapper}>
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
            <Text style={styles.label}>性別</Text>
            <View style={styles.genderRow}>
              {(['M', 'F'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, form.Gender === g && styles.genderSelected]}
                  onPress={() => setForm({ ...form, Gender: g })}
                >
                  <Text style={[styles.genderText, form.Gender === g && { color: '#FFF' }]}>
                    {g === 'M' ? '男' : '女'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 生日 */}
            <Text style={styles.label}>生日</Text>
            <View style={styles.birthdayRow}>
              <View style={styles.pickerWrapperYear}>
                <Picker
                  selectedValue={form.year}
                  onValueChange={(value) => setForm({ ...form, year: value })}
                  style={styles.picker}
                >
                  {years.map((y) => (
                    <Picker.Item key={y} label={y} value={y} />
                  ))}
                </Picker>
              </View>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={form.month}
                  onValueChange={(value) => setForm({ ...form, month: value })}
                  style={styles.picker}
                >
                  {months.map((m) => (
                    <Picker.Item key={m} label={m} value={m} />
                  ))}
                </Picker>
              </View>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={form.day}
                  onValueChange={(value) => setForm({ ...form, day: value })}
                  style={styles.picker}
                >
                  {days.map((d) => (
                    <Picker.Item key={d} label={d} value={d} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* 頭貼選擇 */}
            <Text style={styles.label}>選擇頭貼</Text>
            <View style={styles.avatarRow}>
              {avatarKeys.map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setForm({ ...form, avatarKey: key })}
                  style={[styles.avatarBox, form.avatarKey === key && styles.avatarSelected]}
                >
                  <Image source={avatarMap[key]} style={styles.avatar} />
                </TouchableOpacity>
              ))}
            </View>

            {/* 電話 */}
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
                placeholder="請輸入密碼"
                value={form.Password}
                onChangeText={(text) => setForm({ ...form, Password: text })}
                secureTextEntry
                style={styles.input}
              />
            </View>

            {/* 確認密碼 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>確認密碼</Text>
              <TextInput
                placeholder="請再次輸入密碼"
                value={form.confirmPassword}
                onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
                secureTextEntry
                style={styles.input}
              />
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleRegister}>
              <Text style={styles.btnText}>註冊</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#A0C334', marginTop: 10 }]}
              // @ts-ignore
              onPress={() => navigation.navigate('index')}
            >
              <Text style={styles.btnText}>返回主頁</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

/** 樣式 (保持不變) */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: 20 },
  headerContainer: { alignItems: 'center' },
  logo: { width: 140, height: 140, resizeMode: 'contain', marginTop: -30 },
  scrollContainer: { paddingBottom: 40 },
  formWrapper: {
    backgroundColor: '#FCFCFC',
    borderRadius: 30,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  inputGroup: { marginBottom: 20 },
  label: { fontWeight: 'bold', color: '#4E6E62', marginBottom: 6, fontSize: 18 },
  input: {
    backgroundColor: '#B3CAD8',
    borderRadius: 8,
    borderColor: '#4E6E62',
    borderWidth: 2,
    padding: 12,
    fontSize: 16,
    color: '#2E2E2E',
    fontWeight: 'bold',
  },
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  genderBtn: {
    flex: 1,
    backgroundColor: '#BECBD3',
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: '#4E6E62',
  },
  genderSelected: { backgroundColor: '#4E6E62' },
  genderText: { fontWeight: 'bold', fontSize: 18, color: '#4E6E62' },
  birthdayRow: { flexDirection: 'row', marginBottom: 12 },
  pickerWrapperYear: { width: '36%', backgroundColor: '#B3CAD8', marginRight: 4 },
  pickerWrapper: { width: '30%', backgroundColor: '#B3CAD8', marginLeft: 4 },
  picker: { height: 50, color: '#2E2E2E', fontWeight: 'bold' },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 10 },
  avatarBox: {
    margin: 5,
    padding: 4,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: { borderColor: '#4E6E62' },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  btn: { backgroundColor: '#4E6E62', borderRadius: 10, alignItems: 'center', padding: 14, marginTop: 20 },
  btnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
