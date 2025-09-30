// utils/initNotification.ts
import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  RepeatFrequency,
  EventType,
  AuthorizationStatus,
  AndroidStyle, // 美化通知用
} from '@notifee/react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { navigationRef } from '../App';

console.log('[initNotification] module loaded');

// =========================
// 基本設定
// =========================
const BASE = 'http://172.20.10.7:8000';

// ★★★ 指定回診通知時間（24 小時制，例：'08:00', '07:30'）★★★
const VISIT_NOTIFY_TIME = '11:51';

// =========================
// 共用工具
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
  if (triggerTime.getTime() <= now.getTime()) triggerTime.setDate(triggerTime.getDate() + 1);
  return triggerTime;
}

/** API 錯誤是否為 user_not_found（401） */
function isUserNotFoundError(err: any): boolean {
  const status = err?.response?.status;
  const code = err?.response?.data?.code || err?.response?.data?.detail?.code;
  return status === 401 && code === 'user_not_found';
}

/** 將 'YYYY-MM-DD' 標準化（允許 '.', '/' 分隔） */
function normalizeYMD(raw?: string): string | null {
  if (!raw) return null;
  const core = raw.includes('T') ? raw.split('T')[0] : raw;
  const ymd = core.replace(/[./]/g, '-').trim();
  const m = ymd.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${m[1]}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

/** 由 YMD + (可選) HH:mm 產生 Date（本地時區） */
function makeDateFromYMDHM(ymd: string, hhmm?: string | null): Date {
  const { h, m } = extractHHMM(hhmm || '09:00') ?? { h: 9, m: 0 };
  const [y, mo, d] = ymd.split('-').map(n => +n);
  return new Date(y, mo - 1, d, h, m, 0, 0);
}

/** 一次性「補發」工具（今天只顯示一次） */
function pad2(n: number) { return String(n).padStart(2, '0'); }
function ymdFromDate(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
async function hasShownToday(key: string) { return !!(await AsyncStorage.getItem(key)); }
async function markShownToday(key: string) { await AsyncStorage.setItem(key, '1'); }

// =========================
// 通知頻道與權限
// =========================

export async function setupNotificationChannel() {
  await notifee.createChannel({ id: 'medication', name: '吃藥提醒', importance: AndroidImportance.HIGH });
  await notifee.createChannel({ id: 'appointments', name: '回診提醒', importance: AndroidImportance.HIGH });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    const ok =
      (settings as any).authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      (settings as any).authorizationStatus === AuthorizationStatus.PROVISIONAL ||
      (typeof settings === 'object' ? false : !!settings);
    console.log('[initNotification] permission ok=', ok, 'settings=', settings);
    return ok;
  } catch (e) {
    console.log('[initNotification] requestPermission error:', e);
    return false;
  }
}

// =========================
// 吃藥提醒：每日排程
// =========================

export async function initMedicationNotifications(): Promise<
  'success' | 'no-time' | 'no-meds' | 'no-token' | 'not-elder' | 'error'
> {
  console.log('[initNotification] initMedicationNotifications() called');

  const token = await AsyncStorage.getItem('access');
  if (!token) { Alert.alert('尚未登入', '請先登入後再試一次。'); return 'no-token'; }

  if (Platform.OS === 'android') await ensureNotificationPermission();

  try {
    try {
      const meRes = await axios.get(`${BASE}/api/account/me/`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        timeout: 10000,
      });
      console.log('[initNotification] /me status:', meRes.status);
    } catch (err: any) {
      if (isUserNotFoundError(err)) { await notifee.cancelTriggerNotifications(); return 'success'; }
      throw err;
    }

    let schedule: Record<string, { time?: string; meds?: string[] }>;
    try {
      const res = await axios.get(`${BASE}/api/get-med-reminders/`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        timeout: 10000,
      });
      schedule = res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message;
      if (isUserNotFoundError(err)) { await notifee.cancelTriggerNotifications(); return 'success'; }
      if (status === 403) return 'not-elder';
      if (status === 404) { Alert.alert('資料不足', msg || '尚未設定時間或藥物。'); return 'no-time'; }
      Alert.alert('錯誤', msg || '取得提醒失敗，請稍後再試。');
      return 'error';
    }

    await AsyncStorage.setItem('medReminderData', JSON.stringify(schedule));

    const anyTimeSet = Object.values(schedule).some((d: any) => !!d?.time);
    const anyMedsSet = Object.values(schedule).some((d: any) => Array.isArray(d?.meds) && d.meds.length > 0);

    if (!anyTimeSet && !anyMedsSet) { Alert.alert('提醒尚未完成', '尚未設定用藥時間與藥物，請先完成設定。'); return 'no-time'; }
    if (!anyTimeSet && anyMedsSet) { Alert.alert('提醒尚未完成', '已有藥物，但尚未設定時間。'); return 'no-time'; }
    if (anyTimeSet && !anyMedsSet) { Alert.alert('提醒尚未完成', '已有時間，但尚未新增任何藥物。'); return 'no-meds'; }

    // 清吃藥觸發
    const triggersBefore = await notifee.getTriggerNotifications();
    for (const t of triggersBefore) {
      const n = t.notification;
      if (n?.android?.channelId === 'medication') await notifee.cancelTriggerNotification(n.id!);
    }

    let medsExist = false;

    for (const [period, data] of Object.entries(schedule)) {
      const { time, meds } = (data || {}) as { time?: string; meds?: string[] };
      if (!time || !Array.isArray(meds) || meds.length === 0) continue;

      const triggerTime = createTriggerTime(time);
      if (!triggerTime) continue;
      medsExist = true;

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTime.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
        alarmManager: true,
      };

      await notifee.createTriggerNotification(
        {
          id: `med::${period}`,
          title: `💊 ${period} 吃藥提醒`,
          body: `請記得服用：${meds.map((m) => String(m)).join(', ')}`,
          android: { channelId: 'medication', smallIcon: 'ic_launcher', pressAction: { id: 'open-medication' } },
          data: { type: 'med', period, meds: meds.join(','), time },
        },
        trigger
      );
    }

    if (!medsExist) { Alert.alert('尚無藥物設定', '請由家人新增藥物。'); return 'no-meds'; }

    return 'success';
  } catch (err: any) {
    if (isUserNotFoundError(err)) {
      const all = await notifee.getTriggerNotifications();
      for (const t of all) await notifee.cancelTriggerNotification(t.notification.id!);
      return 'success';
    }
    Alert.alert('錯誤', '排程建立失敗，請稍後再試。');
    return 'error';
  }
}

