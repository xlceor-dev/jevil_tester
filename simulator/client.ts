export type JevilMode =
  | 'normal'
  | 'wildChaosDance'
  | 'devilsKnife'
  | 'pacifyingKnife'
  | 'pipOrgan'
  | 'cARdS';

  export type MetricEntry = {
    test: string;
    mode: string;
    success: boolean;
    latency: number;
    errorShown: boolean;
    uiValid: boolean;
    timestamp: number;
  };

  const SIMULATOR = 'http://localhost:8080';

  export async function postMetric(entry: MetricEntry) {
    await fetch(`${SIMULATOR}/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  }

export async function setMode(mode: JevilMode) {
  await fetch(`${SIMULATOR}/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
}

export async function getMode(): Promise<JevilMode> {
  const r = await fetch(`${SIMULATOR}/jevil/mode`);
  const d = await r.json();
  return d.mode;
}