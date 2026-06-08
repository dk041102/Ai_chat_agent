# ⚡ Volta & Co. — AI Live Chat Agent

A customer support chat app powered by Claude (Anthropic). Users can ask questions about the fictional store **Volta & Co.** and get contextual, conversation-aware AI responses.

**Stack:** Node.js + JavaScript (backend) · Svelte + Vite (frontend) · SQLite via sql.js (pure JS, no native build) · Anthropic Claude API

---

## Quick Start

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)


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

## Deployment

**Backend** → [Render](https://render.com) free tier — set `ANTHROPIC_API_KEY` in environment variables dashboard.

**Frontend** → [Vercel](https://vercel.com) or [Netlify](https://netlify.com) — for production, point the API base URL at your deployed backend.
