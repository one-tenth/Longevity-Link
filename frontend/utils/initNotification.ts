// utils/initNotification.ts
import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  RepeatFrequency,
  EventType,
  AuthorizationStatus,
  AndroidStyle,
} from '@notifee/react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, AppState } from 'react-native';
import { navigationRef } from '../App'; // 若已抽出 navigationRef.ts，改成 '../navigationRef'

console.log('[initNotification] module loaded');

// =========================
// 基本設定
// =========================

const BASE = 'http://192.168.0.91:8000';

// ★★★ 指定回診通知時間（固定每天 08:00）★★★
const VISIT_NOTIFY_TIME = '08:00';

// =========================
// 時段：中英文對照
// =========================
const PERIOD_LABELS: Record<string, string> = {
  morning: '早上',
  noon: '中午',
  evening: '晚上',
  bedtime: '睡前',
};
function getPeriodLabel(period?: string) {
  if (!period) return '目前時段';
  const key = String(period).toLowerCase().trim();
  return PERIOD_LABELS[key] ?? period;
}

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
// 工具：錯誤分類
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
  return status === 404 || code === 'user_not_found';
}

// =========================
/** Android 通知頻道 */
// =========================
export async function setupNotificationChannel() {
  // 吃藥
  await notifee.createChannel({
    id: 'medication',
    name: '吃藥提醒',
    importance: AndroidImportance.HIGH,
  });
  // 回診（獨立頻道，避免互相影響）
  await notifee.createChannel({
    id: 'appointments',
    name: '回診提醒',
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
// 回診提醒（動態：地點/醫師/號碼；今天過時立即補發；未來只排一次）
// =========================
export async function initVisitNotifications(): Promise<'scheduled' | 'skipped' | 'no-token' | 'no-data' | 'error'> {
  try {
    await setupNotificationChannel(); // 冪等

    // ---- 檢查固定提醒時間 ----
    if (!VISIT_NOTIFY_TIME) {
      console.log('[visit] 未設定 VISIT_NOTIFY_TIME，略過');
      return 'skipped';
    }

    // ---- 權限 / token ----
    const token = await AsyncStorage.getItem('access');
    if (!token) return 'no-token';
    if (Platform.OS === 'android') await ensureNotificationPermission();

    // ---- 讀回診列表 ----
    type VisitRow = {
      ClinicDate?: string;
      ClinicPlace?: string;
      Doctor?: string;
      Num?: string | number;
      HosId?: string | number;
      HosID?: string | number;
      id?: string | number;
      [k: string]: any;
    };

    let rows: VisitRow[] = [];
    try {
      const res = await axios.get(`${BASE}/api/hospital/list/`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        timeout: 10000,
      });
      if (Array.isArray(res.data)) rows = res.data;
    } catch (e) {
      console.log('[visit] 讀取 /api/hospital/list/ 失敗：', e);
    }

    if (!rows.length) {
      // 沒資料 → 清掉舊回診排程
      await clearVisitTriggersOnly();
      return 'no-data';
    }

    // ---- 工具：日期處理（僅此函式使用）----
    const normalizeYMD = (raw?: string): string | null => {
      if (!raw) return null;
      const s = String(raw).trim().replace(/[./]/g, '-');
      const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (!m) return null;
      const y = m[1];
      const mm = String(Math.min(12, Math.max(1, parseInt(m[2], 10)))).padStart(2, '0');
      const dd = String(Math.min(31, Math.max(1, parseInt(m[3], 10)))).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    };
    const extractHM = (hm: string) => {
      const m = hm.replace(/：/g, ':').match(/(\d{1,2}):(\d{1,2})/);
      if (!m) return { h: 0, m: 0 };
      return { h: Math.min(23, +m[1]), m: Math.min(59, +m[2]) };
    };
    const dtFromYMDHM = (ymd: string, hm: string) => {
      const [y, m, d] = ymd.split('-').map(Number);
      const { h, m: mi } = extractHM(hm);
      const dt = new Date();
      dt.setFullYear(y, m - 1, d);
      dt.setHours(h, mi, 0, 0);
      return dt;
    };
    const todayStart = () => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      return t;
    };

    // ---- 建立候選列表（atNotify, place, doctor, num, visitId）並挑最近一筆 ----
    const today0 = todayStart();
    const candidates = rows
      .map((r) => {
        const ymd = normalizeYMD(r.ClinicDate);
        if (!ymd) return null;
        const atNotify = dtFromYMDHM(ymd, VISIT_NOTIFY_TIME);
        const place = String(r.ClinicPlace ?? '');
        const doctor = String(r.Doctor ?? '');
        const num = r.Num != null ? String(r.Num) : '';
        const visitId = String(r.HosId ?? r.HosID ?? r.id ?? `${ymd}-${place}`);
        return { ymd, atNotify, place, doctor, num, visitId };
      })
      .filter(Boolean) as Array<{ ymd: string; atNotify: Date; place: string; doctor: string; num: string; visitId: string }>;

    // 只保留「今天之後」，（今天）則看指定時間是否已過
    const now = new Date();
    const upcoming = candidates
      .filter((c) => c.atNotify.getTime() >= today0.getTime())
      .sort((a, b) => a.atNotify.getTime() - b.atNotify.getTime());

    if (!upcoming.length) {
      await clearVisitTriggersOnly();
      return 'no-data';
    }

    // 取最近一筆
    const next = upcoming[0];

    // ---- 先清掉舊的回診排程（只清回診類）----
    await clearVisitTriggersOnly();

    // ---- 通知內容：地點 / 醫師 / 回診號碼 / 提醒時間 ----
    const title = `🏥 回診提醒（${VISIT_NOTIFY_TIME}）`;
    const bodyLines = [
      next.place ? `📍 地點：${next.place}` : null,
      next.doctor ? `👨‍⚕️ 醫師：${next.doctor}` : null,
      next.num !== '' ? `🎫 回診號碼：${next.num}` : null,
      `⏰ 提醒時間：${VISIT_NOTIFY_TIME}`,
    ].filter(Boolean) as string[];
    const body = bodyLines.join('\n');

    const notifId = `visit::${next.visitId}::${next.ymd}::${VISIT_NOTIFY_TIME}`;

    // ---- 取得頭像資料 ----
    let avatar: string | null = null;
    try {
      const meRes = await axios.get(`${BASE}/api/account/me/`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        timeout: 10000,
      });
      avatar = meRes.data?.avatar ?? null;
    } catch (e) {
      console.log('[visit] 取得頭像失敗：', e);
    }

    // ---- 若今天且已過指定時間 → 立即補發一次，並不再排程過去時間 ----
    const isToday =
      next.ymd ===
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (isToday && next.atNotify.getTime() <= now.getTime()) {
      const shownKey = `visit:shown:${next.visitId}:${next.ymd}`;
      if ((await AsyncStorage.getItem(shownKey)) !== '1') {
        await notifee.displayNotification({
          id: notifId,
          title,
          body,
          ios: { sound: 'default', subtitle: '回診資訊提醒' },
          android: {
            channelId: 'appointments',
            smallIcon: 'ic_launcher',
            pressAction: { id: 'open-visit' },
            style: {
              type: AndroidStyle.BIGTEXT,
              title: '回診資訊',
              text: body,
              summary: next.place || undefined,
            },
          },
          data: {
            __type: 'visit',
            date: next.ymd,
            time: VISIT_NOTIFY_TIME,
            place: next.place,
            doctor: next.doctor,
            num: next.num,
            visitId: next.visitId,
            avatar: avatar || 'default.png',
          },
        });
        await AsyncStorage.setItem(shownKey, '1');
        console.log(`[visit] ⚡ 已即時補發：${next.ymd} ${VISIT_NOTIFY_TIME} (${next.place})`);
      }
      return 'scheduled';
    }

    // ---- 未來時間 → 正常排程（一次性）----
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: next.atNotify.getTime(),
      repeatFrequency: undefined, // 只這一次
      alarmManager: true,
    };

    await notifee.createTriggerNotification(
      {
        id: notifId,
        title,
        body,
        ios: { sound: 'default', subtitle: '回診資訊提醒' },
        android: {
          channelId: 'appointments',
          smallIcon: 'ic_launcher',
          pressAction: { id: 'open-visit' },
          style: {
            type: AndroidStyle.BIGTEXT,
            title: '回診資訊',
            text: body,
            summary: next.place || undefined,
          },
        },
        data: {
          __type: 'visit',
          date: next.ymd,
          time: VISIT_NOTIFY_TIME,
          place: next.place,
          doctor: next.doctor,
          num: next.num,
          visitId: next.visitId,
          avatar: avatar || 'default.png',
        },
      },
      trigger
    );

    // 驗證目前排程
    const after = await notifee.getTriggerNotifications();
    const visitTriggers = after.filter((n) => n.notification?.data?.__type === 'visit');
    console.log('[visit] triggers total:', after.length, 'visit only:', visitTriggers.length);
    visitTriggers.forEach((n, i) => {
      const ts = (n.trigger as any)?.timestamp as number | undefined;
      console.log(`[visit] #${i} id=${n.notification?.id} ts=${ts} ->`, ts ? new Date(ts) : 'N/A');
    });

    console.log(`[visit] ✅ 已排程：${next.ymd} ${VISIT_NOTIFY_TIME} @ ${next.place}`);
    return 'scheduled';
  } catch (e) {
    console.error('[visit] 排程失敗：', e);
    return 'error';
  }
}

