// 今天的本地日期（`YYYY-MM-DD`）。
//
// 刻意不用 `new Date().toISOString().split('T')[0]`：那是 UTC 瞬間的日期，
// 在 UTC+8 的深夜（本地 00:00–07:59）會回傳「昨天」，
// 使用者半夜記錄的訓練會被記到前一天。
// 這裡改用 getFullYear/getMonth/getDate，取的是使用者行事曆上的今天。
//
// 注意這與 sessionStore 的 getMondayOfDate 不同：那裡拿到的已經是
// `YYYY-MM-DD` 字串，用 Date.UTC 做的是純日曆運算，不涉及時區，是正確的。
// 有時區問題的只有「從當下時間取出日期」這一步。
export function todayLocalISO(now = new Date()) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 以天為單位平移一個「YYYY-MM-DD」字串，回傳同格式字串。
//
// 與 todayLocalISO 的分工要分清楚：todayLocalISO 從「當下時間」取出日期，
// 會受時區影響；本函式的輸入已經是日期字串，做的是純日曆運算、不涉及時刻，
// 因此用 Date.UTC 才是正確的——它讓結果不受執行環境時區干擾。
export function shiftDays(dateStr, deltaDays) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + deltaDays);
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}
