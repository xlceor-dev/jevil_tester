export type JevilMode =
  | 'normal'
  | 'wildChaosDance'
  | 'devilsKnife'
  | 'pacifyingKnife'
  | 'pipOrgan'
  | 'cARdS';

const SIMULATOR = 'http://localhost:8080';

export async function setMode(mode: JevilMode) {
  await fetch(`${SIMULATOR}/jevil/mode`, {
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