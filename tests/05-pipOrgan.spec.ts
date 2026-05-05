import { test, expect } from '@playwright/test';
import { runSteps } from 'passmark';
import { setMode } from '../simulator/client';

test.beforeAll(async () => setMode('pipOrgan'));

test("Jevil pipOrgan — dashboard warns when data is stale", async ({ page }) => {
  test.setTimeout(120_000);
  await runSteps({
    page, userFlow: 'Stale data detection',
    steps: [
      { description: 'Navigate to http://localhost:3000' },
      { description: 'Wait for sensor data to load' },
    ],
    assertions: [
      { assertion: 'Sensor values are visible but flagged as potentially outdated, or a stale data warning is shown' },
      { assertion: 'The sparkline chart does not show a flat line without any visual indication' },
    ],
    test, expect,
  });
});