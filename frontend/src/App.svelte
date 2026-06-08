<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { sendMessage, loadHistory } from './lib/api';
  import { getStoredSessionId, setStoredSessionId, clearStoredSessionId } from './lib/session';
  import type { Message } from './lib/api';

  interface UIMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: string;
    error?: boolean;
  }

  let messages: UIMessage[] = [];
  let inputText = '';
  let sessionId: string | null = null;
  let isLoading = false;
  let messagesEl: HTMLElement;
  let inputEl: HTMLTextAreaElement;

  const MAX_INPUT_LENGTH = 2000;

  const SUGGESTIONS = [
    "What's your return policy?",
    "Do you ship internationally?",
    "What are your support hours?",
    "Tell me about the NovaDock Pro",
  ];

  onMount(async () => {
    const stored = getStoredSessionId();
    if (stored) {
      const history = await loadHistory(stored);
      if (history.length > 0) {
        sessionId = stored;
        messages = history.map((m: Message) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          timestamp: m.timestamp,
        }));
        await scrollToBottom();
      }
    }
    inputEl?.focus();
  });

  async function scrollToBottom() {
    await tick();
    if (messagesEl) {
      messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
    }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isLoading) return;
    if (text.length > MAX_INPUT_LENGTH) return;

    inputText = '';

    const tempId = `user-${Date.now()}`;
    messages = [
      ...messages,
      { id: tempId, sender: 'user', text, timestamp: new Date().toISOString() },
    ];
    await scrollToBottom();

    isLoading = true;
    const typingId = `typing-${Date.now()}`;
    messages = [
      ...messages,
      { id: typingId, sender: 'ai', text: '...', timestamp: new Date().toISOString() },
    ];
    await scrollToBottom();

    try {
      const res = await sendMessage(text, sessionId ?? undefined);
      sessionId = res.sessionId;
      setStoredSessionId(res.sessionId);

      messages = messages.filter((m) => m.id !== typingId);
      messages = [
        ...messages,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: res.reply,
          timestamp: new Date().toISOString(),
        },
      ];
    } catch (err: unknown) {
      messages = messages.filter((m) => m.id !== typingId);
      const errMsg =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      messages = [
        ...messages,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: errMsg,
          timestamp: new Date().toISOString(),
          error: true,
        },
      ];
    } finally {
      isLoading = false;
      await scrollToBottom();
      inputEl?.focus();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function useSuggestion(text: string) {
    inputText = text;
    inputEl?.focus();
  }

  function startNewChat() {
    clearStoredSessionId();
    sessionId = null;
    messages = [];
    inputText = '';
    inputEl?.focus();
  }

  function formatTime(ts: string): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  $: charCount = inputText.length;
  $: charWarning = charCount > MAX_INPUT_LENGTH * 0.85;
  $: canSend = inputText.trim().length > 0 && !isLoading && charCount <= MAX_INPUT_LENGTH;
  $: showSuggestions = messages.length === 0;
</script>

<div class="app">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="logo">
      <span class="logo-icon">⚡</span>
      <div class="logo-text">
        <span class="logo-name">Volta & Co.</span>
        <span class="logo-sub">Support</span>
      </div>
    </div>

    <div class="sidebar-info">
      <div class="status-row">
        <span class="status-dot"></span>
        <span>AI Agent Online</span>
      </div>
      <div class="sidebar-hours">
        <p class="hours-label">Live Support Hours</p>
        <p>Mon–Fri, 9 AM – 6 PM EST</p>
      </div>
    </div>

    <div class="sidebar-topics">
      <p class="topics-label">Quick topics</p>
      {#each SUGGESTIONS as s}
        <button class="topic-btn" on:click={() => useSuggestion(s)}>{s}</button>
      {/each}
    </div>

    {#if messages.length > 0}
      <button class="new-chat-btn" on:click={startNewChat}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        New conversation
      </button>
    {/if}
  </aside>

  <!-- Chat panel -->
  <main class="chat-panel">
    <header class="chat-header">
      <div class="agent-info">
        <div class="agent-avatar">V</div>
        <div>
          <p class="agent-name">Volta Assistant</p>
          <p class="agent-status">
            <span class="status-dot small"></span>
            Always here to help
          </p>
        </div>
      </div>
    </header>

    <div class="messages" bind:this={messagesEl}>
      {#if showSuggestions}
        <div class="welcome">
          <div class="welcome-icon">⚡</div>
          <h2>Hi! How can I help?</h2>
          <p>Ask me anything about shipping, returns, products, or your order.</p>
          <div class="suggestion-chips">
            {#each SUGGESTIONS as s}
              <button class="chip" on:click={() => useSuggestion(s)}>{s}</button>
            {/each}
          </div>
        </div>
      {/if}

      {#each messages as msg (msg.id)}
        <div class="message-row {msg.sender}" class:typing={msg.text === '...'}>
          {#if msg.sender === 'ai'}
            <div class="avatar">V</div>
          {/if}
          <div class="bubble-wrap">
            <div class="bubble" class:error={msg.error}>
              {#if msg.text === '...'}
                <span class="typing-dots">
                  <span></span><span></span><span></span>
                </span>
              {:else}
                {msg.text}
              {/if}
            </div>
            {#if msg.text !== '...'}
              <span class="timestamp">{formatTime(msg.timestamp)}</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <div class="input-area">
      <div class="input-box" class:focused={true}>
        <textarea
          bind:this={inputEl}
          bind:value={inputText}
          on:keydown={handleKeydown}
          placeholder="Type a message…"
          rows="1"
          maxlength={MAX_INPUT_LENGTH + 100}
          disabled={isLoading}
        ></textarea>
        <div class="input-footer">
          {#if charWarning}
            <span class="char-count" class:over={charCount > MAX_INPUT_LENGTH}>
              {charCount}/{MAX_INPUT_LENGTH}
            </span>
          {:else}
            <span></span>
          {/if}
          <button
            class="send-btn"
            on:click={handleSend}
            disabled={!canSend}
            aria-label="Send message"
          >
            {#if isLoading}
              <span class="spinner"></span>
            {:else}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            {/if}
          </button>
        </div>
      </div>
      <p class="input-hint">Press Enter to send · Shift+Enter for new line</p>
    </div>
  </main>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    font-family: 'DM Sans', sans-serif;
    background: #0c0c0f;
    color: #e8e8ed;
    height: 100vh;
    overflow: hidden;
  }

  .app {
    display: flex;
    height: 100vh;
    max-width: 1100px;
    margin: 0 auto;
  }

  /* ── Sidebar ── */
  .sidebar {
    width: 240px;
    flex-shrink: 0;
    background: #111115;
    border-right: 1px solid #1e1e24;
    display: flex;
    flex-direction: column;
    padding: 24px 16px;
    gap: 28px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo-icon { font-size: 22px; }
  .logo-name {
    display: block;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.3px;
    color: #f0f0f5;
  }
  .logo-sub {
    display: block;
    font-size: 11px;
    color: #666;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .sidebar-info { display: flex; flex-direction: column; gap: 12px; }
  .status-row {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    color: #888;
  }
  .status-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #3ddc84;
    flex-shrink: 0;
    box-shadow: 0 0 6px rgba(61, 220, 132, 0.5);
  }
  .status-dot.small { width: 6px; height: 6px; }
  .sidebar-hours { font-size: 12px; color: #555; line-height: 1.6; }
  .hours-label { font-weight: 500; color: #666; margin-bottom: 2px; }

  .sidebar-topics { display: flex; flex-direction: column; gap: 4px; }
  .topics-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #444;
    margin-bottom: 4px;
    font-weight: 500;
  }
  .topic-btn {
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 12.5px;
    color: #666;
    padding: 7px 10px;
    border-radius: 6px;
    transition: background 0.15s, color 0.15s;
    line-height: 1.4;
  }
  .topic-btn:hover { background: #1a1a20; color: #ccc; }

  .new-chat-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    background: none;
    border: 1px solid #2a2a32;
    color: #888;
    font-family: inherit;
    font-size: 12.5px;
    padding: 9px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    margin-top: auto;
  }
  .new-chat-btn:hover { border-color: #444; color: #ccc; }

  /* ── Chat panel ── */
  .chat-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #0e0e12;
  }

  .chat-header {
    padding: 16px 24px;
    border-bottom: 1px solid #1a1a20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .agent-info { display: flex; align-items: center; gap: 12px; }
  .agent-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2563eb, #4f46e5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: white;
  }
  .agent-name { font-size: 14px; font-weight: 600; color: #e8e8ed; }
  .agent-status {
    font-size: 12px;
    color: #555;
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 2px;
  }

  /* ── Messages ── */
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 24px 24px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    scroll-behavior: smooth;
  }
  .messages::-webkit-scrollbar { width: 4px; }
  .messages::-webkit-scrollbar-track { background: transparent; }
  .messages::-webkit-scrollbar-thumb { background: #2a2a34; border-radius: 2px; }

  .welcome {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 10px;
    padding: 40px 20px;
  }
  .welcome-icon { font-size: 36px; margin-bottom: 4px; }
  .welcome h2 { font-size: 20px; font-weight: 600; color: #e8e8ed; }
  .welcome p { font-size: 14px; color: #555; max-width: 300px; line-height: 1.6; }
  .suggestion-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 12px;
  }
  .chip {
    background: #16161c;
    border: 1px solid #242430;
    color: #888;
    font-family: inherit;
    font-size: 12.5px;
    padding: 8px 14px;
    border-radius: 20px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .chip:hover { background: #1e1e28; border-color: #3a3a4a; color: #ccc; }

  .message-row {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    max-width: 72%;
    animation: fadeUp 0.2s ease;
  }
  .message-row.user { align-self: flex-end; flex-direction: row-reverse; }
  .message-row.ai { align-self: flex-start; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .avatar {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2563eb, #4f46e5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: white;
    flex-shrink: 0;
    margin-bottom: 18px;
  }

  .bubble-wrap { display: flex; flex-direction: column; gap: 3px; }
  .message-row.user .bubble-wrap { align-items: flex-end; }

  .bubble {
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .message-row.ai .bubble {
    background: #16161c;
    color: #d8d8e0;
    border-bottom-left-radius: 4px;
    border: 1px solid #1e1e26;
  }
  .message-row.user .bubble {
    background: #2563eb;
    color: white;
    border-bottom-right-radius: 4px;
  }
  .bubble.error {
    background: #1c1015;
    border-color: #3d1a22;
    color: #e57a8a;
  }

  .timestamp { font-size: 11px; color: #3a3a44; }

  /* Typing indicator */
  .typing-dots {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    height: 16px;
  }
  .typing-dots span {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #555;
    animation: bounce 1.2s ease-in-out infinite;
  }
  .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-5px); }
  }

  /* ── Input area ── */
  .input-area {
    padding: 16px 24px 20px;
    flex-shrink: 0;
    border-top: 1px solid #1a1a20;
  }

  .input-box {
    background: #16161c;
    border: 1px solid #242430;
    border-radius: 12px;
    transition: border-color 0.15s;
    overflow: hidden;
  }
  .input-box:focus-within { border-color: #3a3a50; }

  textarea {
    width: 100%;
    background: none;
    border: none;
    outline: none;
    resize: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: #e0e0e8;
    padding: 14px 16px 8px;
    line-height: 1.5;
    max-height: 120px;
    overflow-y: auto;
  }
  textarea::placeholder { color: #3a3a48; }
  textarea:disabled { opacity: 0.5; }

  .input-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px 10px;
  }

  .char-count {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: #555;
  }
  .char-count.over { color: #e57a8a; }

  .send-btn {
    width: 32px; height: 32px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    background: #2563eb;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, opacity 0.15s;
    flex-shrink: 0;
  }
  .send-btn:disabled { background: #1e2535; opacity: 0.5; cursor: default; }
  .send-btn:not(:disabled):hover { background: #1d55d4; }

  .spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .input-hint {
    font-size: 11px;
    color: #2e2e38;
    text-align: center;
    margin-top: 8px;
  }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .sidebar { display: none; }
  }
</style>
