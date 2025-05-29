import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { register, RegisterData } from './api/authApi';

const RegisterScreen = () => {
  const navigation = useNavigation();

  const [form, setForm] = useState<RegisterData>({
    phone: '',
    name: '',
    gender: 'M', // 預設為男性
    borndate: '',
    password: '',
  });

  const handleRegister = async () => {
    try {
      await register(form);
      Alert.alert('註冊成功', '請前往登入');
      navigation.navigate('Login' as never); // 強制轉型讓 TS 不報錯
    } catch (error: any) {
      console.error(error.response?.data || error.message);
      Alert.alert('註冊失敗', '請確認資訊是否填寫正確');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="手機號碼"
        style={styles.input}
        onChangeText={(text) => setForm({ ...form, phone: text })}
        value={form.phone}
      />
      <TextInput
        placeholder="姓名"
        style={styles.input}
        onChangeText={(text) => setForm({ ...form, name: text })}
        value={form.name}
      />

      {/* ✅ 性別選擇改用 Picker */}
      <Picker
        selectedValue={form.gender}
        onValueChange={(value) => setForm({ ...form, gender: value as 'M' | 'F' })}
        style={styles.input}
      >
        <Picker.Item label="男性" value="M" />
        <Picker.Item label="女性" value="F" />
      </Picker>

      <TextInput
        placeholder="出生年月日 (YYYY-MM-DD)"
        style={styles.input}
        onChangeText={(text) => setForm({ ...form, borndate: text })}
        value={form.borndate}
      />
      <TextInput
        placeholder="密碼"
        secureTextEntry
        style={styles.input}
        onChangeText={(text) => setForm({ ...form, password: text })}
        value={form.password}
      />

      <Button title="註冊" onPress={handleRegister} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, marginBottom: 12, padding: 8, borderRadius: 5 },
});

export default RegisterScreen;
