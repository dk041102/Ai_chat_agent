const { v4: uuidv4 } = require('uuid');
const { getDb, saveDb } = require('../db/database');

async function createConversation() {
  const db = await getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO conversations (id, created_at, updated_at) VALUES (?, ?, ?)`,
    [id, now, now]
  );
  saveDb(db);

  return { id, createdAt: now, updatedAt: now };
}

async function getConversation(id) {
  const db = await getDb();
  const stmt = db.prepare(`SELECT id, created_at as createdAt, updated_at as updatedAt FROM conversations WHERE id = ?`);
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

async function saveMessage(conversationId, sender, text) {
  const db = await getDb();
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  db.run(
    `INSERT INTO messages (id, conversation_id, sender, text, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [id, conversationId, sender, text, timestamp]
  );
  db.run(`UPDATE conversations SET updated_at = ? WHERE id = ?`, [timestamp, conversationId]);
  saveDb(db);

  return { id, conversationId, sender, text, timestamp };
}

async function getMessages(conversationId) {
  const db = await getDb();
  const results = db.exec(
    `SELECT id, conversation_id as conversationId, sender, text, timestamp
     FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC`,
    [conversationId]
  );

  if (!results.length) return [];

  const { columns, values } = results[0];
  return values.map((row) =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  );
}

async function conversationExists(id) {
  const conv = await getConversation(id);
  return conv !== null;
}

module.exports = {
  createConversation,
  getConversation,
  saveMessage,
  getMessages,
  conversationExists,
};
