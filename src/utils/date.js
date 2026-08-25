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
