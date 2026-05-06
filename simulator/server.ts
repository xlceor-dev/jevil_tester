import express from 'express';
import cors from 'cors';
import { getModeHandler, setMode, getCurrentMode } from './modes';
import { exportMetricsReport } from './metrics';

console.log(">>> INICIANDO SERVER...");

const app = express();
app.use(cors());
app.use(express.json());

// Control de Jevil (solo para tests)
app.post('/mode', (req, res) => {
  setMode(req.body.mode);
  const handler = getModeHandler();
  res.write(`event: mode\ndata: ${JSON.stringify({ mode: req.body.mode })}\n\n`);
  console.log(`\n[Jevil] ✦ Mode → ${req.body.mode} ✦\n`);
  res.json({ mode: getCurrentMode(), message: "CHAOS CHAOS CHAOS" });
});
app.get('/jevil/mode', (_req, res) => res.json({ mode: getCurrentMode() }));

// SSE — idéntico al ESP32
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event: string, data: object) =>
    res.write(`id:${Date.now()}\nevent:${event}\ndata:${JSON.stringify(data)}\n\n`);

  res.write(`id:${Date.now()}\nevent:status\ndata:connected\n\n`);

  const telInterval = setInterval(() => {
    if (res.destroyed) return;
    const handler = getModeHandler();
    const data = handler.telemetry();
    if (data !== null) send('telemetry', data);
  }, 500);

  const stateInterval = setInterval(() => {
    if (res.destroyed) return;
    const handler = getModeHandler();
    send('state', handler.state());
  }, 200);

  send('mode', { mode: getCurrentMode() });

  req.on('close', () => { clearInterval(telInterval); clearInterval(stateInterval); });

  if (handler.closeAfterMs)
    setTimeout(() => { if (!res.destroyed) res.destroy(); }, handler.closeAfterMs());
});

app.post('/servo', (req, res) => getModeHandler().onCommand(req, res));
app.post('/led',   (req, res) => getModeHandler().onCommand(req, res));
app.get('/ping',   (req, res) => getModeHandler().onPing(req, res));
app.get('/metrics', (_req, res) => { res.json(exportMetricsReport());});
app.get('/demo',   (_req, res) => res.send('demo ok'));

app.listen(8080, () => console.log('[Jevil] "I can do ANYTHING!" → http://localhost:8080'));