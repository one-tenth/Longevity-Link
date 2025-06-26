import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import axios from 'axios';
import Toast from 'react-native-toast-message';

export default function FcmDemoScreen() {
  const [token, setToken] = useState('');
  const [title, setTitle] = useState('Hello FCM');
  const [body, setBody] = useState('這是一則測試通知');

  useEffect(() => {
    const getToken = async () => {
      try {
        const fcmToken = await messaging().getToken();
        setToken(fcmToken);
        console.log('🔥 FCM Token:', fcmToken);
      } catch (error) {
        console.log('❌ 無法取得 FCM token', error);
      }
    };

    getToken();

    // 監聽 FCM 推播訊息（App 在前景）
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      Toast.show({
        type: 'info',
        text1: remoteMessage.notification?.title ?? '📩 收到通知',
        text2: remoteMessage.notification?.body ?? '',
      });
    });

    return unsubscribe;
  }, []);

  const sendNotification = async () => {
    try {
      await axios.post('http://192.168.0.55:8000/api/send-fcm/', {
        token,
        title,
        body,
      });

      Toast.show({
        type: 'success',
        text1: '✅ 通知已送出',
        text2: '等待手機收到通知...',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: '❌ 傳送失敗',
        text2: error?.message ?? '未知錯誤',
      });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📱 自己的 FCM Token</Text>
      <Text selectable style={styles.token}>{token}</Text>

      <TextInput
        placeholder="🔑 目標 FCM Token（可修改）"
        value={token}
        onChangeText={setToken}
        style={styles.input}
        multiline
      />
      <TextInput
        placeholder="🔔 通知標題"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      <TextInput
        placeholder="📝 通知內容"
        value={body}
        onChangeText={setBody}
        style={styles.input}
      />
      <Button title="📤 發送通知" onPress={sendNotification} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  token: {
    fontSize: 12,
    color: '#333',
    marginBottom: 20,
    backgroundColor: '#f4f4f4',
    padding: 10,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginBottom: 10,
    padding: 10,
    fontSize: 14,
  },
});
