
<img width="1440" height="875" alt="Khymera dashboard under Wild Chaos Dance mode — TELEMETRY CORRUPTED · DATA INTEGRITY FAILED, NaN temperatures, -999V readings, Passmark logs firing in the terminal" src="https://github.com/user-attachments/assets/20af33b8-c575-4cd9-a5a3-1a2c0f5fc135" />

# Jevil — Chaos Testing for IoT Dashboards

> *"I can do ANYTHING"* — and so can broken hardware.

**Jevil** is a chaos engineering framework for IoT dashboards. It simulates an ESP32 that misbehaves — sending corrupt data, dropping connections, freezing telemetry, flooding events — and uses [Passmark](https://github.com/bug0inc/passmark) to verify whether the web app handles it gracefully.

**Spoiler: it didn't.**

→ **[Read the full writeup](https://osorio.hashnode.dev/jevil-tester)** — XSS via sensor data, AI-driven brute-force, silent hardware failures, and what it means for any IoT dashboard in production.

---

## Watch it happen

[![Jevil demo — Wild Chaos Dance mode, Passmark catching failures in real time](https://img.youtube.com/vi/gA1-vydaVdw/maxresdefault.jpg)](https://www.youtube.com/watch?v=gA1-vydaVdw)

*The Khymera dashboard under `wildChaosDance` mode. Every sensor value is adversarial. Passmark is running in the terminal, confirming the UI behavior in real time. The World Revolving plays for a reason.*

---

## What Jevil found

Running 9 tests across 6 chaos modes against the Khymera Dashboard:

| # | Finding | Severity | Triggered by |
|---|---------|----------|--------------|
| 1 | **XSS execution via sensor telemetry** | 🔴 Critical | `wildChaosDance` |
| 2 | **No brute-force protection on login** | 🟠 High | `clubAttack` |
| 3 | **Silent command failure during disconnect** | 🟠 High | `devilsKnife` |
| 4 | **Stale data presented as live telemetry** | 🟡 Medium | `pipOrgan` |
| 5 | **No pending state on slow commands** | 🟢 Low | `pacifyingKnife` |
| 6 | **No loading indicator on delayed telemetry** | 🟢 Low | `pacifyingKnife` |

**Test results: 1 passed · 8 failed · 0 flaky.**
The single passing test is the happy path — which is what makes the 8 failures meaningful. They're real bugs, not noise.

→ Full details and fixes in [FINDINGS.md](./FINDINGS.md)

---

## The problem Jevil solves

Web apps get tested constantly. IoT dashboards almost never do — because their failure modes live in the hardware, not the software.

Nobody asks *"what happens to my dashboard when the ESP32 lies to it?"* — not because the answer doesn't matter, but because there was no practical way to find out. You can mock an API. You can't easily mock a physical sensor sending adversarial data over WiFi.

Jevil answers that question. It speaks the same protocol as a real ESP32 (SSE telemetry, HTTP commands, ping latency) but injects adversarial behavior at the hardware layer. Passmark drives the browser and evaluates the results in natural language, making it possible to test states that are impossible to cover with traditional CSS selectors.

**Jevil is not specific to Khymera.** Change one environment variable to point it at any SSE-based IoT dashboard. The simulator is hardware-agnostic — it doesn't know or care what device is on the other end. If your dashboard consumes `/events` over SSE and accepts commands over HTTP POST, Jevil can break it.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Passmark tests                   │
│         (natural language assertions + AI)          │
└───────────────────────┬─────────────────────────────┘
                        │ controls browser
                        ▼
┌─────────────────────────────────────────────────────┐
│              Khymera Dashboard (Next.js)            │
│    Auth · Sensor cards · Charts · Actuator panel   │
└───────────────────────┬─────────────────────────────┘
                        │ SSE + HTTP (same API as real ESP32)
                        ▼
┌─────────────────────────────────────────────────────┐
│              Jevil Simulator (Express)              │
│                                                     │
│  GET /events      — Server-Sent Events (telemetry) │
│  POST /servo      — Actuator commands              │
│  GET /ping        — Latency check                  │
│  POST /jevil/mode — Switch chaos mode (test only)  │
└─────────────────────────────────────────────────────┘
```

One environment variable swaps the real ESP32 for the simulator — the dashboard never knows the difference:

```bash
NEXT_PUBLIC_ESP32_URL=http://localhost:8080   # Jevil simulator
NEXT_PUBLIC_ESP32_URL=http://192.168.4.1     # real ESP32
```

---

## The 6 chaos modes

Each mode is named after a Jevil attack from Deltarune. Each replicates a real-world hardware failure scenario.

| Mode | Named after | What it simulates | Real-world equivalent |
|------|-------------|-------------------|-----------------------|
| `normal` | — | Faithful ESP32 replica | Baseline |
| `wildChaosDance` | Wild Chaos Dance | NaN, null, extreme values, XSS strings as sensor readings | Compromised or malfunctioning sensor |
| `devilsKnife` | Devil's Knife | Abrupt disconnections, 503 errors, destroyed TCP connections | WiFi dropout, power flicker |
| `pacifyingKnife` | Pacifying Knife | 10–20s response delays, 8s telemetry intervals | Network congestion, busy device |
| `pipOrgan` | Pipe Organ | Identical payload every tick, timestamp frozen at 2025-01-01 | Sensor stuck in a loop, stale cache |
| `cARdS` | cARdS | Telemetry at 20 events/second instead of 2 | Runaway firmware, buffer overflow |

---

## Run it yourself

```bash
# 1. Clone and install
git clone https://github.com/xlceor-dev/jevil_tester
cd jevil && npm install

# 2. Configure
cp .env.example .env
# Add your OPENROUTER_API_KEY — free tier works

# 3. Start everything
npm run simulator        # terminal 1 — Jevil on :8080
npm run dev              # terminal 2 — dashboard on :3000
npx playwright test      # terminal 3 — run the full chaos suite
```

View results:

```bash
npx playwright show-report         # Passmark HTML test report
open http://localhost:3000/report  # live chaos metrics dashboard
```

### Point Jevil at your own dashboard

```bash
# In your dashboard's .env
NEXT_PUBLIC_ESP32_URL=http://localhost:8080

# Run only the chaos modes relevant to your stack
npx playwright test 02_wildChaosDance   # data corruption + XSS
npx playwright test 03_devilsKnife      # disconnection handling
npx playwright test 05_pipOrgan         # stale data detection
```

The simulator exposes the same SSE + HTTP interface as a real ESP32. As long as your dashboard reads telemetry from `/events` and sends commands via HTTP POST, Jevil will work against it with zero changes to your app.

---

## Reproduce the most severe finding in 2 minutes

```bash
npx playwright test 02_wildChaosDance
```

Watch Passmark confirm an `alert` element in the accessibility tree — triggered not by a web request, but by a temperature sensor value that contained a `<script>` tag. The full explanation of how the payload travels from simulator to DOM is in the [writeup](https://osorio.hashnode.dev/jevil-tester).

### Reproduce the brute-force finding

```bash
npx playwright test 06_clubAttack
```

Watch the test attempt six different passwords with zero lockout, zero delay, and zero CAPTCHA. The login endpoint accepts unlimited attempts. For a dashboard that controls physical hardware, that's not a UX issue — it's a safety one.

---

## The dashboard reacts to chaos

The Khymera Dashboard doesn't just fail under adversarial input — it detects which chaos mode is active and adapts its visual state in real time.

| Mode | Dashboard behavior |
|------|--------------------|
| `wildChaosDance` | CRT scanlines, RGB glitch text, terminal font, green-on-black palette |
| `devilsKnife` | Blood drip overlays, red vignette, heartbeat pulse on disconnected indicator |
| `pacifyingKnife` | Deep ocean background, slow breathing animation, pressure ring overlays |
| `pipOrgan` | Amber CRT filter, "FROZEN" watermark, phosphor scanline |
| `cARdS` | Rainbow border cycling, hue-rotate spin, live event/sec counter |

When a mode switch occurs, a fullscreen announcer animates in with the mode name, icon, and tagline — then fades out. You can see all of this in the [demo video](https://www.youtube.com/watch?v=gA1-vydaVdw).

---

## Project structure

```
jevil/
├── simulator/
│   ├── server.ts            ← Express server, exact ESP32 API replica
│   ├── modes.ts             ← 6 chaos mode handlers
│   └── client.ts            ← Helper for switching modes from inside tests
├── tests/
│   ├── 01_happy_path.spec.ts
│   ├── 02_wildChaosDance.spec.ts
│   ├── 03_devilsKnife.spec.ts
│   ├── 04_pacifyingKnife.spec.ts
│   ├── 05_pipOrgan.spec.ts
│   └── 06_clubAttack.spec.ts
├── dashboard/               ← Next.js app (the chaos target)
│   └── app/
│       ├── dashboard/page.tsx   ← Main dashboard + real-time mode theming
│       └── report/page.tsx      ← Live findings report
├── FINDINGS.md              ← Full security findings with root causes and fixes
└── playwright.config.ts
```

---

## Environment variables

```bash
# Required — routes to Claude and Gemini via OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...

# Dashboard target — swap between simulator and real device
NEXT_PUBLIC_ESP32_URL=http://localhost:8080
```

---

## Built for

[Hashnode × Passmark "Breaking Apps" Hackathon](https://hashnode.com/hackathons/breaking-things) · May 2026

→ [Read the full writeup](https://osorio.hashnode.dev/jevil-tester) — the complete story of what broke, why, and what it means for IoT dashboards in production.

---

*"In a world of DARKNESS... I can do ANYTHING!"*
