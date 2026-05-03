// /api/sync.js
// Save and load user data to/from Upstash Redis (Vercel Marketplace).
// Uses a simple passcode for "auth" — not real security, just keeps data segregated by user.

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, passcode, data } = req.body;

    if (!passcode || typeof passcode !== 'string' || passcode.length < 4) {
      return res.status(400).json({ error: 'Passcode required (min 4 characters)' });
    }

    // Sanitize passcode for use as redis key prefix
    const userKey = `pogosyan-budget:${passcode.replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)}`;

    if (action === 'save') {
      if (!data) {
        return res.status(400).json({ error: 'No data provided' });
      }
      await redis.set(userKey, JSON.stringify(data));
      const savedAt = new Date().toISOString();
      await redis.set(`${userKey}:lastSaved`, savedAt);
      return res.status(200).json({ ok: true, savedAt });
    }

    if (action === 'load') {
      const raw = await redis.get(userKey);
      const lastSaved = await redis.get(`${userKey}:lastSaved`);
      if (!raw) {
        return res.status(200).json({ ok: true, data: null, lastSaved: null });
      }
      // Upstash auto-deserializes if value was stored as JSON string
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return res.status(200).json({ ok: true, data, lastSaved });
    }

    return res.status(400).json({ error: 'Invalid action. Use "save" or "load".' });

  } catch (e) {
    console.error('Sync error:', e);
    return res.status(500).json({ error: 'Server error', detail: e.message });
  }
}
