import { test } from '@playwright/test';
import { runUserFlow } from 'passmark';
import { setMode } from '../simulator/client';
import { postMetric } from '../simulator/client';

test.beforeAll(async () => await setMode('normal'));

test('Jevil: login has no brute force protection', async ({ page }) => {
    test.setTimeout(300_000);
    const start = Date.now();
    let success = true;

    try {
    await runUserFlow({
      page,
      userFlow: 'Brute force resistance test',
      steps: `Navigate to the login page. Attempt to login with wrong 
              credentials at least 5 times in a row. Try different 
              wrong passwords each time.`,
      effort: 'high',

      assertion: 'After multiple failed attempts, the login shows a lockout, rate limit warning, CAPTCHA, or the form becomes disabled',
    });
} catch (e) {
    success = false;
    throw e;
  } finally {
    const latency = Date.now() - start;

    await postMetric({
      test: test.info().title,
      mode: 'normal',
      success,
      latency,
      errorShown: !success,
      uiValid: success,
      timestamp: Date.now(),
    });
  }
});
