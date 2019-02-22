(function () {
  'use strict';

  var ctx = document.getElementById('chart');
  var req = new XMLHttpRequest();

  req.open('GET', '/api/earthquake', true);

  req.addEventListener('load', () => {
    var data = JSON.parse(req.response);
    var labels = [];
    var magnitude = [];
    var tbody = document.querySelector('tbody');

    data.forEach(function(event) {
      var time = event.event.replace(':00.000+08:00', '').replace('T', ' ');
      labels.push(time);
      magnitude.push(event.magnitude);
      var tr = document.createElement('tr');
      var td = document.createElement('td');
      td.innerText = time;
      tr.append(td);

      td = document.createElement('td');
      var span = document.createElement('span');
      span.classList.add('badge');
      if (event.magnitude < 3) {
        span.classList.add('badge-info');
      } else if (event.magnitude < 5) {
        span.classList.add('badge-warning');
      } else {
        span.classList.add('badge-danger');
      }
      span.innerText = event.magnitude;
      td.append(span);
      tr.append(td);

      td = document.createElement('td');
      td.innerText = event.depth;
      tr.append(td);

      td = document.createElement('td');
      var a = document.createElement('a');
      var ll = event.latitude + ',' + event.longitude;
      a.href = 'https://maps.google.com/?q=' + ll + '&ll=' + ll + '&z=8';
      a.target = '_blank';
      a.innerText = event.location;
      td.append(a);
      tr.append(td);

      td = document.createElement('td');
      td.innerText = event.province;
      tr.append(td);

      tbody.append(tr);

    });

    var chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.reverse(),
        datasets: [{
          label: 'Magnitude',
          data: magnitude.reverse(),
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
  });

  req.send();
  feather.replace();

  var lessSpamPlz = ['m','o','c','.','e','l','g','g','i','w','h','t','r','a','e','@','o','f','n','i'];
  document.getElementById('mailto').href = 'mailto:' + lessSpamPlz.reverse().join('');

}());
