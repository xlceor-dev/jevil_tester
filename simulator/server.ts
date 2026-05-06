import express from 'express';
import cors from 'cors';
import { getModeHandler, setMode, getCurrentMode } from './modes';
import { recordMetric, exportMetricsReport } from './metrics';


console.log(">>> INICIANDO SERVER...");

const app = express();
app.use(cors());
app.use(express.json());

app.post('/mode', (req, res) => {
  const newMode = req.body.mode;
  
  setMode(newMode);
  
  console.log(`\n[Jevil] ✦ Mode → ${newMode} ✦\n`);
  res.json({ 
    mode: getCurrentMode(), 
    message: "CHAOS CHAOS CHAOS" 
  });
});
app.get('/mode', (_req, res) => res.json({ mode: getCurrentMode() }));

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event: string, data: object) =>
    res.write(`id:${Date.now()}\nevent:${event}\ndata:${JSON.stringify(data)}\n\n`);

  res.write(`id:${Date.now()}\nevent:status\ndata:connected\n\n`);

  const currentHandler = getModeHandler();

  const telInterval = setInterval(() => {
    if (res.destroyed) return;
    const h = getModeHandler();
    const data = h.telemetry();
    if (data !== null) send('telemetry', data);
  }, 500);

  const stateInterval = setInterval(() => {
    if (res.destroyed) return;
    const h = getModeHandler();
    send('state', h.state());
  }, 200);

  send('mode', { mode: getCurrentMode() });

  req.on('close', () => { 
    clearInterval(telInterval); 
    clearInterval(stateInterval); 
  });


  if (currentHandler.closeAfterMs) {
    setTimeout(() => { 
      if (!res.destroyed) {
        console.log("[Jevil] ✂️ Closing connection as requested by mode");
        res.destroy(); 
      }
    }, currentHandler.closeAfterMs());
  }
});

// Recibir métricas desde los tests
app.post('/metrics', (req, res) => {
  recordMetric(req.body);
  res.json({ ok: true });
});

app.post('/servo', (req, res) => getModeHandler().onCommand(req, res));
app.post('/led',   (req, res) => getModeHandler().onCommand(req, res));
app.get('/ping',   (req, res) => getModeHandler().onPing(req, res));
app.get('/metrics', (_req, res) => { res.json(exportMetricsReport());});
app.get('/demo',   (_req, res) => res.send('demo ok'));

app.listen(8080, () => console.log('[Jevil] "I can do ANYTHING!" → http://localhost:8080'));