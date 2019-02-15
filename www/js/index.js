(function () {
  'use strict';

  feather.replace();

  const ctx = document.getElementById('chart');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [
        '2019-02-14 01:34',
        '2019-02-13 20:33',
        '2019-02-13 21:22',
        '2019-02-13 20:52',
        '2019-02-13 20:46',
        '2019-02-13 20:33',
        '2019-02-13 17:32',
        '2019-02-13 17:28',
        '2019-02-13 17:12',
        '2019-02-13 17:06'
      ].reverse(),
      datasets: [{
        label: 'Magnitude',
        data: [
          3.5,
          4.9,
          2.0,
          2.0,
          1.8,
          4.7,
          1.6,
          1.9,
          1.7,
          2.0
        ].reverse(),
        lineTension: 0,
        backgroundColor: 'transparent',
        borderColor: '#007bff',
        borderWidth: 4,
        pointBackgroundColor: '#007bff'
      }]
    },
    options: {
      legend: {
        display: false
      },
      responsive: true,
      tooltips: {
        mode: 'index',
        intersect: false,
      },
      title: {
        display: true,
        text: 'Earthquake Trend'
      },
      hover: {
        mode: 'nearest',
        intersect: true
      },
      scales: {
        xAxes: [{
          display: true,
          scaleLabel: {
            display: true,
            labelString: 'Month'
          }
        }],
        yAxes: [{
          display: true,
          scaleLabel: {
            display: true,
            labelString: 'Magnitude'
          }
        }]
      }
    }
  });
}());
