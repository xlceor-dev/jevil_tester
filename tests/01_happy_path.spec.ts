import { test, expect } from '@playwright/test';
import { runSteps } from 'passmark';
import { setMode } from '../simulator/client';

test.beforeAll(async () => await setMode('normal'));

test('Login and view sensor dashboard', async ({ page }) => {
  test.setTimeout(240_000);
  await runSteps({
    page, userFlow: 'Authenticated dashboard access',

steps: [
  { description: 'Navigate to http://localhost:3000' },
  { description: 'Fill username', data: { value: 'admin' } },
  { description: 'Fill password', data: { value: '123456' } },
  { description: 'Click the login button', waitUntil: 'Dashboard is visible' },
],
    assertions: [
      { assertion: 'Temperature sensor shows a valid numeric reading' },
      { assertion: 'ESP32 connection status shows online' },
      { assertion: 'Historical chart is rendered with data points' },
    ],
    test, expect,
  });
});

