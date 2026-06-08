export interface Message {
  id: string;
  conversationId: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface SendMessageResponse {
  reply: string;
  sessionId: string;
}

const BASE_URL = '/chat';

export async function sendMessage(
  message: string,
  sessionId?: string
): Promise<SendMessageResponse> {
  const res = await fetch(`${BASE_URL}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function loadHistory(sessionId: string): Promise<Message[]> {
  const res = await fetch(`${BASE_URL}/history/${sessionId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.messages ?? [];
}
