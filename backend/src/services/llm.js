const OpenAI = require("openai").default;
const { STORE_KNOWLEDGE } = require("./storeKnowledge");

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_TOKENS = 1024;

let openai = null;

function getClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set in environment variables"
      );
    }

    openai = new OpenAI({
      apiKey,
    });
  }

  return openai;
}

function truncateMessage(text) {
  if (text.length > MAX_MESSAGE_LENGTH) {
    return (
      text.slice(0, MAX_MESSAGE_LENGTH) +
      "... [message truncated]"
    );
  }

  return text;
}

function buildMessageHistory(history, userMessage) {
  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);

  const messages = recentHistory.map((msg) => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: truncateMessage(msg.text),
  }));

  messages.push({
    role: 'user',
    content: truncateMessage(userMessage),
  });

  return messages;
}

// async function generateReply(history, userMessage) {
//   const messages = buildMessageHistory(history, userMessage);

//  const client = getClient();

// const response =
//   await client.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [
//       {
//         role: "system",
//         content: STORE_KNOWLEDGE,
//       },
//       ...messages,
//     ],
//     max_tokens: MAX_TOKENS,
//   });

// return response.choices[0].message.content;

 async function generateReply(history, userMessage) {
  const messages = buildMessageHistory(history, userMessage);

  const client = getClient();

  const response =
    await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: STORE_KNOWLEDGE,
        },
        ...messages,
      ],
      max_tokens: MAX_TOKENS,
    });

  return response.choices[0].message.content;
}

module.exports = { generateReply };
