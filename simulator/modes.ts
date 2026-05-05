import { Request, Response } from 'express';

let currentMode = 'normal';
let servoAngle = 90;
const noise = (s = 1) => (Math.random() - 0.5) * 2 * s;

interface ModeHandler {
  telemetry: () => object | null;
  state: () => object;
  onCommand: (req: Request, res: Response) => void;
  onPing: (req: Request, res: Response) => void;
  telemetryInterval?: number;
  closeAfterMs?: () => number;
}

// normal — réplica exacta del ESP32
const normal: ModeHandler = {
  telemetry: () => ({
    temp:      26 + noise(0.2),
    voltage:   5  + noise(0.1),
    load:      Math.abs(noise(2)),
    vibration: Math.abs(noise(0.3)),
    adc:       Math.floor(2000 + noise(50)),
  }),
  state: () => ({ target: servoAngle, current: servoAngle, servo2: 180 - servoAngle }),
  onCommand: (req, res) => {
    if (req.body?.servo !== undefined) servoAngle = req.body.servo;
    res.json({ ok: true });
  },
  onPing: (_req, res) => res.json({ pong: Date.now() }),
};

// wildChaosDance — datos corruptos, NaN, XSS
const wildChaosDance: ModeHandler = {
  telemetry: () => {
    const chaos = [
      { temp: "NaN",    voltage: -999, load: null, vibration: undefined, adc: 0 },
      { temp: 99999,    voltage: 0,    load: 99999, vibration: 99999,    adc: 9999 },
      { temp: "<script>alert('CHAOS')</script>", voltage: 5, load: 0, vibration: 0, adc: 0 },
      { temp: null, voltage: null, load: null, vibration: null, adc: null },
      {}, // respuesta vacía
    ];
    return chaos[Math.floor(Math.random() * chaos.length)];
  },
  state: () => normal.state(),
  onCommand: (_req, res) => res.json({ ok: true, executed: false }), // acepta pero ignora
  onPing: (_req, res) => res.json({ pong: Date.now() }),
};

// devilsKnife — desconexiones abruptas
const devilsKnife: ModeHandler = {
  telemetry: () => normal.telemetry(),
  state: () => normal.state(),
  onCommand: (_req, res) => setTimeout(() => res.destroy(), 200),
  onPing: (_req, res) => {
    if (Math.random() < 0.6) res.destroy();
    else res.status(503).json({ error: 'ESP32 unreachable' });
  },
  closeAfterMs: () => 1500 + Math.random() * 2000,
};

// pacifyingKnife — respuestas lentas (10–20s)
const pacifyingKnife: ModeHandler = {
  telemetry: () => normal.telemetry(),
  state: () => normal.state(),
  telemetryInterval: 8000,
  onCommand: (_req, res) => setTimeout(() => res.json({ ok: true }), 12000 + Math.random() * 8000),
  onPing: (_req, res) => setTimeout(() => res.json({ pong: Date.now() }), 6000),
};

// pipOrgan — datos congelados / stale
const frozen = { temp: 26.3, voltage: 4.98, load: 1.2, vibration: 0.1, adc: 2001,
  _frozenAt: new Date('2025-01-01T00:00:00Z').toISOString() };
const pipOrgan: ModeHandler = {
  telemetry: () => frozen,
  state: () => normal.state(),
  onCommand: normal.onCommand,
  onPing: (_req, res) => res.json({ pong: 0 }),
};

// cARdS — flood de eventos (50ms = 20 eventos/seg)
const cARdS: ModeHandler = {
  telemetry: () => normal.telemetry(),
  state: () => normal.state(),
  telemetryInterval: 50,
  onCommand: normal.onCommand,
  onPing: normal.onPing,
};

const modes: Record<string, ModeHandler> = {
  normal, wildChaosDance, devilsKnife, pacifyingKnife, pipOrgan, cARdS,
};

export const setMode = (m: string) => { currentMode = m; };
export const getCurrentMode = () => currentMode;
export const getModeHandler = (): ModeHandler => modes[currentMode] ?? normal;