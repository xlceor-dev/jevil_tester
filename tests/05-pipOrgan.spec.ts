import { test, expect } from '@playwright/test';
import { runSteps } from 'passmark';
import { setMode } from '../simulator/client';
import { recordMetric } from '../simulator/metrics';
import { getMode } from '../simulator/client';

test.beforeAll(async () => setMode('pipOrgan'));

test("Jevil pipOrgan — dashboard warns when data is stale", async ({ page }) => {
    test.setTimeout(240_000);
  const start = Date.now();
  let success = true;
  try {
    await runSteps({
        page, userFlow: 'Stale data detection',
        steps: [
        { description: 'Navigate to http://localhost:3000' },
        { description: 'Fill username', data: { value: 'admin' } },
        { description: 'Fill password', data: { value: '123456' } },
        { description: 'Click the login button', waitUntil: 'Dashboard is visible' },
        { description: 'Wait 3 seconds for sensor data to arrive' },
        ],
        assertions: [
        { assertion: 'Sensor values are visible but flagged as potentially outdated, or a stale data warning is shown' },
        { assertion: 'The sparkline chart does not show a flat line without any visual indication' },
        ],
        test, expect,
    });
} catch (e) {
    success = false;
    throw e;
  } finally {
    const latency = Date.now() - start;
    recordMetric({
      test: test.info().title,
      mode: await getMode(),
      success,
      latency,
      errorShown: !success,
      uiValid: success,
      timestamp: Date.now(),
    });
  }
});