// 帶正負號的數值格式化，供趨勢 chip 顯示差值使用。
//
// 先四捨五入、再依四捨五入後的值決定符號。這個順序是必要的：
// 直接 (-0.04).toFixed(1) 會產生 "-0.0"，畫面上讀起來是「下降」，但實際差值可忽略。
// 同樣的四捨五入值也用於門檻判定（見 sessionStore 的 round1），
// 確保不會出現「顯示 0.5 卻判定持平」這種自相矛盾。
export function signed(value, digits = 1) {
    const rounded = Number(value.toFixed(digits));
    const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
    return `${sign}${Math.abs(rounded).toFixed(digits)}`;
}
