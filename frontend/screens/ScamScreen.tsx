// screens/ScamScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import axios from 'axios';

const API_BASE = 'http://192.168.0.91:8000'; // ⚠️換成實際 IP

export default function ScamScreen() {
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('詐騙');

  const addScam = async () => {
    if (!phone) {
      Alert.alert('錯誤', '請輸入電話號碼');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/api/scam/add/`, {
        Phone: phone,
        Category: category,
      });
      Alert.alert('成功', `Scam 新增成功，ID=${res.data.ScamId}`);
      setPhone('');
      setCategory('詐騙');
    } catch (err: any) {
      console.error(err);
      Alert.alert('失敗', '新增失敗，請檢查後端');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>新增 Scam</Text>
      <TextInput
        style={styles.input}
        placeholder="電話號碼"
        value={phone}
        onChangeText={setPhone}
      />
      <TextInput
        style={styles.input}
        placeholder="類別 (預設: 詐騙)"
        value={category}
        onChangeText={setCategory}
      />
      <Button title="新增" onPress={addScam} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
});
