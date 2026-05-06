

<img width="1440" height="875" alt="Captura de pantalla 2026-05-06 a la(s) 3 21 25 p m" src="https://github.com/user-attachments/assets/20af33b8-c575-4cd9-a5a3-1a2c0f5fc135" />


# Jevil — Chaos Testing for IoT Apps

> *"I can do ANYTHING"* — and so can broken hardware.

**Jevil** is a chaos engineering framework for IoT dashboards. It simulates an ESP32 that misbehaves — sending corrupt data, dropping connections, freezing telemetry, flooding events — and uses [Passmark](https://github.com/bug0inc/passmark) to verify whether the web app handles it gracefully.

**Spoiler: it didn't.**

---

<!-- VIDEO: replace with your actual demo -->
> 📹 **[Watch the demo](https://your-video-link)** — dashboard modes switching in real time as Jevil runs chaos tests

---

## What Jevil found

Running 9 tests across 6 chaos modes against the [Khymera Dashboard](./dashboard), Jevil uncovered the following:

| # | Finding | Severity | Triggered by | Evidence |
|---|---------|----------|--------------|---------|
| 1 | **XSS execution via sensor telemetry** | 🔴 Critical | `wildChaosDance` | AI detected live `alert` element in accessibility tree |
| 2 | **No brute force protection on login** | 🟠 High | `clubAttack` | 6 password attempts, zero lockouts, zero delays |
| 3 | **Silent command failure during disconnect** | 🟠 High | `devilsKnife` | Dashboard showed "CONNECTED" while commands dropped |
| 4 | **Stale data presented as live telemetry** | 🟡 Medium | `pipOrgan` | Jan 2025 data, 4ms latency, no warning shown |
| 5 | **No pending state on slow commands** | 🟢 Low | `pacifyingKnife` | Enviar button unchanged during 20s response delay |
| 6 | **No loading indicator on delayed telemetry** | 🟢 Low | `pacifyingKnife` | Old values shown with no staleness indication |

**Test results: 1 passed · 8 failed · 0 flaky**
The one that passed is the happy path — proving the failures are real bugs, not false positives.

→ Full details in [FINDINGS.md](./FINDINGS.md)

---

## The problem Jevil solves

Web apps get tested constantly. IoT dashboards almost never do — because their failure modes live in the hardware, not the software. Nobody tests *"what happens to my dashboard when the ESP32 lies to it?"*

Jevil answers that question. It speaks the same protocol as a real ESP32 (SSE telemetry, HTTP commands, ping latency) but injects adversarial behavior at the hardware layer. Passmark drives the browser and evaluates the results in natural language, making it possible to test states that are impossible to cover with traditional selectors.

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
│  GET /events  ─ Server-Sent Events (telemetry)     │
│  POST /servo  ─ Actuator commands                  │
│  GET /ping    ─ Latency check                      │
│  POST /jevil/mode ─ Switch chaos mode (test only)  │
└─────────────────────────────────────────────────────┘
```

A single environment variable points the dashboard at the simulator instead of the real device:

```bash
NEXT_PUBLIC_ESP32_URL=http://localhost:8080   # simulator
NEXT_PUBLIC_ESP32_URL=http://192.168.4.1     # real ESP32
```

---

## The 6 chaos modes

Each mode is named after a Jevil attack from Deltarune. Each replicates a real-world failure scenario.

| Mode | Named after | What it does | Real-world equivalent |
|------|-------------|--------------|----------------------|
| `normal` | — | Faithful ESP32 replica | Baseline |
| `wildChaosDance` | Wild Chaos Dance | NaN, null, extreme values, XSS strings as sensor data | Compromised or malfunctioning sensor |
| `devilsKnife` | Devil's Knife | Abrupt disconnections, 503 errors, destroyed HTTP responses | WiFi dropout, power flicker |
| `pacifyingKnife` | Pacifying Knife | 10–20s response delays, 8s telemetry intervals | Network congestion, busy device |
| `pipOrgan` | Pipe Organ | Identical payload on every tick, timestamp frozen at 2025-01-01 | Sensor stuck in a loop, stale cache |
| `cARdS` | cARdS | Telemetry at 20 events/second instead of 2 | Runaway firmware, buffer overflow |

---

## Run it yourself

```bash
# 1. Clone and install
git clone https://github.com/xlceor-dev/jevil_tester
cd jevil && npm install

# 2. Configure API keys
cp .env.example .env
# Add your OPENROUTER_API_KEY (free tier works)

# 3. Start simulator + dashboard + tests
npm run simulator        # terminal 1 — Jevil on :8080
npm run dev              # terminal 2 — dashboard on :3000
npx playwright test      # terminal 3 — run the chaos suite
```

View results:

```bash
npx playwright show-report    # Passmark test report
open http://localhost:3000/report  # live chaos metrics dashboard
```

---

## Test the brute force finding yourself

```bash
npx playwright test 06-clubAttack
```

Watch the test attempt `wrongpassword1` through `wrongpassword5` with no lockout, no delay, and no CAPTCHA. The login accepts unlimited attempts. For a dashboard controlling physical hardware, that's not a UX issue — it's a safety one.

---

## The dashboard reacts to chaos

The Khymera Dashboard isn't just a test target — it actively detects which chaos mode is running and adapts its visual state in real time.

| Mode | Dashboard behavior |
|------|--------------------|
| `wildChaosDance` | CRT scanlines, RGB glitch text, terminal font, green-on-black palette |
| `devilsKnife` | Blood drip overlays, red vignette, heartbeat pulse on disconnected indicator |
| `pacifyingKnife` | Deep ocean bg, slow breathing animation, pressure ring overlays |
| `pipOrgan` | Amber CRT filter, "FROZEN" watermark, phosphor scanline |
| `cARdS` | Rainbow border cycling, hue-rotate spin, event/sec counter |

When the mode changes, a fullscreen announcer animates in with the mode name, icon, and tagline — then fades out.

---

## Project structure

```
jevil/
├── simulator/
│   ├── server.ts       ← Express server, exact ESP32 API replica
│   ├── modes.ts        ← 6 chaos mode handlers
│   └── client.ts       ← Helper for switching modes from tests
├── tests/
│   ├── 01_happy_path.spec.ts
│   ├── 02_wildChaosDance.spec.ts
│   ├── 03_devilsKnife.spec.ts
│   ├── 04_pacifyingKnife.spec.ts
│   ├── 05_pipOrgan.spec.ts
│   └── 06_clubAttack.spec.ts
├── dashboard/          ← Next.js app (the chaos target)
│   └── app/
│       ├── dashboard/page.tsx   ← Main dashboard + mode theming
│       └── report/page.tsx      ← Live findings report
├── FINDINGS.md         ← Full security findings document
└── playwright.config.ts
```

---

## Environment variables

```bash
# Required — one key routes to both Claude and Gemini via OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...

# Dashboard target (simulator or real device)
NEXT_PUBLIC_ESP32_URL=http://localhost:8080
```

---

## Built for

[Hashnode × Passmark "Breaking Apps" Hackathon](https://hashnode.com/hackathons/breaking-things) · May 2025

→ [Read the full writeup on Hashnode](https://osorio.hashnode.dev/jevil-tester-building-a-chaos-testing-tool-for-iot-apps-and-for-braking-my-own-esp32-dashboard-after-the-project-itself)

---

*"In a world of DARKNESS... I can do ANYTHING!"*
