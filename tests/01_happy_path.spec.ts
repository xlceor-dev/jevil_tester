import { test, expect } from '@playwright/test';
import { runSteps } from 'passmark';
import { setMode } from '../simulator/client';

test.beforeAll(async () => await setMode('normal'));

test('Login and view sensor dashboard', async ({ page }) => {
  test.setTimeout(240_000); // 4 minutos
  await runSteps({
    page, userFlow: 'Authenticated dashboard access',

// 2. Especifica la URL explícita en el primer paso
steps: [
  { description: 'Navigate to http://localhost:3000' }, // ← URL explícita
  { description: 'Fill username', data: { value: 'admin' } },
  { description: 'Fill password', data: { value: 'password' } },
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