// =========================
// 回診提醒：只有日期 → 指定時間跳一次
// （含：若當天已過該時間，首次開 App 立即補發一次）
// =========================

export async function initVisitNotifications(): Promise<'success' | 'no-token' | 'no-data' | 'error'> {
  try {
    const token = await AsyncStorage.getItem('access');
    if (!token) return 'no-token';

    if (Platform.OS === 'android') await ensureNotificationPermission();

    // 讀回診資料
    const urls = [`${BASE}/api/hospital/list/`];
    let rows: any[] = [];
    for (const url of urls) {
      try {
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          timeout: 10000,
        });
        if (Array.isArray(res.data) && res.data.length) { rows = res.data; break; }
      } catch {}
    }

    // 過濾「今天之後（含今天）」並固定 VISIT_NOTIFY_TIME
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const mappedRows = rows
      .map((r) => {
        const ymd = normalizeYMD(r.ClinicDate);
        if (!ymd) return null;
        const atNotify = makeDateFromYMDHM(ymd, VISIT_NOTIFY_TIME); // ← 指定時間
        return { atNotify, r, ymd };
      })
      .filter(Boolean) as Array<{ atNotify: Date; r: any; ymd: string }>;

    const upcoming = mappedRows
      .filter((x) => x.atNotify.getTime() >= today.getTime())
      .sort((a, b) => a.atNotify.getTime() - b.atNotify.getTime());

    if (upcoming.length === 0) { await cancelExistingVisitTriggers(); return 'no-data'; }

    // 清掉舊的回診排程（避免重複）
    await cancelExistingVisitTriggers();

    const createdIds: string[] = [];
    for (const { atNotify, r, ymd } of upcoming) {
      const now = new Date();
      const todayYMD = ymdFromDate(now);
      const isToday = ymd === todayYMD;

      const visitId = String(r.HosId ?? r.HosID ?? r.id ?? `${ymd}-${r.ClinicPlace}`);
      const notifId = `visit::${visitId}::${VISIT_NOTIFY_TIME}::${atNotify.getTime()}`;

      // ===== 美化內容（僅顯示有值的欄位） =====
      const lines: string[] = [];
      if (ymd) lines.push(`📅 日期：${ymd}`);
      lines.push(`⏰ 時間：${VISIT_NOTIFY_TIME}`);
      if (r.ClinicPlace) lines.push(`📍 地點：${r.ClinicPlace}`);
      if (r.Doctor) lines.push(`👨‍⚕️ 醫師：${r.Doctor}`);
      if ((r.Num ?? '') !== '') lines.push(`🎫 號碼：${r.Num}`);
      const prettyBody = lines.join('\n');

      // 若今天且已過指定時間，首次開 App 直接補發一次
      if (isToday && atNotify.getTime() <= now.getTime()) {
        const shownKey = `visit:shown:${visitId}:${ymd}`;
        if (!(await hasShownToday(shownKey))) {
          await notifee.displayNotification({
            id: notifId,
            title: '🏥 回診提醒',
            body: prettyBody,
            android: {
              channelId: 'appointments',
              smallIcon: 'ic_launcher',
              color: '#1976D2',
              category: 'reminder',
              style: {
                type: AndroidStyle.BIGTEXT,
                text: prettyBody,
                title: '回診資訊',
                summary: r.ClinicPlace ? r.ClinicPlace : undefined,
              },
              pressAction: { id: 'open-visit' },
            },
            data: {
              type: 'visit',
              visitId,
              date: ymd,
              time: VISIT_NOTIFY_TIME,
              place: String(r.ClinicPlace || ''),
              doctor: String(r.Doctor || ''),
              num: String(r.Num ?? ''),
            },
          });
          await markShownToday(shownKey);
          console.log(`⚡ 已即時補發（今天已過 ${VISIT_NOTIFY_TIME}）：${ymd} id=${notifId}`);
        }
        continue; // 不再排程過去時間
      }

      // 其餘（未來的指定時間）→ 正常排程
      if (atNotify.getTime() <= now.getTime()) continue; // 避免排到過去

      await notifee.createTriggerNotification(
        {
          id: notifId,
          title: '🏥 回診提醒',
          body: prettyBody, // iOS 顯示 body；Android BigText
          android: {
            channelId: 'appointments',
            smallIcon: 'ic_launcher',
            color: '#1976D2',
            category: 'reminder',
            style: {
              type: AndroidStyle.BIGTEXT,
              text: prettyBody,
              title: '回診資訊',
              summary: r.ClinicPlace ? r.ClinicPlace : undefined,
            },
            pressAction: { id: 'open-visit' },
          },
          data: {
            type: 'visit',
            visitId,
            date: ymd,
            time: VISIT_NOTIFY_TIME,
            place: String(r.ClinicPlace || ''),
            doctor: String(r.Doctor || ''),
            num: String(r.Num ?? ''),
          },
        },
        { type: TriggerType.TIMESTAMP, timestamp: atNotify.getTime(), alarmManager: true }
      );
      console.log(`✅ 已排程（回診 ${VISIT_NOTIFY_TIME}）：${ymd} at ${atNotify.toString()} id=${notifId}`);
      createdIds.push(notifId);
    }

    if (createdIds.length) await AsyncStorage.setItem('visitNotifIds', JSON.stringify(createdIds));

    const triggers = await notifee.getTriggerNotifications();
    console.log('[visit] triggers total:', triggers.length);

    return 'success';
  } catch (err) {
    console.log('[visit] initVisitNotifications error:', err);
    return 'error';
  }
}

