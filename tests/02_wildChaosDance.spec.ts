import { test, expect } from '@playwright/test';
import { runSteps } from 'passmark';
import { setMode } from '../simulator/client';
import { recordMetric } from '../simulator/metrics';
import { getMode } from '../simulator/client';

test.beforeAll(async () => setMode('wildChaosDance'));

test('Jevil wildChaosDance — NaN values do not crash the UI', async ({ page }) => {
  test.setTimeout(240_000);
  const start = Date.now();
  let success = true;

  try {
    await runSteps({
      page, userFlow: 'Corrupt sensor resilience',
      steps: [
        { description: 'Navigate to http://localhost:3000' },
        { description: 'Fill username', data: { value: 'admin' } },
        { description: 'Fill password', data: { value: '123456' } },
        { description: 'Click the login button', waitUntil: 'Dashboard is visible' },
        { description: 'Wait 3 seconds for sensor data to arrive' },
      ],
      assertions: [
        { assertion: 'The dashboard is still visible and not blank' },
        { assertion: 'No JavaScript error overlay is displayed' },
        { assertion: 'Sensor cards show a fallback like — or N/A instead of raw NaN' },
        { assertion: 'The sparkline chart does not disappear or show broken rendering' },
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

test('Jevil wildChaosDance — XSS payload in telemetry is not executed', async ({ page }) => {
  test.setTimeout(240_000);
  const start = Date.now();
  let success = true;

  try {
    await runSteps({
      page, userFlow: 'XSS via hardware telemetry',
      steps: [
        { description: 'Navigate to http://localhost:3000' },
        { description: 'Fill username', data: { value: 'admin' } },
        { description: 'Fill password', data: { value: '123456' } },
        { description: 'Click the login button', waitUntil: 'Dashboard is visible' },
        { description: 'Wait 3 seconds for sensor data to arrive' },
      ],
      assertions: [
        { assertion: 'No alert dialog has appeared on the page' },
        { assertion: 'No script tag content is visible in the sensor cards' },
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

