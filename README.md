# ⚡ Volta & Co. — AI Live Chat Agent

A customer support chat app powered by Claude (Anthropic). Users can ask questions about the fictional store **Volta & Co.** and get contextual, conversation-aware AI responses.

**Stack:** Node.js + JavaScript (backend) · Svelte + Vite (frontend) · SQLite via sql.js (pure JS, no native build) · Anthropic Claude API

---

## Quick Start

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone & install

```bash
git clone <repo-url>
cd ai-chat-agent
```

Install backend deps:
```bash
cd backend
npm install
```

Install frontend deps:
```bash
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set your key:
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
FRONTEND_URL=http://localhost:5173
```

> **Note:** The SQLite database (`data/chat.db`) is created automatically on first run — no manual DB setup needed.

### 3. Run

**Backend** (from `backend/`):
```bash
npm run dev    # uses node --watch for auto-reload
# or
npm start      # plain node, no auto-reload
```
Server starts on `http://localhost:3001`

**Frontend** (from `frontend/`):
```bash
npm run dev
```
App opens on `http://localhost:5173`

---

## Project Structure

```
ai-chat-agent/
├── backend/
│   ├── src/
│   │   ├── index.js                      # Express app entry point
│   │   ├── routes/
│   │   │   └── chat.js                   # POST /chat/message · GET /chat/history/:id
│   │   ├── services/
│   │   │   ├── llm.js                    # Anthropic Claude wrapper: generateReply()
│   │   │   ├── conversationService.js    # SQLite CRUD for conversations & messages
│   │   │   └── storeKnowledge.js         # Store FAQ injected into system prompt
│   │   ├── db/
│   │   │   ├── database.js               # SQLite connection singleton
│   │   │   └── migrate.js                # Schema creation (runs on startup)
│   │   └── middleware/
│   │       └── errorHandler.js           # 404 + global error middleware
│   ├── data/                             # SQLite DB lives here (git-ignored)
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.svelte                    # Full chat UI
    │   ├── main.js
    │   └── lib/
    │       ├── api.js                    # Fetch wrappers for the backend API
    │       └── session.js                # localStorage session persistence
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## API Reference

### `POST /chat/message`
```json
// Request
{ "message": "What is your return policy?", "sessionId": "optional-uuid" }

// Response 200
{ "reply": "We offer 30-day hassle-free returns...", "sessionId": "uuid" }

// Response 400
{ "error": "Message cannot be empty." }
```

### `GET /chat/history/:sessionId`
```json
{
  "sessionId": "uuid",
  "messages": [
    { "id": "...", "sender": "user", "text": "...", "timestamp": "..." },
    { "id": "...", "sender": "ai",   "text": "...", "timestamp": "..." }
  ]
}
```

### `GET /health`
```json
{ "status": "ok", "timestamp": "2024-..." }
```

---

## LLM Notes

**Provider:** Anthropic Claude (`claude-sonnet-4-20250514`)

**Prompting strategy:**
- A detailed system prompt injects all store knowledge (shipping, returns, warranty, products, support hours) as a `STORE_INFORMATION` block in `storeKnowledge.js`.
- Up to **20 previous messages** are passed as history so replies are contextual.
- Individual messages are truncated at **4,000 characters** to control token usage.
- `max_tokens` capped at **1,024** per response.

**Error handling:**
- API key / auth errors → "configuration issue" message
- Rate limit (429) → "try again in a moment" message
- Any other LLM failure → generic "trouble connecting" message
- Backend never crashes — all LLM errors are caught and surfaced as clean chat messages.

---

## Data Model (SQLite)

```sql
conversations (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  updated_at TEXT,
  metadata TEXT        -- reserved for future use
)

messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  sender TEXT          -- 'user' | 'ai'
  text TEXT,
  timestamp TEXT
)
```

---

## Trade-offs & "If I Had More Time…"

| Area | Current | Would improve |
|---|---|---|
| Database | SQLite | Postgres with connection pooling |
| Streaming | Full response only | Stream tokens via SSE for snappier feel |
| Auth | None | Session tokens or Clerk for multi-user |
| Rate limiting | None | Per-IP limit via `express-rate-limit` |
| Tests | None | Unit tests for `llm.js`, integration tests for routes |
| Knowledge base | Hardcoded string | DB-backed FAQ rows with an admin UI |
| Caching | None | Redis to cache repeated FAQ answers |
| Observability | `console.log` | Structured logging (pino) + request tracing |

---

## Deployment

**Backend** → [Render](https://render.com) free tier — set `ANTHROPIC_API_KEY` in environment variables dashboard.

**Frontend** → [Vercel](https://vercel.com) or [Netlify](https://netlify.com) — for production, point the API base URL at your deployed backend.
