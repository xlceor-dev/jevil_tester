import { test, expect } from '@playwright/test';
import { runSteps } from 'passmark';
import { setMode } from '../simulator/client';

test.beforeAll(async () => setMode('pacifyingKnife'));

test("Jevil pacifyingKnife — dashboard shows loading state while waiting for data", async ({ page }) => {
  test.setTimeout(120_000);
  await runSteps({
    page, userFlow: 'Slow telemetry UX',
    steps: [
      { description: 'Navigate to http://localhost:3000' },
      { description: 'Wait 4 seconds without data arriving' },
    ],
    assertions: [
      { assertion: 'Sensor cards show — or a loading indicator, not stale values from a previous session' },
      { assertion: 'The UI does not freeze or become unresponsive' },
    ],
    test, expect,
  });
});

test("Jevil pacifyingKnife — slow command shows pending state", async ({ page }) => {
  test.setTimeout(150_000);
  await runSteps({
    page, userFlow: 'Command timeout UX',
    steps: [
      { description: 'Navigate to http://localhost:3000' },
      { description: 'Send servo command to 45 degrees' },
      { description: 'Wait without receiving a response' },
    ],
    assertions: [
      { assertion: 'The send button shows a pending or loading state while waiting' },
    ],
    test, expect,
  });
});