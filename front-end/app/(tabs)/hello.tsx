// front-end/app/(tabs)/hello.tsx

import axios from 'axios';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export default function HelloScreen() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    axios.get('http://192.168.0.21:8000/api/hello/')
      .then(response => {
        setMessage(response.data.message);
      })
      .catch(error => {
        console.error('API error:', error);
        setMessage('連線失敗，請檢查後端');
      });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text style={{ fontSize: 20 }}>{message}</Text>
    </View>
  );
}
