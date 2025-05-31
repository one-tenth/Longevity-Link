import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { joinFamily } from '../api/authApi';  // 引用加入家庭的 API 函式

interface JoinFamilyProps {
  token: string; 
}

export default function JoinFamily({ token }: JoinFamilyProps) {
  const [fcode, setFcode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleJoin = async () => {
    if (!fcode) {
      setError('請輸入家庭代碼');
      setSuccess('');
      return;
    }

    try {
      const res = await joinFamily({ Fcode: fcode }, token);  // 呼叫 API
      setSuccess('成功加入家庭！');
      setError('');
      setFcode('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || '加入家庭失敗';
      setError(msg);
      setSuccess('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>加入家庭</Text>
      <TextInput
        placeholder="輸入家庭代碼"
        value={fcode}
        onChangeText={setFcode}
        style={styles.input}
      />
      <Button title="加入家庭" onPress={handleJoin} />
      {error && <Text style={styles.error}>{error}</Text>}
      {success && <Text style={styles.success}>{success}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, marginTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  error: { color: 'red', marginTop: 10 },
  success: { color: 'green', marginTop: 10 },
});