/** 只清回診相關的觸發排程（不影響吃藥） */
async function clearVisitTriggersOnly() {
  const list = await notifee.getTriggerNotifications();
  await Promise.all(
    list
      .filter(
        (n) =>
          n.notification?.data?.__type === 'visit' ||
          n.notification?.data?.type === 'visit' ||
          n.notification?.id?.startsWith('visit::')
      )
      .map((n) => n.notification?.id && notifee.cancelTriggerNotification(n.notification.id))
  );
}

// =========================
// 初始化「吃藥」提醒（從後端時間表）
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
    let userId: string | number | undefined;
    let avatar: string | null = null;

    try {
      const meRes = await axios.get(`${BASE}/api/account/me/`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        timeout: 10000,
      });
      console.log('[initNotification] /me status:', meRes.status);
      console.log('✅ 使用者資訊:', meRes.data);

      userId = meRes?.data?.UserID ?? meRes?.data?.id ?? meRes?.data?.userId;
      avatar = meRes.data?.avatar ?? null;
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
      throw err;
    }

    // 2) 取得提醒排程
    let schedule: Record<string, { time?: string; meds?: string[]; medIds?: (string | number)[] }> = {};
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
    const anyMedsSet = Object.values(schedule).some((d: any) => Array.isArray(d?.meds) && d.meds.length > 0);

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

    // 4) 重新排程（清掉舊的「吃藥」排程，別動回診）
    const all = await notifee.getTriggerNotifications();
    await Promise.all(
      all
        .filter((n) => n.notification?.data?.__type === 'med' || n.notification?.data?.type === 'med')
        .map((n) => n.notification?.id && notifee.cancelTriggerNotification(n.notification.id))
    );

    let medsExist = false;

    for (const [period, data] of Object.entries(schedule)) {
      const { time, meds, medIds } = (data || {}) as { time?: string; meds?: string[]; medIds?: (string | number)[] };
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
          title: `💊 ${getPeriodLabel(period)} 吃藥提醒`,
          body: `請記得服用：${meds.map((m) => String(m)).join(', ')}`,
          android: {
            channelId: 'medication',
            smallIcon: 'ic_launcher',
            pressAction: { id: 'default' },
          },
          data: {
            __type: 'med',
            period,
            meds: meds.join(','),
            medIds: Array.isArray(medIds) ? medIds.join(',') : '',
            userId: userId != null ? String(userId) : '',
            time,
            avatar: avatar || 'default.png',
          },
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
// 便利方法：一次初始化全部排程
// =========================
export async function initAllNotifications() {
  await setupNotificationChannel();
  const med = await initMedicationNotifications();
  console.log('[initNotification] initMedicationNotifications =>', med);
  const visit = await initVisitNotifications();
  console.log('[initNotification] initVisitNotifications =>', visit);
  return { med, visit };
}

// =========================
// App 回到前景時，重新檢查回診提醒（含即時補發邏輯）
// =========================
let _visitActiveWatcherStarted = false;
let _visitActiveSub: { remove: () => void } | null = null;

/**
 * 啟動一次性前景監聽器：
 * - App 啟動先跑一次 initVisitNotifications()
 * - 之後每次回到前景若「今天且已過 08:00、且尚未發過」，就會即時顯示一次
 */
export async function startVisitActiveWatcher() {
  if (_visitActiveWatcherStarted) return;
  _visitActiveWatcherStarted = true;

  // 先建立頻道並跑一次（涵蓋「今天已過時間 → 即時補發」）
  await setupNotificationChannel();
  await initVisitNotifications();

  // 回到前景再跑
  _visitActiveSub = AppState.addEventListener('change', async (state) => {
    if (state === 'active') {
      await initVisitNotifications();
    }
  });
}

/**（可選）需要時可手動關閉監聽 */
export function stopVisitActiveWatcher() {
  _visitActiveSub?.remove?.();
  _visitActiveSub = null;
  _visitActiveWatcherStarted = false;
}

// =========================
// 通知點擊事件
// =========================

// App 前景
notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data) {
    const data = detail.notification.data as any;

    // 吃藥 → 詳情頁（period 用英文鍵，畫面端會轉中文）
    if (data?.__type === 'med' || data?.type === 'med') {
      const { period, meds, time, avatar } = data;
      navigationRef.current?.navigate('ElderMedRemind', {
        period,
        meds: meds ? String(meds).split(',') : undefined,
        time,
        avatar,
      });
      return;
    }

    // 回診 → 回診列表頁（可依需求改為詳情頁）
    if (data?.__type === 'visit' || data?.type === 'visit') {
      const { avatar } = data;
      navigationRef.current?.navigate('ElderHospitalList', { avatar });
      return;
    }
  }
});

