import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { createFamily } from '../api/authApi';

interface CreateFamilyProps {
  token: string;
}

export default function CreateFamily({ token }: CreateFamilyProps) {
  const [fcode, setFcode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreate = async () => {
    if (!fcode || !familyName) {
      setError('請填寫家庭代碼與家庭名稱');
      setSuccess('');
      return;
    }

    try {
      const res = await createFamily({ Fcode: fcode, FamilyName: familyName }, token);
      setSuccess('家庭建立成功！');
      setError('');
      setFcode('');
      setFamilyName('');
    } catch (err: any) {
      const msg = err?.response?.data || '建立家庭失敗';
      setError(JSON.stringify(msg));
      setSuccess('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>建立家庭</Text>
      <TextInput
        placeholder="家庭代碼"
        value={fcode}
        onChangeText={setFcode}
        style={styles.input}
      />
      <TextInput
        placeholder="家庭名稱"
        value={familyName}
        onChangeText={setFamilyName}
        style={styles.input}
      />
      <Button title="建立" onPress={handleCreate} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
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
