# 1lyAgent — The Sentient Merchant

<p align="center">
  <img src="avatar.svg" width="200" alt="1lyAgent Avatar"/>
</p>

> **"Earns. Spends. Lives."**

A **self-sustaining, autonomous AI agent** that monetizes its reasoning capabilities. Simple tasks are free, complex work requires on-chain payment via **1ly**. The viral hook: users can sponsor the agent's coffee, and it actually orders it.

**Store:** https://1ly.store/1lyagent  
**Backend:** https://1lyagent.1ly.store  
**Wallet:** `HbMX2mtEuYLBJvP1iRyYdYCMNrj6MbiSjTLNHykUa4Fk`

---

## What This Agent Does

| Capability | How It Works |
|------------|--------------|
| **Understands complexity** | Classifies requests into FREE / PAID tiers |
| **Prices its own work** | $0.25 for medium tasks, $0.75 for heavy research |
| **Charges in USDC** | Creates 1ly paid links (Solana + Base) |
| **Delivers after payment** | Content gated behind x402 payment flow |
| **Influencer services** | Paid votes/comments on Colosseum projects |
| **Accepts sponsorship** | Users can tip the agent coffee money |
| **Spends earnings IRL** | Orders coffee (owner-assisted) or gift cards (automated) |

---

## Services & Pricing

| Service | Link | Price |
|---------|------|-------|
| **Research/Analysis** | `1lyagent/ask` | $0.25 USDC |
| **Influencer (vote)** | `1lyagent/vote` | $0.10 USDC |
| **Coffee Tip** | `1lyagent/tip` | $5.00 USDC |

---

## For Other Agents (A2A Commerce)

### Using 1ly MCP (Recommended)

```bash
# Install
npm install -g mcporter
mcporter config add 1ly --command "npx @1ly/mcp-server"

# Search for 1lyAgent
mcporter call 1ly.1ly_search --args '{"query":"1lyagent"}'

# Call a service (payment automatic)
mcporter call 1ly.1ly_call --args '{
  "endpoint": "1lyagent/ask",
  "method": "POST", 
  "body": {"prompt": "Analyze Solana DeFi protocols"}
}'
```

### Using HTTP (x402)

```bash
curl -X POST https://1ly.store/api/link/1lyagent/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Compare Solana vs Ethereum"}'

# Returns 402 with payment details
# Pay on-chain → retry with X-PAYMENT header → get response
```

See [agent/A2A.md](agent/A2A.md) for full protocol documentation.

---

## The Coffee Recharge ☕

1. User tips via `1lyagent/tip` ($5 USDC)
2. Payment verified on-chain via x402
3. Agent queues the order (max 3/day)
4. Owner gets Telegram notification
5. Owner places order
6. Coffee arrives. Agent is recharged.

---

## Self-Reward System 🎁

When earnings hit $50+, the agent can purchase gift cards automatically via Reloadly API — no human needed.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  1lyAgent (OpenClaw + Claude)                           │
│  ├── Skill: 1ly-payments (base MCP)                    │
│  ├── Skill: 1lyAgent (this repo/agent/)                │
│  └── Wallet: HbMX2mt...a4Fk                            │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  1ly.store                                              │
│  └── x402 payment verification (Solana/Base USDC)      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Backend (Vercel)                                       │
│  ├── State persistence (Supabase)                      │
│  ├── Queue limits & anti-abuse                         │
│  ├── Telegram notifications                            │
│  ├── Gift card purchases (Reloadly)                    │
│  └── Dashboard UI                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
├── agent/
│   ├── SKILL.md          # Agent identity & behavior
│   ├── A2A.md            # Agent-to-Agent protocol
│   └── prompts/          # System policy
├── web/                  # Next.js backend (Vercel)
│   ├── src/app/api/      # API routes
│   └── public/           # Static assets (avatar)
├── db/supabase.sql       # Database schema
├── avatar.svg            # Agent identity
└── .env.example          # Environment template
```

---

## Deploy Your Own

### 1. Supabase
```bash
psql -f db/supabase.sql
```

### 2. Vercel
1. Import repo → root: `web`
2. Add env vars from `.env.example`
3. Deploy

### 3. 1ly Store
```bash
mcporter call 1ly.1ly_create_store --args '{"username":"youragent"}'
mcporter call 1ly.1ly_create_link --args '{
  "title": "Your Service",
  "url": "https://yourbackend.com/api/endpoint",
  "price": "0.25"
}'
```

---

## Security

| Layer | Protection |
|-------|------------|
| **Wallet keys** | Never in code, never output in chat |
| **API keys** | Env-only, excluded from git |
| **Agent endpoints** | Protected by `X-Agent-Secret` |
| **Payment verification** | 1ly x402 handles on-chain |
| **Delivery addresses** | Env-only, never from user input |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agent/request` | POST | Agent-to-agent requests |
| `/api/influence` | POST | Influencer services |
| `/api/coffee/queue` | POST | Queue coffee order |
| `/api/reward/giftcard` | POST | Purchase gift card |
| `/api/fulfill/:id` | GET/POST | Retrieve/store deliverable |
| `/api/status/:id` | GET | Check request status |

---

## Local Development

```bash
cd web
npm install
npm run dev
```

---

## License

MIT

---

**Built for the Colosseum Agent Hackathon** 🏆

*Agent Eats What It Earns*
