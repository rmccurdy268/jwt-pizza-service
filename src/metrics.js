const config = require('./config.js');
const os = require('os');

class MetricBuilder {
  constructor() {
    this.metrics = [];
  }

  // Method to add a single metric entry
  addMetric(metricPrefix, method, name, value) {
    const metricString = `${metricPrefix},source=${config.metrics.source},method=${method} ${name}=${value}`;
    this.metrics.push(metricString);
  }

  // Method to convert all metrics to a string format
  getBatch() {
    return this.metrics;
  }
}

class Metrics{
  constructor(){
    this.totalRequests = 0;
    this.deleteRequests = 0;
    this.postRequests = 0;
    this.getRequests = 0;
    this.putRequests = 0;

    this.sendMetricsPeriodically(10000);
  }

  inc(req){
    this.totalRequests++;
    switch(req){
      case "POST":
        this.postRequests++;
        break;
      case "DELETE":
        this.deleteRequests++;
        break;
      case "PUT":
        this.putRequests++;
        break;
      case "GET":
        this.getRequests++;
        break;
    }
  }

  requestTracker(req, res, next){
    this.inc(req.method);
    next();
  }

  httpMetrics(buffer){
    buffer.addMetric('request', 'http', 'totalRequests', this.totalRequests);
    buffer.addMetric('request', 'http', 'delRequests', this.deleteRequests);
    buffer.addMetric('request', 'http', 'postRequests', this.postRequests);
    buffer.addMetric('request', 'http', 'getRequests', this.getRequests);
    buffer.addMetric('request', 'http', 'putRequests', this.putRequests);
  }

  sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      const buf = new MetricBuilder();
      this.httpMetrics(buf);

      const metrics = buf.getBatch();
      this.sendBatch(metrics);
    }, period);
    timer.unref();
  }

  sendBatch(metrics){
    for(let i = 0; i < metrics.length; i++){
      try{
        this.sendMetricToGrafana(metrics[i]);        
      }
      catch(error){
        console.log('Error sending metrics', error);
      }
    }
  }

  sendMetricToGrafana(metric) {  
    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metric,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.error('Failed to push metrics data to Grafana');
        } else {
          console.log(`Pushed ${metric}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }
  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }
  
  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }
}

const metrics = new Metrics();
module.exports = metrics;
