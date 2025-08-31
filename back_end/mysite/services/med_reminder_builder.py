# app/services/med_reminder_builder.py
from datetime import datetime, timedelta, time as dtime
import pytz

def _ordered_times(ts):
    # 依你定義的欄位順序：早、中、晚、睡前
    # 僅保留非空值並保持原順序
    arr = []
    for t in [ts.MorningTime, ts.NoonTime, ts.EveningTime, ts.Bedtime]:
        if t is not None:
            arr.append(t)
    return arr

def _norm_freq(s: str) -> str:
    if not s:
        return s
    s = s.strip()
    return s  # 若你之後有「一日3次」、「每日四次」等變體，可在這裡統一

def _pick_times_by_freq(times, freq: str):
    freq = _norm_freq(freq)
    if not times:
        return []

    if freq == '一日三次':
        return times[:3]
    if freq == '一日四次':
        return times[:4]
    if freq == '睡前':
        # 有設定 Bedtime 時會出現在列表最後，否則回傳最後一個可用時間
        return [times[-1]]
    # 其他字串（例如一日兩次）目前不處理：回空，避免誤排
    return []

def build_reminders_for_user(user, time_setting, meds, tz_str='Asia/Taipei'):
    """
    輸入：
      - user            ：用不到也可，這裡保留參數
      - time_setting    ：MedTimeSetting instance（同一位長者的每日時間設定）
      - meds            ：該長者的所有 Med queryset/list
    輸出：list[dict]，每筆包含 at(ISO字串), med_name, freq, prescription_id
    """
    tz = pytz.timezone(tz_str)
    now = datetime.now(tz)
    date_today = now.date()

    base_times = _ordered_times(time_setting) if time_setting else []

    reminders = []
    for med in meds:
        pick = _pick_times_by_freq(base_times, med.DosageFrequency)
        for t in pick:
            at_dt = tz.localize(datetime.combine(date_today, t))
            if at_dt <= now:
                at_dt = at_dt + timedelta(days=1)
            reminders.append({
                'at': at_dt.isoformat(),
                'med_name': med.MedName,
                'freq': med.DosageFrequency,
                'prescription_id': str(med.PrescriptionID),
                'disease': med.Disease,
                'user_id': med.UserID_id,
            })

    reminders.sort(key=lambda x: x['at'])
    return reminders
