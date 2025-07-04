export function renderGauge(canvasEl) {
  return new Chart(canvasEl, {
    type: 'doughnut',
    data: {
      labels: ['Burnout Score'],
      datasets: [{
        data: [0, 10], // Start with 0 score out of 10
        backgroundColor: ['#667eea', '#e2e8f0'], // filled and unfilled
        borderWidth: 0,
        cutout: '80%'
      }]
    },
    options: {
      responsive: true,
      animation: {
        animateRotate: true,
        duration: 1000
      },
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false }
      }
    }
  });
}

export function renderTrendChart(canvasEl) {
  return new Chart(canvasEl, {
    type: 'line',
    data: {
      labels: Array(24).fill(''), // placeholder for 24 points (e.g., hourly data for a day)
      datasets: [{
        label: 'Burnout Trend',
        data: Array(24).fill(0), // placeholder data
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `Score: ${ctx.raw.toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxTicksLimit: 6
          },
          title: {
            display: true,
            text: 'Time (past 24 hours)'
          }
        },
        y: {
          beginAtZero: true,
          suggestedMax: 10,
          title: {
            display: true,
            text: 'Burnout Score'
          }
        }
      }
    }
  });
}
