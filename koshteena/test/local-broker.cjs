// وسيط MQTT محلي للاختبار فقط (npm i --no-save aedes@0.51 ws)
// node test/local-broker.cjs  ثم في المتصفح:
// localStorage.setItem('kosh.brokers', JSON.stringify([{k:'E', url:'ws://localhost:8888'}]))
const aedes = require('aedes')();
const http = require('http');
const { WebSocketServer, createWebSocketStream } = require('ws');
const server = http.createServer();
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => aedes.handle(createWebSocketStream(ws)));
server.listen(Number(process.env.PORT) || 8888, () => console.log('local MQTT broker on ws://localhost:' + (process.env.PORT || 8888)));
