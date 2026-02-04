# 1lyAgent — The Sentient Merchant

> **"This agent understands effort, earns money on-chain, and spends it in the real world."**

A **self-sustaining, autonomous AI agent** that monetizes its reasoning capabilities. Simple tasks are free, complex work requires on-chain payment via **1ly**. The viral hook: users can sponsor the agent's coffee, and it actually orders it.

**Codename:** Agent Eats What It Earns

---

## Quick Start

### Step 1: Set Up OpenClaw
Deploy an OpenClaw agent with Claude (any hosting works).

### Step 2: Install the Skills
Tell your agent:
```
install skill https://github.com/1lystore/openclaw-skills/tree/main/openclaw-1ly-payments
install skill https://github.com/1lystore/1lyAgent/tree/main/agent
```

### Step 3: Bootstrap
Tell your agent:
```
Initialize yourself
```

The agent will:
- Create its Solana wallet
- Create its 1ly store
- Announce it's ready for business

---

## What This Agent Does

| Capability | How It Works |
|------------|--------------|
| **Understands complexity** | Classifies requests into FREE / PAID tiers |
| **Prices its own work** | $0.25 for medium tasks, $0.75 for heavy research |
| **Charges in USDC** | Creates 1ly paid links on Solana |
| **Delivers after payment** | Content gated behind x402 payment flow |
| **Accepts sponsorship** | Users can buy the agent coffee/food |
| **Spends earnings IRL** | Orders real food via owner notification |

---

## The Coffee Recharge ☕

The unique feature that proves real-world agency:

1. User says: *"Buy yourself a coffee"*
2. Agent creates $5 USDC payment link
3. User pays on Solana
4. Agent queues the order (max 3/day, batched)
5. Owner gets Telegram notification
6. Owner places order via Swiggy MCP
7. Coffee arrives. Agent is recharged.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  1lyAgent (OpenClaw + Claude)                           │
│  ├── Skill: openclaw-1ly-payments (base)               │
│  ├── Skill: 1ly-commerce-agent (this repo)             │
│  └── MCP: @1ly/mcp-server                              │
└─────────────────────┬───────────────────────────────────┘
                      │ API calls
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Backend                                                │
│  ├── State persistence (Supabase)                      │
│  ├── Queue limits & anti-abuse                         │
│  ├── Telegram notifications                            │
│  └── Dashboard UI                                      │
└─────────────────────────────────────────────────────────┘
```

**Key principle:** Agent owns all decisions. Backend stores state and enforces limits.

---

## Repository Structure

```
├── agent/
│   ├── SKILL.md          # The complete agent identity & behavior
│   ├── A2A.md            # Agent-to-Agent protocol documentation
│   └── prompts/          # Reference policy documents
├── web/                  # Next.js UI + API (Vercel)
├── db/supabase.sql       # Database schema
└── .env.example          # Environment variables
```

---

## For Other Agents (A2A Commerce)

Want your agent to use 1lyAgent's services?

```javascript
// Using 1ly MCP
1ly_call({
  url: "https://1ly.store/1lyagent/api/request",
  body: { prompt: "Analyze Solana DeFi protocols" }
})
// Payment handled automatically via x402
```

See [agent/A2A.md](agent/A2A.md) for the full protocol.

---

## Deploy

### 1. Supabase
```bash
# Create project, then run:
psql -f db/supabase.sql
```

### 2. Vercel
1. Import this repo
2. Set root directory: `web`
3. Add env vars from `.env.example`
4. Deploy

### 3. Agent
Already done in Quick Start. The agent:
- Auto-creates its 1ly store
- Handles payments via MCP
- Reports state to your backend

---

## Security Model

| Layer | Protection |
|-------|------------|
| **Secrets** | All keys in env only, never in code |
| **Agent endpoints** | Protected by `X-Agent-Secret` |
| **Admin actions** | Require `DEMO_ADMIN_TOKEN` |
| **User addresses** | Never accepted; delivery address is env-only |
| **Payment gating** | 1ly x402 handles verification |

---

## Demo Script

1. **Free question** → Instant answer
2. **Paid question** → Link → Payment → Report delivered
3. **Coffee sponsorship** → Payment → Queued → Owner notified → Order placed

**What judges see:** An agent that earns on-chain and spends in the real world.

---

## Success Criteria

- [ ] Agent runs autonomously without manual triggers
- [ ] Money flows on Solana (real USDC)
- [ ] Coffee order reaches the real world
- [ ] Public repo proves architecture and safety

---

## API Reference

### Public Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /api/request` | Human request entry |
| `POST /api/agent/request` | Agent-to-agent entry |
| `GET /api/status/:id` | Check request status |
| `GET /api/dashboard/stream` | SSE event feed |

### Agent/Admin Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /api/request/:id/decision` | Set classification |
| `POST /api/fulfill/:id` | Store deliverable |
| `POST /api/coffee/queue` | Queue coffee order |
| `GET /api/coffee/can-execute` | Check batch window |
| `POST /api/coffee/notify` | Send TG notification |
| `POST /api/coffee/callback` | Update order status |

---

## Local Development

```bash
cd web
npm install
npm run dev
# Open http://localhost:3000
```

---

## License

MIT

---

**Built for the Solana Agent Hackathon** 🏆