// App 背景
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data) {
    const data = detail.notification.data as any;

    if (data?.__type === 'med' || data?.type === 'med') {
      const { period, meds, time, userId, avatar } = data;

      console.log('Sending to ElderMedRemind:', {
        period,
        meds: meds ? String(meds).split(',') : undefined,
        time,
        userId: userId ? Number(userId) : undefined,
      });

      await AsyncStorage.multiSet([
        ['notificationPeriod', period || ''],
        ['notificationMeds', meds || ''],
        ['notificationTime', time || ''],
        ['notificationUserId', userId ? String(userId) : ''],
        ['notificationAvatar', avatar || ''],
      ]);

      setTimeout(() => {
        console.log('Navigating to ElderMedRemind with params:', {
          period,
          meds: meds ? String(meds).split(',') : undefined,
          time,
          userId: userId ? Number(userId) : undefined,
        });
        navigationRef.current?.navigate('ElderMedRemind', {
          period,
          meds: meds ? String(meds).split(',') : undefined,
          time,
          userId: userId ? Number(userId) : undefined,
          avatar,
        });
      }, 800);
      return;
    }

    if (data?.__type === 'visit' || data?.type === 'visit') {
      const { avatar } = data;
      setTimeout(() => {
        navigationRef.current?.navigate('ElderHospitalList', { avatar });
      }, 800);
      return;
    }
  }
});
