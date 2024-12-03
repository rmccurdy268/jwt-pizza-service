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

    this.usersLoggedIn = 0;

    this.authSuccess = 0;
    this.authFailures = 0;

    this.totalOrders = 0; 
    this.successfulOrders = 0;
    this.failedOrders = 0;
    
    this.revenue = 0;

    this.sendMetricsPeriodically(10000);
  }

  requestTracker(req){
    this.totalRequests++;
    switch(req.method){
      case 'POST':
        this.postRequests++;
        break;
      case 'DELETE':
        this.deleteRequests++;
        break;
      case 'PUT':
        this.putRequests++;
        break;
      case 'GET':
        this.getRequests++;
        break;
      default:
        this.getRequests++;
        break;
    }
  }

  httpMetrics(buffer){
    buffer.addMetric('request', 'http', 'totalRequests', this.totalRequests);
    buffer.addMetric('request', 'http', 'delRequests', this.deleteRequests);
    buffer.addMetric('request', 'http', 'postRequests', this.postRequests);
    buffer.addMetric('request', 'http', 'getRequests', this.getRequests);
    buffer.addMetric('request', 'http', 'putRequests', this.putRequests);
  }

  activeUserMetrics(buffer){
    buffer.addMetric('request', 'active', 'activeUsers', this.usersLoggedIn);
  }

  authMetrics(buffer){
    buffer.addMetric('request', 'auth', 'successes', this.authSuccess);
    buffer.addMetric('request', 'auth', 'failures', this.authFailures);
  }

  internalMetrics(buffer){
    buffer.addMetric('request', 'internal', 'cpuPercentage', this.getCpuUsagePercentage())
    buffer.addMetric('request', 'internal', 'memoryUsage', this.getMemoryUsagePercentage())
  }

  pizzaMetrics(buffer){
    buffer.addMetric('request', 'pizza', 'pizzasSold', this.successfulOrders)
    buffer.addMetric('request', 'internal', 'pizzaFailures', this.failedOrders)
    buffer.addMetric('request', 'internal', 'revenue', this.revenue)
  }

  sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      const buffer = new MetricBuilder();
      this.httpMetrics(buffer);
      this.internalMetrics(buffer);
      this.activeUserMetrics(buffer);
      this.authMetrics(buffer);
      this.pizzaMetrics(buffer);

      const metrics = buffer.getBatch();
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