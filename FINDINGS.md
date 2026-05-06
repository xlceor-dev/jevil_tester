# Security Findings — Jevil v1.0

> Automated chaos testing of the **Khymera IoT Dashboard** (ESP32 + Next.js)  
> Test framework: [Passmark](https://github.com/bug0inc/passmark) · Chaos engine: Jevil Simulator  
> Tests run: **9** · Passed: **1** · Vulnerabilities found: **6**

---

## Summary

| ID | Title | Severity | Mode | Status |
|----|-------|----------|------|--------|
| [CRIT-001](#crit-001) | XSS execution via sensor telemetry | 🔴 Critical | wildChaosDance | Unpatched |
| [HIGH-001](#high-001) | No brute force protection on login | 🟠 High | clubAttack | Unpatched |
| [HIGH-002](#high-002) | Silent command failure during disconnection | 🟠 High | devilsKnife | Unpatched |
| [MED-001](#med-001) | No stale data detection | 🟡 Medium | pipOrgan | Unpatched |
| [LOW-001](#low-001) | No pending state on slow commands | 🟢 Low | pacifyingKnife | Unpatched |
| [LOW-002](#low-002) | No loading indicator on delayed telemetry | 🟢 Low | pacifyingKnife | Unpatched |
| [META-001](#meta-001) | Chaos mode sabotaged its own test | 📎 Narrative | devilsKnife | By design |

---

## CRIT-001
### XSS Execution via Sensor Telemetry

**Severity:** 🔴 Critical  
**Chaos mode:** `wildChaosDance`  
**Test file:** `02_wildChaosDance.spec.ts`

#### Description
The dashboard renders sensor telemetry received via SSE (Server-Sent Events) without sanitizing string values. When the ESP32 (or a compromised device on the network) sends a payload containing an HTML/JavaScript string as a sensor reading, the browser executes it.

#### Reproduction
1. Start the simulator in `wildChaosDance` mode
2. The mode sends the following as a temperature reading:
   ```json
   { "temp": "<script>alert('CHAOS')</script>", "voltage": 5, "load": 0 }
   ```
3. Open the dashboard and log in
4. The `alert()` dialog executes in the browser

#### Passmark evidence
```
AI Summary: The accessibility snapshot explicitly contains an 'alert' element
(ref=e13) on the page, which contradicts the assertion that no alert dialog
has appeared.
```

#### Root cause
The `telemetryReducer` passes values through `Number(raw)`, which converts the XSS string to `NaN` for the metric cards. However, the original string reaches the DOM through the **activity log** component, which renders messages without HTML escaping. At minimum one rendering path does not sanitize the raw sensor string.

#### Impact
An attacker with physical access to the ESP32, or with the ability to intercept the local WiFi network, can inject arbitrary JavaScript into the operator's browser. In a production deployment controlling industrial actuators, this represents **remote code execution via hardware sensor data**.

#### Suggested fix
Sanitize all telemetry values before rendering. Apply `encodeURIComponent` or a DOM sanitizer (e.g. DOMPurify) to any string derived from sensor data before it reaches any rendering path, including logs.

---

## HIGH-001
### No Brute Force Protection on Login

**Severity:** 🟠 High  
**Chaos mode:** `normal` (security test, no simulator chaos)  
**Test file:** `06-clubAttack.spec.ts`

#### Description
The login endpoint has no rate limiting, account lockout, or CAPTCHA mechanism. An automated agent can attempt unlimited password combinations without any resistance.

#### Reproduction
Run the brute force test. The Passmark AI will:
1. Attempt `wrongpassword123` — login fails, no lockout
2. Attempt `wrongpassword123` again — still no lockout
3. Reload the page — attempt resumes unimpeded
4. Attempt `wrongpassword`, `wrongpassword2`, `wrongpassword3`, `wrongpassword4`, `wrongpassword5` — all accepted without warning

Full sequence from Passmark test steps:

```
Fill "wrongpassword123" → Click Login  (attempt 1)
Fill "wrongpassword123" → Click Login  (attempt 2)
Reload
Fill "wrongpassword"    → Click Login  (attempt 3)
Fill "wrongpassword"    → Click Login  (attempt 4)
Fill "wrongpassword2"   → Click Login  (attempt 5)
Fill "wrongpassword3"   → Click Login  (attempt 6)
Fill "wrongpassword4"   → Click Login  (attempt 7)
Fill "wrongpassword5"   → Click Login  (attempt 8)
```

Zero lockouts. Zero delays. Zero CAPTCHA. The test ended only because the AI provider hit a rate limit — not because the login defended itself.

#### Note on the original discovery
This vulnerability was first found accidentally during the happy path test, when a typo in the test credentials caused the AI to improvise. Without being instructed to, it attempted multiple passwords, opened DevTools with `Ctrl+Shift+J`, tried to view source with `Ctrl+U`, and injected a JavaScript payload into the address bar to inspect the page. The behavior exactly mirrors a real attacker probing a target when the expected path fails.

#### Impact
A dashboard that controls physical hardware (servo motors, actuators) with no login protection can be fully compromised with a simple dictionary attack. Default credentials (`admin` / `password`) are the first thing any attacker tries.

#### Suggested fix
- Implement exponential backoff after 3 failed attempts
- Add a lockout period (e.g. 15 min) after 5 failures
- Log failed attempts with IP and timestamp
- Consider TOTP for hardware control dashboards

---

## HIGH-002
### Silent Command Failure During Disconnection

**Severity:** 🟠 High  
**Chaos mode:** `devilsKnife`  
**Test file:** `03-devilsKnife.spec.ts`

#### Description
When a hardware command (e.g. servo move) is sent while the ESP32 connection is unstable, the HTTP request fails silently. The dashboard shows no error, no retry prompt, and no indication that the command was not received.

#### Reproduction
1. Start the simulator in `devilsKnife` mode (destroys connections after ~1.5s)
2. Log in to the dashboard
3. Send a servo command via the "Enviar" button
4. The simulator destroys the HTTP response — the dashboard UI does not change

#### Passmark evidence
```
AI Summary: The dashboard indicates a healthy state with 'ESP32 CONECTADO'
and active data readings. There are no error messages, timeout alerts, or
failure notifications visible.
```

#### Root cause
`sendActuator` is fire-and-forget with no error handling:
```typescript
const sendActuator = async (key, value) => {
  await fetch("/api/actuator", { method: "POST", body: ... });
  // ← nothing happens if this throws
};
```

#### Impact
In a system controlling physical hardware, a silently-failed command is a **safety issue**. An operator who presses "move to 0°" and receives no feedback may assume the hardware complied. If it did not, the physical state of the system diverges from the operator's mental model.

#### Suggested fix
Wrap `sendActuator` in try/catch. Show a toast or log entry on failure. Add a loading state to the button during the request. Consider a command acknowledgment pattern (hardware confirms execution, not just receipt).

---

## MED-001
### No Stale Data Detection

**Severity:** 🟡 Medium  
**Chaos mode:** `pipOrgan`  
**Test file:** `05-pipOrgan.spec.ts`

#### Description
When the ESP32 sends identical sensor readings on every tick (frozen/stale data), the dashboard presents them as live telemetry with no visual indication that the data may be outdated.

#### Reproduction
1. Start the simulator in `pipOrgan` mode (sends the same payload with `_frozenAt: "2025-01-01T00:00:00Z"` on every tick)
2. Log in — the dashboard shows sensor readings and reports "ESP32 CONECTADO"
3. The ping latency reads ~4ms (network round-trip is healthy)
4. No warning, timestamp, or staleness indicator is shown

#### Passmark evidence
```
AI Summary: The sensor values are clearly visible and the dashboard indicates
'ESP32 CONECTADO' with a low latency of 4ms. There are no visual indicators,
warnings, or text suggesting the data is stale or outdated.
```

#### The 4ms latency paradox
The dashboard's latency calculation measures **network round-trip time**, not **data freshness**. Even when the ESP32 is returning January 2025 readings, the network is responding in 4ms, so the dashboard reports a healthy connection. These are two independent properties that the UI conflates.

#### Impact
An operator monitoring a tank level, temperature threshold, or actuator position has no way to distinguish live data from a sensor that stopped updating. Decisions made on stale data can have real-world consequences.

#### Suggested fix
Track the last timestamp at which sensor values changed. If values have not changed in >5s, show a visual indicator (e.g. amber border on metric cards, "Last updated: Xs ago"). Separately track and display data age vs. network latency.

---

## LOW-001
### No Pending State on Slow Commands

**Severity:** 🟢 Low  
**Chaos mode:** `pacifyingKnife`  
**Test file:** `04-pacifyingKnife.spec.ts`

#### Description
When a command is sent and the ESP32 takes 10–20 seconds to respond (simulating high network latency or a busy device), the "Enviar" button remains in its normal state with no loading indicator.

#### Passmark evidence
```
AI Summary: The 'Enviar' (Send) button is in its normal state, displaying
the text 'Enviar' without any loading spinners, progress bars, or 'pending'
indicators. The accessibility snapshot shows the button without any
'disabled' or 'busy' attributes.
```
*Note: Passmark waited 30 seconds observing the page (two consecutive 10s + 20s timeouts) before evaluating the assertion.*

#### Suggested fix
Set a `sending` state on the button during the fetch. Disable the button and show a spinner or "Enviando..." label until the response resolves or rejects.

---

## LOW-002
### No Loading Indicator on Delayed Telemetry

**Severity:** 🟢 Low  
**Chaos mode:** `pacifyingKnife`  
**Test file:** `04-pacifyingKnife.spec.ts`

#### Description
When telemetry events are delayed (e.g. 8s between updates instead of the normal 500ms), sensor cards continue to display the last known values without any indication that the data may be outdated or that the system is waiting for new readings.

#### Passmark evidence
```
AI Summary: The sensor cards are displaying actual numerical values
(e.g., 25.9, 5.03, 1.9) rather than '—' or a loading indicator.
```

#### Suggested fix
Track the last telemetry receive time. After a configurable threshold (e.g. 3× the normal interval), add a visual indicator to affected cards. This overlaps with the fix for MED-001.

---

## META-001
### Chaos Mode Sabotaged Its Own Test

**Severity:** 📎 Narrative (not a dashboard bug)  
**Chaos mode:** `devilsKnife`  
**Test file:** `03-devilsKnife.spec.ts`

#### Description
In an early version of the devilsKnife test, the chaos mode destroyed the SSE connection during the login flow — before the test could navigate to the dashboard and evaluate the disconnection state. The test found itself stuck on the login screen looking for a status bar that only exists post-authentication.

The chaos didn't wait for the test to be ready.

#### What this reveals
IoT failures don't respect test scaffolding. They happen during initialization, during authentication, during the first data fetch — exactly the moments when test frameworks assume the system is in a known state. A testing approach that only covers post-login scenarios misses an entire class of failure modes.

In the updated test, this was resolved by adding a login click step and extending the wait period. The new report shows the dashboard reaching the connected state — but then staying in "NORMAL" mode despite devilsKnife being active, because the SSE reconnect logic (3s retry) recovers the connection faster than the test's 5s observation window. **Brief disconnections are invisible to the current UI.**

---

## Test environment

```
Framework:     Passmark (AI-powered Playwright)
Browser:       Chromium
Dashboard:     Next.js 14, running on localhost:3000
Simulator:     Jevil ESP32 Simulator, running on localhost:8080
ESP32 target:  Khymera Dashboard (servo control + sensor telemetry via SSE)
Test date:     May 2025
```

## Reproduction

```bash
# Start the simulator
npm run simulator

# Start the dashboard pointed at the simulator
NEXT_PUBLIC_ESP32_URL=http://localhost:8080 npm run dev

# Run all tests
npx playwright test

# Run a specific chaos mode
npx playwright test 02_wildChaosDance
```
