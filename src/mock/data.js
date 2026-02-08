// Utility to generate random data
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDateSeries(year, month) {
    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        // Generate some random dates to have data points
        if (i % 3 === 0) { // Every 3rd day
            dates.push(`${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
        }
    }
    return dates;
}

export const EXERCISES = [
    { id: 'squat', name: 'Squat', color: '#FF3B30' },
    { id: 'bench', name: 'Bench Press', color: '#007AFF' },
    { id: 'deadlift', name: 'Deadlift', color: '#34C759' },
    { id: 'ohp', name: 'Overhead Press', color: '#FF9500' }
];

export const RM_TYPES = ['3RM', '5RM', 'PR'];

export async function fetchChartData({ exercise, rmType, year, month }) {
    // Simulate API delay
    return new Promise((resolve) => {
        setTimeout(() => {
            const dates = generateDateSeries(year, month);

            // Determine which exercises to return
            const selectedExercises = exercise === 'all'
                ? EXERCISES
                : EXERCISES.filter(e => e.id === exercise);

            const series = selectedExercises.map(ex => {
                // Generate trend data based on exercise type to look realistic
                const baseWeight = ex.id === 'deadlift' ? 140 :
                    ex.id === 'squat' ? 120 :
                        ex.id === 'bench' ? 80 : 50; // OHP

                const data = dates.map(date => {
                    // Add some random fluctuation and a slight upward trend
                    const day = parseInt(date.split('-')[2]);
                    const trend = day * 0.5;
                    const noise = getRandomInt(-5, 5);
                    return {
                        x: new Date(date).getTime(),
                        y: baseWeight + trend + noise
                    };
                });

                return {
                    name: ex.name,
                    data: data,
                    color: ex.color
                };
            });

            const cycleWeeks = getRandomInt(1, 10);

            const sparklines = EXERCISES.map(ex => {
                // Generate small trend for sparkline (last 10 sessions)
                const trendData = Array.from({ length: 10 }, (_, i) => {
                    return 100 + (i * (Math.random() > 0.4 ? 1 : -0.5)) + getRandomInt(-2, 2);
                });

                const last = trendData[trendData.length - 1];
                const first = trendData[0];
                const status = last > first + 2 ? 'up' : (last < first - 2 ? 'down' : 'stable');

                return {
                    id: ex.id,
                    name: ex.name,
                    icon: ex.icon, // Add icon access
                    data: trendData,
                    status: status // up, down, stable
                };
            });

            resolve({
                series,
                cycle: Math.random() > 0.5 ? 'Linear' : 'Texas', // Randomly return cycle status
                cycleWeeks,
                sparklines,
                meta: { year, month, rmType }
            });
        }, 600); // 600ms delay
    });
}
