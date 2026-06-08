const { Router } = require('express');
const {
  createConversation,
  saveMessage,
  getMessages,
  conversationExists,
} = require('../services/conversationService');
const { generateReply } = require('../services/llm');

const router = Router();

const MAX_MESSAGE_LENGTH = 10_000;

// POST /chat/message
router.post('/message', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // Input validation
    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const trimmedMessage = message.trim();

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message is too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    // Session / conversation handling
    let conversationId;

    if (sessionId && typeof sessionId === 'string' && sessionId.trim()) {
      const exists = await conversationExists(sessionId.trim());
      if (exists) {
        conversationId = sessionId.trim();
      } else {
        const conv = await createConversation();
        conversationId = conv.id;
      }
    } else {
      const conv = await createConversation();
      conversationId = conv.id;
    }

    // Persist user message
    await saveMessage(conversationId, 'user', trimmedMessage);

    // Build history for LLM (exclude the message we just saved)
    const allMessages = await getMessages(conversationId);
    const history = allMessages
      .slice(0, -1)
      .map((m) => ({ sender: m.sender, text: m.text }));

    // Call LLM
    let reply;
    try {
      reply = await generateReply(history, trimmedMessage);
    } catch (llmError) {
      console.error('LLM error:', llmError);

      const msg = llmError instanceof Error ? llmError.message : String(llmError);
      const isApiKeyError = msg.includes('API key') || msg.includes('401') || msg.includes('authentication');
      const isRateLimit = msg.includes('429') || msg.includes('rate limit');

      if (isApiKeyError) {
        reply = "I'm sorry, there's a configuration issue on our end. Please contact support directly at support@voltaandco.com.";
      } else if (isRateLimit) {
        reply = "I'm receiving a lot of messages right now. Please try again in a moment!";
      } else {
        reply = "I'm having trouble connecting right now. Please try again shortly, or reach us at support@voltaandco.com.";
      }
    }

    // Persist AI reply
    await saveMessage(conversationId, 'ai', reply);

    return res.json({ reply, sessionId: conversationId });
  } catch (err) {
    console.error('Unexpected error in /chat/message:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// GET /chat/history/:sessionId
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const exists = await conversationExists(sessionId);
    if (!sessionId || !exists) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const messages = await getMessages(sessionId);
    return res.json({ sessionId, messages });
  } catch (err) {
    console.error('Error fetching history:', err);
    return res.status(500).json({ error: 'Failed to fetch conversation history.' });
  }
});

module.exports = router;
