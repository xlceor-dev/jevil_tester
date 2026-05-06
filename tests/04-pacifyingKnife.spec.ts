import { test, expect } from '@playwright/test';
import { runSteps } from 'passmark';
import { setMode } from '../simulator/client';
import { postMetric } from '../simulator/client';
import { getMode } from '../simulator/client';

test.beforeAll(async () => setMode('pacifyingKnife'));

test("Jevil pacifyingKnife — dashboard shows loading state while waiting for data", async ({ page }) => {
    test.setTimeout(240_000);
  const start = Date.now();
    let success = true;
    try {
        await runSteps({
            page, userFlow: 'Slow telemetry UX',
            steps: [
            { description: 'Navigate to http://localhost:3000' },
            { description: 'Fill username', data: { value: 'admin' } },
            { description: 'Fill password', data: { value: '123456' } },
            { description: 'Click the login button', waitUntil: 'Dashboard is visible' },
            { description: 'Wait 4 seconds without data arriving' },
            ],
            assertions: [
            { assertion: 'Sensor cards show — or a loading indicator, not stale values from a previous session' },
            { assertion: 'The UI does not freeze or become unresponsive' },
            ],
            test, expect,
        });
    } catch (e) {
        success = false;
        throw e;
      } finally {
        const latency = Date.now() - start;
        await postMetric({
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

test("Jevil pacifyingKnife — slow command shows pending state", async ({ page }) => {
    test.setTimeout(240_000);
  const start = Date.now();
  let success = true;
  try {
    await runSteps({
        page, userFlow: 'Command timeout UX',
        steps: [
            { description: 'Navigate to http://localhost:3000' },
            { description: 'Fill username', data: { value: 'admin' } },
            { description: 'Fill password', data: { value: '123456' } },
            { description: 'Click the login button', waitUntil: 'Dashboard is visible' },
        { description: 'Send servo command to 45 degrees' },
        { description: 'Wait without receiving a response' },
        ],
        assertions: [
        { assertion: 'The send button shows a pending or loading state while waiting' },
        ],
        test, expect,
    });
    } catch (e) {
        success = false;
        throw e;
    } finally {
        const latency = Date.now() - start;
        await postMetric({
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