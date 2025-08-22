// initNotification.ts
import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  RepeatFrequency,
} from '@notifee/react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native'; // ⬅️ 新增

function createTriggerTime(timeStr: string): Date {
  const [hour, minute] = timeStr.split(':').map(Number);
  const now = new Date();
  const triggerTime = new Date(now);
  triggerTime.setHours(hour, minute, 0, 0);
  if (triggerTime <= now) {
    triggerTime.setDate(triggerTime.getDate() + 1);
  }
  return triggerTime;
}

export async function initMedicationNotifications() {
  const token = await AsyncStorage.getItem('access');
  console.log('🔑 access token =', token);

  if (!token) {
    console.log('❌ 沒有 token，跳出 init');
    return;
  }

  try {
    console.log('📡 發送 API 請求到 /api/get-med-reminders/');
    const response = await axios.get('http://192.168.0.55:8000/api/get-med-reminders/', {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('✅ 後端回傳資料:', response.data);
    const schedule = response.data;

    // ☑️ 檢查是否所有時段都沒有設定
    const allEmpty = Object.values(schedule).every(
      (d: any) => !d.time || !Array.isArray(d.meds) || d.meds.length === 0
    );
    if (allEmpty) {
      Alert.alert('尚未設定用藥時間', '請通知家人至設定頁為長者設定每日用藥時間。');
      console.log('⚠️ 所有時段皆未設定，已跳出提示。');
      return;
    }

    // 🔔 建立通知
    for (const [period, data] of Object.entries(schedule)) {
      const time = data.time;
      const meds = data.meds;

      console.log(`🕒 ${period} 時間 = ${time}，藥物 = ${meds.join(', ')}`);

      if (!time || meds.length === 0) continue;

      const triggerTime = createTriggerTime(time);

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTime.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
        alarmManager: true,
      };

      await notifee.createTriggerNotification(
        {
          title: `💊 ${period} 吃藥提醒`,
          body: `請記得服用：${meds.join(', ')}`,
          android: {
            channelId: 'medication',
            smallIcon: 'ic_launcher',
          },
        },
        trigger
      );

      console.log(`🔔 通知已建立：${period} → ${time}`);
    }
  } catch (error) {
    console.error('取得提醒資料失敗', error);
  }
}

export async function setupNotificationChannel() {
  await notifee.createChannel({
    id: 'medication',
    name: '吃藥提醒',
    importance: AndroidImportance.HIGH,
  });
}
