import React, { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import notifee, { AndroidImportance, AuthorizationStatus, EventType } from '@notifee/react-native';
import { useNavigation } from '@react-navigation/native';

export default function TestNotification() {
  const navigation = useNavigation();

  useEffect(() => {
    // 設置通知頻道
    const setupNotification = async () => {
      await setupScamNotificationChannel();  // 設置頻道
      await ensureNotificationPermission();  // 確保權限
      await sendTestNotification();  // 發送測試通知
    };

    setupNotification();
  }, []);

  // 設置詐騙通知頻道
  const setupScamNotificationChannel = async () => {
    await notifee.createChannel({
      id: 'scam',
      name: '詐騙來電提醒',
      importance: AndroidImportance.HIGH,
    });
    console.log('[scamNotification] 詐騙通知頻道設置成功');
  };

  // 申請通知權限
  const ensureNotificationPermission = async (): Promise<boolean> => {
    try {
      const settings = await notifee.requestPermission();
      const ok =
        settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
      console.log('[scamNotification] permission status:', settings.authorizationStatus, 'ok=', ok);
      return ok;
    } catch (e) {
      console.log('[scamNotification] requestPermission error:', e);
      return false;
    }
  };

  // 發送測試通知
  const sendTestNotification = async () => {
    const title = '⚠️ 測試通知';
    const body = '這是測試通知，請忽略。';

    console.log('正在發送測試通知:', title, body);

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: 'scam',
        smallIcon: 'ic_launcher', // 設置您的小圖示
        pressAction: { id: 'default' },
      },
    });
  };

  // 前景通知點擊事件
  notifee.onForegroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS && detail.notification?.data) {
      const data = detail.notification.data;
      console.log('點擊測試通知:', data);
      // 根據需求進行處理
      navigation.navigate('ElderHome');
    }
  });

  return null; // 不渲染任何內容
}
