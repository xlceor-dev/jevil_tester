import { test, expect } from '@playwright/test';
import { runSteps } from 'passmark';
import { setMode } from '../simulator/client';
import { recordMetric } from '../simulator/metrics';
import { getMode } from '../simulator/client';

test.beforeAll(async () => setMode('devilsKnife'));

test("Jevil devilsKnife — dashboard shows disconnected state", async ({ page }) => {
    test.setTimeout(240_000);
  const start = Date.now();
    let success = true;

    try {
    await runSteps({
        page, userFlow: 'Abrupt disconnection handling',
        steps: [
        { description: 'Navigate to http://localhost:3000' },
        { description: 'Fill username', data: { value: 'admin' } },
        { description: 'Fill password', data: { value: '123456' } },
        { description: 'Wait 5 seconds for the SSE connection to drop' },
        ],
        assertions: [
        { assertion: 'The status bar is not green — it shows a disconnected or error state' },
        { assertion: 'A reconnection message is visible' },
        { assertion: 'The UI is still usable and not frozen' },
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

test("Jevil devilsKnife — command during disconnect shows error feedback", async ({ page }) => {
    test.setTimeout(240_000);
  await runSteps({
    page, userFlow: 'Command during outage',
    steps: [
      { description: 'Navigate to http://localhost:3000' },
      { description: 'Fill username', data: { value: 'admin' } },
      { description: 'Fill password', data: { value: '123456' } },
      { description: 'Click the login button', waitUntil: 'Dashboard is visible' },
      { description: 'Set servo to 90 and click send' },
    ],
    assertions: [
      { assertion: 'An error or timeout is shown — the failure is not silent' },
    ],
    test, expect,
  });
});