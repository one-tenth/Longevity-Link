// utils/initNotification.ts
import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  RepeatFrequency,
  EventType,
  AuthorizationStatus,
} from '@notifee/react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { navigationRef } from '../App';

console.log('[initNotification] module loaded');

// ✅ 集中管理 BASE
const BASE = 'http://192.168.31.126:8000';

/** 標準化 HH:mm（支援 08:00、8:0、08:00:00、08:00Z、全形冒號） */
function extractHHMM(raw?: string): { h: number; m: number } | null {
  if (!raw) return null;
  const s = String(raw).replace(/：/g, ':').trim();
  const m = s.match(/(\d{1,2}):(\d{1,2})/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  return { h, m: min };
}

/** 由 HH:mm 產生下一次觸發時間（若已過則 +1 天） */
function createTriggerTime(timeStr: string): Date | null {
  const hm = extractHHMM(timeStr);
  if (!hm) return null;

  const now = new Date();
  const triggerTime = new Date(now);
  triggerTime.setSeconds(0, 0);
  triggerTime.setHours(hm.h, hm.m, 0, 0);

  if (triggerTime.getTime() <= now.getTime()) {
    triggerTime.setDate(triggerTime.getDate() + 1);
  }
  return triggerTime;
}

// ===== Android 通知頻道 =====
export async function setupNotificationChannel() {
  await notifee.createChannel({
    id: 'medication',
    name: '吃藥提醒',
    importance: AndroidImportance.HIGH,
  });
}

/**（可選）Android 13+ 申請通知權限 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    const ok =
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
    console.log('[initNotification] permission status:', settings.authorizationStatus, 'ok=', ok);
    return ok;
  } catch (e) {
    console.log('[initNotification] requestPermission error:', e);
    return false;
  }
}

// ===== 初始化提醒（含友善提示）=====
export async function initMedicationNotifications(): Promise<
  'success' | 'no-time' | 'no-meds' | 'no-token' | 'not-elder' | 'error'
> {
  console.log('[initNotification] initMedicationNotifications() called');

  const token = await AsyncStorage.getItem('access');
  console.log('[initNotification] token prefix:', token?.slice(0, 12));
  if (!token) {
    Alert.alert('尚未登入', '請先登入後再試一次。');
    return 'no-token';
  }

  if (Platform.OS === 'android') {
    await ensureNotificationPermission();
  }

  try {
    // 1) /me
    const meRes = await axios.get(`${BASE}/api/account/me/`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 10000,
    });
    console.log('[initNotification] /me status:', meRes.status);

    const user = meRes.data;
    console.log('✅ 使用者資訊:', user);

    // 若 /me 明確帶 RelatedID 且為 null/undefined → 家人
    const hasRelatedKey = Object.prototype.hasOwnProperty.call(user, 'RelatedID');

    // 2) 取得提醒排程
    let schedule: Record<string, { time?: string; meds?: string[] }>;
    try {
      const res = await axios.get(`${BASE}/api/get-med-reminders/`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        timeout: 10000,
      });
      console.log('[initNotification] reminders status:', res.status);
      schedule = res.data;
      console.log('✅ 提醒排程資料:', schedule);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message;

      if (status === 403) {
        Alert.alert('功能限制', msg || '家人帳號無法取得用藥提醒。');
        console.log('👨‍👩‍👧 家人帳號（由 403 fallback 判定），不排通知');
        return 'not-elder';
      }
      if (status === 404) {
        // 後端明確告知是「時間未設」或「沒有藥物」
        Alert.alert('資料不足', msg || '尚未設定時間或藥物。');
        // 讓呼叫端知道屬於「資料不足」類
        return 'no-time';
      }

      console.error('[initNotification] 取得提醒失敗:', status, msg);
      Alert.alert('錯誤', msg || '取得提醒失敗，請稍後再試。');
      return 'error';
    }

    await AsyncStorage.setItem('medReminderData', JSON.stringify(schedule));

    // 3) 即便 200，也檢查內容是否完整，給更精準提示
    const anyTimeSet = Object.values(schedule).some((d: any) => !!d?.time);
    const anyMedsSet = Object.values(schedule).some(
      (d: any) => Array.isArray(d?.meds) && d.meds.length > 0
    );

    if (!anyTimeSet && !anyMedsSet) {
      Alert.alert('提醒尚未完成', '尚未設定用藥時間與藥物，請先完成設定。');
      return 'no-time';
    }
    if (!anyTimeSet && anyMedsSet) {
      Alert.alert('提醒尚未完成', '已有藥物，但尚未設定時間。');
      return 'no-time';
    }
    if (anyTimeSet && !anyMedsSet) {
      Alert.alert('提醒尚未完成', '已有時間，但尚未新增任何藥物。');
      return 'no-meds';
    }

    // 4) 重新排程（清掉舊的）
    await notifee.cancelTriggerNotifications();

    let medsExist = false;

    for (const [period, data] of Object.entries(schedule)) {
      const { time, meds } = (data || {}) as { time?: string; meds?: string[] };
      if (!time || !Array.isArray(meds) || meds.length === 0) continue;

      const triggerTime = createTriggerTime(time);
      if (!triggerTime) {
        console.log('⚠️ 時間解析失敗，略過：', period, time);
        continue;
      }
      medsExist = true;

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTime.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
        alarmManager: true,
      };

      console.log(`🔔 預排：${period} → ${time} (${triggerTime})`);

      await notifee.createTriggerNotification(
        {
          title: `💊 ${period} 吃藥提醒`,
          body: `請記得服用：${meds.map((m) => String(m)).join(', ')}`,
          android: {
            channelId: 'medication',
            smallIcon: 'ic_launcher',
            pressAction: { id: 'default' },
          },
          data: { period, meds: meds.join(','), time },
        },
        trigger
      );
      console.log(`✅ 已排程：${period} → ${time}`);
    }

    const triggers = await notifee.getTriggerNotifications();
    console.log('[initNotification] triggers in system:', triggers.length);
    triggers.forEach((t, i) => {
      const ts = (t.trigger as any)?.timestamp as number | undefined;
      console.log(
        `[initNotification] #${i} ts=${ts} =>`,
        ts ? new Date(ts) : 'N/A',
        'title=',
        t.notification?.title
      );
    });

    if (!medsExist) {
      // 走到這裡代表有時間但每段都沒藥
      Alert.alert('尚無藥物設定', '請由家人新增藥物。');
      return 'no-meds';
    }

    return 'success';
  } catch (err: any) {
    console.error(
      '[initNotification] 排程失敗:',
      err?.response?.status,
      err?.response?.data || err?.message || err
    );
    Alert.alert('錯誤', '排程建立失敗，請稍後再試。');
    return 'error';
  }
}

/** 10 秒煙霧測試：立刻排一筆 10 秒後觸發的通知 */
export async function smokeTestIn10s() {
  await setupNotificationChannel();
  const ts = Date.now() + 10_000;
  await notifee.createTriggerNotification(
    {
      title: '⏱ 10s SMOKE TEST',
      body: '如果這則會跳，代表 Notifee/權限/頻道 OK',
      android: { channelId: 'medication', pressAction: { id: 'default' } },
    },
    { type: TriggerType.TIMESTAMP, timestamp: ts } as TimestampTrigger
  );
  const list = await notifee.getTriggerNotifications();
  console.log('[initNotification] smoke triggers:', list.length, list.map((t) => (t.trigger as any)?.timestamp));
}

// ===== 通知點擊處理（App 前景）=====
notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data) {
    const { period, meds, time } = detail.notification.data as { period?: string; meds?: string; time?: string };
    navigationRef.current?.navigate('ElderHome', {
      period,
      meds: meds?.split(','),
      time,
    });
  }
});

// ===== 通知點擊處理（App 背景）=====
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data) {
    const { period, meds, time } = detail.notification.data as { period?: string; meds?: string; time?: string };
    await AsyncStorage.multiSet([
      ['notificationPeriod', period || ''],
      ['notificationMeds', meds || ''],
      ['notificationTime', time || ''],
    ]);

    setTimeout(() => {
      navigationRef.current?.navigate('ElderHome', {
        period,
        meds: meds?.split(','),
        time,
      });
    }, 1000);
  }
});
