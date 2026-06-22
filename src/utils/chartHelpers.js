import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = '#94a3b8';
Chart.defaults.plugins.legend.display = false;

const GRID = { color: 'rgba(148,163,184,.16)', drawTicks: false };
const NOGRID = { display: false };

function tooltipOptions(extra = {}) {
  return {
    backgroundColor: '#0f172a',
    padding: 10,
    cornerRadius: 8,
    displayColors: true,
    boxWidth: 8,
    boxHeight: 8,
    usePointStyle: true,
    titleColor: '#fff',
    bodyColor: '#cbd5e1',
    titleFont: { weight: '600', size: 11.5 },
    bodyFont: { size: 11.5 },
    ...extra,
  };
}

export function areaChart(canvas, labels, datasets, opts = {}) {
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        borderColor: dataset.color,
        backgroundColor: (ctx) => {
          const { chartArea } = ctx.chart;
          if (!chartArea) return dataset.color + '22';
          const gradient = ctx.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, dataset.color + '38');
          gradient.addColorStop(1, dataset.color + '02');
          return gradient;
        },
        fill: dataset.fill !== false,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: dataset.color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: tooltipOptions({
          callbacks: opts.fmt
            ? {
                label: (ctx) => ` ${ctx.dataset.label}: ${opts.fmt(ctx.parsed.y)}`,
              }
            : {},
        }),
      },
      scales: {
        x: { grid: NOGRID, ticks: { maxTicksLimit: 8, maxRotation: 0 } },
        y: {
          grid: GRID,
          border: { display: false },
          ticks: { callback: opts.yfmt || ((value) => value), maxTicksLimit: 5 },
          beginAtZero: true,
        },
      },
    },
  });
}

export function stackedBar(canvas, labels, datasets, opts = {}) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.color,
        borderRadius: 3,
        borderSkipped: false,
        maxBarThickness: 34,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: tooltipOptions({
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${opts.fmt ? opts.fmt(ctx.parsed.y) : ctx.parsed.y}`,
          },
        }),
        legend: opts.legend
          ? {
              display: true,
              position: 'bottom',
              labels: { usePointStyle: true, boxWidth: 7, boxHeight: 7, padding: 12, font: { size: 11 } },
            }
          : { display: false },
      },
      scales: {
        x: { stacked: true, grid: NOGRID, ticks: { maxTicksLimit: 10, maxRotation: 0 } },
        y: { stacked: true, grid: GRID, border: { display: false }, ticks: { callback: opts.yfmt || ((value) => value), maxTicksLimit: 5 }, beginAtZero: true },
      },
    },
  });
}

export function groupedBar(canvas, labels, datasets, opts = {}) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.color,
        borderRadius: 4,
        maxBarThickness: 26,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: tooltipOptions({
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${opts.fmt ? opts.fmt(ctx.parsed.y) : ctx.parsed.y}`,
          },
        }),
        legend: {
          display: true,
          position: 'bottom',
          labels: { usePointStyle: true, boxWidth: 7, boxHeight: 7, padding: 12, font: { size: 11 } },
        },
      },
      scales: {
        x: { grid: NOGRID },
        y: { grid: GRID, border: { display: false }, ticks: { callback: opts.yfmt || ((value) => value), maxTicksLimit: 5 }, beginAtZero: true },
      },
    },
  });
}

export function donut(canvas, labels, values, colors, opts = {}) {
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: opts.cutout || '68%',
      plugins: {
        tooltip: tooltipOptions({
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${opts.fmt ? opts.fmt(ctx.parsed) : ctx.parsed}`,
          },
        }),
      },
    },
  });
}

export function hBar(canvas, labels, values, color, opts = {}) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: color,
          borderRadius: 4,
          maxBarThickness: 20,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: tooltipOptions({
          callbacks: {
            label: (ctx) => ` ${opts.fmt ? opts.fmt(ctx.parsed.x) : ctx.parsed.x}`,
          },
        }),
      },
      scales: {
        x: { grid: GRID, border: { display: false }, ticks: { callback: opts.xfmt || ((value) => value), maxTicksLimit: 5 }, beginAtZero: true },
        y: { grid: NOGRID, ticks: { font: { size: 11.5 } } },
      },
    },
  });
}

export function sparkline(canvas, values, color) {
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: values.map((_, index) => index),
      datasets: [
        {
          data: values,
          borderColor: color,
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.4,
          fill: false,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: { tooltip: { enabled: false }, legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } },
      animation: false,
      elements: { line: { capBezierPoints: true } },
    },
  });
}
