import axios from 'axios';
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';

export default function RegisterScreen() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('M');
  const [borndate, setBorndate] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = () => {
    axios.post('http://192.168.0.21:8000/api/account/users/', {
      phone,
      name,
      gender,
      borndate,     // 格式：YYYY-MM-DD
      password,
    })
    .then(response => {
      setMessage('註冊成功！');
    })
    .catch(error => {
      setMessage('註冊失敗：' + JSON.stringify(error.response?.data || {}));
    });
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput placeholder="手機號碼" value={phone} onChangeText={setPhone} />
      <TextInput placeholder="名字" value={name} onChangeText={setName} />
      <TextInput placeholder="性別 (M 或 F)" value={gender} onChangeText={setGender} />
      <TextInput placeholder="生日 (YYYY-MM-DD)" value={borndate} onChangeText={setBorndate} />
      <TextInput placeholder="密碼" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title="註冊" onPress={handleRegister} />
      <Text>{message}</Text>
    </View>
  );
}