/** 取消舊的回診排程（依儲存的 ID） */
async function cancelExistingVisitTriggers() {
  try {
    const raw = await AsyncStorage.getItem('visitNotifIds');
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (Array.isArray(ids) && ids.length) for (const id of ids) await notifee.cancelTriggerNotification(id);
    await AsyncStorage.removeItem('visitNotifIds');
  } catch {}
}

// =========================
// 通知點擊處理（前景 / 背景）
// =========================

notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type !== EventType.PRESS) return;
  const data: any = detail.notification?.data;

  if (data?.type === 'med') {
    const { period, meds, time } = data as { period?: string; meds?: string; time?: string };
    navigationRef.current?.navigate('ElderHome', { period, meds: meds?.split(','), time });
    return;
  }

  if (data?.type === 'visit') {
    navigationRef.current?.navigate('ElderHome', {
      visitDate: data.date,
      visitTime: data.time,
      visitPlace: data.place,
      visitDoctor: data.doctor,
      visitNum: data.num,
    });
  }
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type !== EventType.PRESS) return;
  const data: any = detail.notification?.data;

  if (data?.type === 'med') {
    const { period, meds, time } = data as { period?: string; meds?: string; time?: string };
    await AsyncStorage.multiSet([
      ['notificationPeriod', period || ''],
      ['notificationMeds', meds || ''],
      ['notificationTime', time || ''],
    ]);
    setTimeout(() => {
      navigationRef.current?.navigate('ElderHome', { period, meds: meds?.split(','), time });
    }, 800);
    return;
  }

  if (data?.type === 'visit') {
    await AsyncStorage.multiSet([
      ['visitDate', String(data.date || '')],
      ['visitTime', String(data.time || '')],
      ['visitPlace', String(data.place || '')],
      ['visitDoctor', String(data.doctor || '')],
      ['visitNum', String(data.num || '')],
    ]);
    setTimeout(() => {
      navigationRef.current?.navigate('ElderHome', {
        visitDate: data.date,
        visitTime: data.time,
        visitPlace: data.place,
        visitDoctor: data.doctor,
        visitNum: data.num,
      });
    }, 800);
  }
});
