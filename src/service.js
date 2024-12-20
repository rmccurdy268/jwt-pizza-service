const express = require('express');
const { authRouter, setAuthUser } = require('./routes/authRouter.js');
const orderRouter = require('./routes/orderRouter.js');
const franchiseRouter = require('./routes/franchiseRouter.js');
const version = require('./version.json');
const config = require('./config.js');
const metrics = require('./metrics.js');
const logger = require('./logger.js');

const app = express();
const banList = [];
app.use(express.json());
app.use(setAuthUser);
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use((req,res,next)=>{
  metrics.requestTracker(req)
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  

  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start; 
    if (req.method == 'POST' && req.originalUrl == '/api/order'){
      metrics.sendMetricToGrafana(`${'request'},source=${config.metrics.source},method=${'postPizza'} ${'pizzaTotalLatency'}=${duration}`);
    }
    metrics.sendMetricToGrafana(`${'request'},source=${config.metrics.source},method=${req.method} ${'serviceLatency'}=${duration}`);
    res.send = originalSend; 
    return res.send(body);
  };
  next();
});

app.use(logger.httpLogger);

app.use((req, res, next)=>{
  let addr = 'null';
  if (req.headers['x-forwarded-for'] != undefined){
    addr = req.headers['x-forwarded-for']
  }
  if (banList.includes(addr)){
    return res.status(403).json({ message: 'Forbidden: Your IP is blocked.' });
  }
  else{
    next();
  }
});

const apiRouter = express.Router();
app.use('/api', apiRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/order', orderRouter);
apiRouter.use('/franchise', franchiseRouter);

apiRouter.use('/docs', (req, res) => {
  res.json({
    version: version.version,
    endpoints: [...authRouter.endpoints, ...orderRouter.endpoints, ...franchiseRouter.endpoints],
    config: { factory: config.factory.url, db: config.db.connection.host },
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'welcome to JWT Pizza',
    version: version.version,
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    message: 'unknown endpoint',
  });
});

// Default error handler for all exceptions and errors.
app.use((err, req, res, next) => {
  res.status(err.statusCode ?? 500).json({ message: err.message, stack: err.stack });
  logger.unhandledErrorLogger(JSON.stringify({ message: err.message, stack: err.stack }));
  next();
});

module.exports = app;
