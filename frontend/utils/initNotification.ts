import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  RepeatFrequency,
  EventType,
} from '@notifee/react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { navigationRef } from '../App';

// ===== 工具：時間字串轉日期 =====
function createTriggerTime(timeStr: string): Date {
  const [hour, minute] = timeStr.split(':').map(Number);
  const now = new Date();
  const triggerTime = new Date(now);
  triggerTime.setHours(hour, minute, 0, 0);
  if (triggerTime <= now) triggerTime.setDate(triggerTime.getDate() + 1);
  return triggerTime;
}

// ===== 初始化提醒 =====
export async function initMedicationNotifications(): Promise<
  'success' | 'no-time' | 'no-meds' | 'no-token' | 'not-elder' | 'error'
> {
  const token = await AsyncStorage.getItem('access');
  if (!token) {
    console.log('❌ 無 token');
    return 'no-token';
  }

  try {
    // 取得目前使用者
    const meRes = await axios.get('http://192.168.0.55:8000/account/me/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = meRes.data;
    console.log('✅ 使用者資訊:', user);

    // 非長者不排通知
    if (user.RelatedID === null) {
      console.log('👨‍👩‍👧 家人帳號，不排通知');
      return 'not-elder';
    }

    // 呼叫提醒 API
    const res = await axios.get('http://192.168.0.55:8000/api/get-med-reminders/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const schedule = res.data;
    console.log('✅ 提醒排程資料:', schedule);

    await AsyncStorage.setItem('medReminderData', JSON.stringify(schedule));

    // 檢查是否有設定時間與藥物
    const allEmpty = Object.values(schedule).every(
      (d: any) => !d.time || !Array.isArray(d.meds) || d.meds.length === 0
    );
    if (allEmpty) {
      Alert.alert('尚未設定用藥時間', '請通知家人設定。');
      return 'no-time';
    }

    let medsExist = false;

    for (const [period, data] of Object.entries(schedule)) {
      const { time, meds } = data as { time: string; meds: string[] };

      if (!time || meds.length === 0) continue;
      medsExist = true;

      const triggerTime = createTriggerTime(time);
      console.log(`🔔 預排：${period} → ${time} (${triggerTime})`);

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTime.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
        alarmManager: true,
      };

      await notifee.createTriggerNotification(
        {
          title: `💊 ${period} 吃藥提醒`,
          body: `請記得服用：${meds.map(m => String(m)).join(', ')}`,
          android: {
            channelId: 'medication',
            smallIcon: 'ic_launcher',
            pressAction: { id: 'default' },
          },
          data: {
            period,
            meds: meds.join(','),
            time,
          },
        },
        trigger
      );

      console.log(`✅ 已排程：${period} → ${time}`);
    }

    if (!medsExist) {
      Alert.alert('尚無藥物設定', '請由家人設定用藥內容。');
      return 'no-meds';
    }

    return 'success';
  } catch (err: any) {
    console.error('❌ 排程失敗:', err?.response?.data || err.message || err);
    return 'error';
  }
}

// ===== Android 通知頻道 =====
export async function setupNotificationChannel() {
  await notifee.createChannel({
    id: 'medication',
    name: '吃藥提醒',
    importance: AndroidImportance.HIGH,
  });
}

// ===== 通知點擊處理（App 前景）=====
notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data) {
    const { period, meds, time } = detail.notification.data;
    navigationRef.current?.navigate('ElderMedRemind', {
      period,
      meds: meds?.split(','),
      time,
    });
  }
});

// ===== 通知點擊處理（App 背景）=====
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data) {
    const { period, meds, time } = detail.notification.data;
    await AsyncStorage.setItem('notificationPeriod', period || '');
    await AsyncStorage.setItem('notificationMeds', meds || '');
    await AsyncStorage.setItem('notificationTime', time || '');

    // 延遲避免跳太快
    setTimeout(() => {
      navigationRef.current?.navigate('ElderMedRemind', {
        period,
        meds: meds?.split(','),
        time,
      });
    }, 1000);
  }
});
