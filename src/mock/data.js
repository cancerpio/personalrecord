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
    { id: 'squat', name: 'Squat', color: '#FF3B30', icon: '🏋️' },
    { id: 'bench', name: 'Bench Press', color: '#007AFF', icon: '💪' },
    { id: 'deadlift', name: 'Deadlift', color: '#34C759', icon: '🧹' },
    { id: 'ohp', name: 'Overhead Press', color: '#FF9500', icon: '🆙' }
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
                    color: ex.color,
                    yAxis: 0 // Primary axis (Weight)
                };
            });

            // Generate Bodyweight Data (simulating slight fluctuation around 75kg)
            const bodyweightData = dates.map(date => {
                const day = parseInt(date.split('-')[2]);
                const fluctuation = Math.sin(day / 5) * 1.5; // Smooth wave
                const noise = Math.random() * 0.5;
                return {
                    x: new Date(date).getTime(),
                    y: parseFloat((75 + fluctuation + noise).toFixed(1))
                };
            });

            const bodyweightSeries = {
                name: 'Base Weight', // Updated name as requested
                data: bodyweightData,
                color: '#8E8E93', // iOS System Gray
                dashStyle: 'ShortDash',
                type: 'line',
                marker: { enabled: false }, // Cleaner look
                yAxis: 1 // Secondary axis (Bodyweight)
            };

            // Calculate Relative Strength (Weight / Bodyweight)
            const relativeSeries = series.map(s => {
                const relData = s.data.map((point, index) => {
                    if (!bodyweightData[index]) return null;
                    const bw = bodyweightData[index].y;
                    const ratio = point.y / bw;
                    return {
                        x: point.x,
                        y: parseFloat(ratio.toFixed(2))
                    };
                });

                return {
                    name: s.name + ' (Ratio)',
                    data: relData,
                    color: s.color,
                    type: 'line' // Line chart for ratios is better
                };
            });

            const cycleWeeks = getRandomInt(1, 12); // Range increased to test alerts (1-12 weeks)

            // Calculate mini-charts (sparklines) data 
            // Only return last 7 points for clean UI
            const sparklines = selectedExercises.map(ex => {
                // Find the full series data for this exercise
                const fullSeries = series.find(s => s.name === ex.name);
                if (fullSeries) {
                    const trendData = fullSeries.data.slice(-7).map(p => p.y);
                    // Simple trend calc
                    const first = trendData[0];
                    const last = trendData[trendData.length - 1];
                    const status = last > first ? 'up' : (last < first ? 'down' : 'stable');

                    return {
                        id: ex.id,
                        name: ex.name,
                        icon: ex.icon, // Add icon access
                        data: trendData,
                        status: status // up, down, stable
                    };
                }
                return null;
            }).filter(Boolean); // Filter out nulls

            resolve({
                series: [...series, bodyweightSeries], // Combine for main chart
                relativeSeries: relativeSeries, // Separate for new chart
                sparklines,
                cycleWeeks
            });
        }, 600); // 600ms delay
    });
}
