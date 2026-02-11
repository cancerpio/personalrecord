// 固定 4 週時間點（以天為單位的時間戳）
function generateWeekTimestamps(year, month) {
    const timestamps = [];
    const baseDate = new Date(year, month - 1, 1); // 該月份的第 1 天
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    for (let i = 0; i < 4; i++) {
        timestamps.push(new Date(baseDate.getTime() + i * oneWeekMs).getTime());
    }
    return timestamps;
}

export const EXERCISES = [
    // 動作類：使用接近的藍色系（iOS System Blue / Teal）
    { id: 'squat', name: 'Squat', color: '#0A84FF', icon: '🏋️' },   // iOS System Blue
    { id: 'bench', name: 'Bench Press', color: '#5AC8FA', icon: '💪' } // iOS System Teal
];

// RM 按鈕顯示順序：5RM → 3RM → PR（由弱到強）
export const RM_TYPES = ['5RM', '3RM', 'PR'];

// 固定的 Squat / Bench Press / 體重 / 體脂 資料（4 週，全部以 kg 呈現）
const SQUAT_DATA = {
    '5RM': [90, 90, 100, 105],
    '3RM': [100, 105, 110, 110],
    // PR 對應使用 1RM 資料
    'PR': [125, 130, 130, 130]
};

const BENCH_DATA = {
    '3RM': [75, 75, 75, 77.5],
    '5RM': [65, 65, 67.5, 67.5],
    'PR': [85, 85, 85, 85]
};

const BODY_WEIGHT_DATA = [79, 80, 80, 81];
const BODY_FAT_DATA = [19, 21, 19, 17];

export async function fetchChartData({ exercise, rmType, year, month }) {
    // 模擬 API 延遲
    return new Promise((resolve) => {
        setTimeout(() => {
            const timestamps = generateWeekTimestamps(year, month);

            // 依照 RM 類型決定 Squat / Bench 數值，預設使用 3RM
            const squatValues = SQUAT_DATA[rmType] || SQUAT_DATA['3RM'];
            const benchValues = BENCH_DATA[rmType] || BENCH_DATA['3RM'];

            const squatSeries = {
                name: `Squat (${rmType})`,
                data: timestamps.map((t, index) => ({
                    x: t,
                    y: squatValues[index]
                })),
                color: EXERCISES[0].color,
                yAxis: 0 // 主 Y 軸：重量
            };

            const benchSeries = {
                name: `Bench Press (${rmType})`,
                data: timestamps.map((t, index) => ({
                    x: t,
                    y: benchValues[index]
                })),
                color: EXERCISES[1].color,
                type: 'line',
                marker: { enabled: false },
                yAxis: 0
            };

            const bodyweightSeries = {
                name: 'Body Weight',
                data: timestamps.map((t, index) => ({
                    x: t,
                    y: BODY_WEIGHT_DATA[index]
                })),
                color: '#8E8E93', // iOS System Gray
                type: 'line',
                marker: { enabled: false },
                yAxis: 0 // 與 Squat 共用同一個 Y 軸（kg）
            };

            const bodyFatSeries = {
                name: 'Body Fat',
                data: timestamps.map((t, index) => ({
                    x: t,
                    y: BODY_FAT_DATA[index]
                })),
                color: '#AEAEB2', // iOS System Gray2，與 Body Weight 接近
                type: 'line',
                marker: { enabled: false },
                yAxis: 0 // 同樣以 kg 單位顯示
            };

            // 體脂率：Body Fat / Body Weight（以百分比顯示）
            const relativeSeries = [{
                name: 'Body Fat % (Body Fat / Body Weight)',
                data: timestamps.map((t, index) => {
                    const bw = BODY_WEIGHT_DATA[index];
                    if (!bw) return null;
                    const fat = BODY_FAT_DATA[index];
                    const ratio = (fat / bw) * 100;
                    return {
                        x: t,
                        y: parseFloat(ratio.toFixed(2))
                    };
                }),
                color: EXERCISES[0].color,
                type: 'line'
            }];

            // Sparklines：顯示所有指標的 4 週趨勢
            const sparklines = [
                {
                    id: 'squat',
                    name: 'Squat',
                    icon: EXERCISES[0].icon,
                    data: squatValues,
                    status: squatValues[squatValues.length - 1] > squatValues[0]
                        ? 'up'
                        : (squatValues[squatValues.length - 1] < squatValues[0] ? 'down' : 'stable')
                },
                {
                    id: 'bench',
                    name: 'Bench Press',
                    icon: EXERCISES[1].icon,
                    data: benchValues,
                    status: benchValues[benchValues.length - 1] > benchValues[0]
                        ? 'up'
                        : (benchValues[benchValues.length - 1] < benchValues[0] ? 'down' : 'stable')
                },
                {
                    id: 'bodyWeight',
                    name: 'Body Weight',
                    icon: '⚖️',
                    data: BODY_WEIGHT_DATA,
                    status: BODY_WEIGHT_DATA[BODY_WEIGHT_DATA.length - 1] > BODY_WEIGHT_DATA[0]
                        ? 'up'
                        : (BODY_WEIGHT_DATA[BODY_WEIGHT_DATA.length - 1] < BODY_WEIGHT_DATA[0] ? 'down' : 'stable')
                },
                {
                    id: 'bodyFat',
                    name: 'Body Fat',
                    icon: '📉',
                    data: BODY_FAT_DATA,
                    status: BODY_FAT_DATA[BODY_FAT_DATA.length - 1] < BODY_FAT_DATA[0]
                        ? 'down'
                        : (BODY_FAT_DATA[BODY_FAT_DATA.length - 1] > BODY_FAT_DATA[0] ? 'up' : 'stable')
                }
            ];

            const cycleWeeks = 4; // 固定為 4 週

            resolve({
                series: [squatSeries, benchSeries, bodyweightSeries, bodyFatSeries],
                relativeSeries,
                sparklines,
                cycleWeeks
            });
        }, 600); // 600ms 延遲
    });
}
