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
const BASE = 'http://172.20.10.8:8000';

// =========================
// 工具：時間處理
// =========================

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

// =========================
// 工具：錯誤分類（修正版）
// =========================

function isAuthError(err: any): boolean {
  return err?.response?.status === 401;
}

function isForbidden(err: any): boolean {
  return err?.response?.status === 403;
}

function isNotFoundError(err: any): boolean {
  const status = err?.response?.status;
  const code = err?.response?.data?.code || err?.response?.data?.detail?.code;
  // 以 404 為主要條件；若後端誤把 user_not_found 放在其他狀態，也一併相容
  return status === 404 || code === 'user_not_found';
}

// =========================
/** Android 通知頻道 */
// =========================
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

// =========================
// 初始化提醒（含友善提示）
// 回傳：'success' | 'no-time' | 'no-meds' | 'no-token' | 'not-elder' | 'error'
// =========================
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
    // 1) /me：確認 token 與基本身分
    try {
      const meRes = await axios.get(`${BASE}/api/account/me/`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        timeout: 10000,
      });
      console.log('[initNotification] /me status:', meRes.status);
      console.log('✅ 使用者資訊:', meRes.data);
    } catch (err: any) {
      if (isAuthError(err)) {
        console.log('[initNotification] 401 → token 無效或過期，清除並要求重新登入');
        await AsyncStorage.removeItem('access');
        Alert.alert('登入逾期', '請重新登入後再試一次。');
        return 'no-token';
      }
      if (isNotFoundError(err)) {
        console.log('[initNotification] /me 404/user_not_found → 取消排程並終止');
        await notifee.cancelTriggerNotifications();
        Alert.alert('錯誤', '找不到使用者，請重新登入。');
        await AsyncStorage.removeItem('access');
        return 'error';
      }
      // 其他錯誤交由外層處理
      throw err;
    }

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
      if (isAuthError(err)) {
        await AsyncStorage.removeItem('access');
        Alert.alert('登入逾期', '請重新登入後再試一次。');
        return 'no-token';
      }
      if (isForbidden(err)) {
        console.log('👨‍👩‍👧 家人帳號（403），不排通知');
        return 'not-elder';
      }
      if (isNotFoundError(err)) {
        console.log('[initNotification] 404/user_not_found → 尚未設定提醒');
        Alert.alert('資料不足', '尚未設定時間或藥物。');
        return 'no-time';
      }
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message;
      console.error('[initNotification] 取得提醒失敗:', status, msg);
      Alert.alert('錯誤', msg || '取得提醒失敗，請稍後再試。');
      return 'error';
    }

    await AsyncStorage.setItem('medReminderData', JSON.stringify(schedule));

    // 3) 內容檢查
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
      Alert.alert('尚無藥物設定', '請由家人新增藥物。');
      return 'no-meds';
    }

    return 'success';
  } catch (err: any) {
    if (isAuthError(err)) {
      await AsyncStorage.removeItem('access');
      Alert.alert('登入逾期', '請重新登入後再試一次。');
      return 'no-token';
    }
    console.error(
      '[initNotification] 排程失敗:',
      err?.response?.status,
      err?.response?.data || err?.message || err
    );
    Alert.alert('錯誤', '排程建立失敗，請稍後再試。');
    return 'error';
  }
}

// =========================
// 通知點擊事件
// =========================

// App 前景
notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data) {
    const { period, meds, time } = detail.notification.data as {
      period?: string;
      meds?: string;
      time?: string;
    };
    navigationRef.current?.navigate('ElderHome', {
      period,
      meds: meds?.split(','),
      time,
    });
  }
});

// App 背景
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data) {
    const { period, meds, time } = detail.notification.data as {
      period?: string;
      meds?: string;
      time?: string;
    };

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
