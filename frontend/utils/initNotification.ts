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
import { navigationRef } from '../App'; // 全域導航用

// ===== 工具：時間字串轉為明日時間點 =====
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

// ===== 初始化通知（App 啟動後執行）=====
export async function initMedicationNotifications(): Promise<'success' | 'no-time' | 'no-meds' | 'no-token' | 'error'> {
  const token = await AsyncStorage.getItem('access');
  console.log('🔑 access token =', token);

  if (!token) {
    console.log('❌ 沒有 token，跳出 init');
    return 'no-token';
  }

  try {
    console.log('📡 發送 API 請求到 /api/get-med-reminders/');
    const response = await axios.get('http://192.168.0.55:8000/api/get-med-reminders/', {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('✅ 後端回傳資料:', response.data);
    const schedule = response.data;

    // 儲存下來供背景事件使用
    await AsyncStorage.setItem('medReminderData', JSON.stringify(schedule));

    const allEmpty = Object.values(schedule).every(
      (d: any) => !d.time || !Array.isArray(d.meds) || d.meds.length === 0
    );
    if (allEmpty) {
      Alert.alert('尚未設定用藥時間', '請通知家人至設定頁為長者設定每日用藥時間。');
      return 'no-time';
    }

    let medsExist = false;

    for (const [period, data] of Object.entries(schedule)) {
      const time = data.time;
      const meds = data.meds;

      if (!time || meds.length === 0) continue;

      medsExist = true;

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
            pressAction: { id: 'default' },
          },
          data: {
            period,
            meds: meds.join(','), // 給點擊通知時用
            time, // 👈 加這行！
          },
        },
        trigger
      );

      console.log(`🔔 通知已建立：${period} → ${time}`);
    }

    if (!medsExist) {
      Alert.alert('目前無需提醒藥物', '尚未為任何時段設定藥物。');
      return 'no-meds';
    }

    return 'success';
  } catch (error) {
    console.error('❌ 取得提醒資料失敗', error);
    return 'error';
  }
}

// ===== 建立 Android 通知頻道 =====
export async function setupNotificationChannel() {
  await notifee.createChannel({
    id: 'medication',
    name: '吃藥提醒',
    importance: AndroidImportance.HIGH,
  });
}

// ===== 前景通知點擊處理（App 有開著）=====
notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data) {
    const { period, meds,time } = detail.notification.data;
    navigationRef.current?.navigate('ElderMedRemind', {
      period,
      meds: meds?.split(','),
      time, // ✅ 加上這行
    });
  }
});

// ===== 背景通知點擊處理（App 被關掉）=====
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data) {
    const { period, meds, time } = detail.notification.data;

    console.log('📦 背景事件觸發，儲存通知資料', period, meds, time);

    // 儲存資料（如果你要用）
    await AsyncStorage.setItem('notificationPeriod', period || '');
    await AsyncStorage.setItem('notificationMeds', meds || '');
    await AsyncStorage.setItem('notificationTime', time || '');

    // 預防 app 還沒初始化完成
    setTimeout(() => {
      navigationRef.current?.navigate('ElderMedRemind', {
        period,
        meds: meds?.split(','),
        time,
      });
    }, 1000);
  }
});
