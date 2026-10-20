import { Redis } from '@upstash/redis';

// Vercel's Upstash Redis integration sets the KV_* names; a direct Upstash setup uses UPSTASH_*.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const client = url && token ? new Redis({ url, token }) : null;

// One hash field per record, so two people saving different records can't overwrite each other.
export const KEYS = {
  people: 'ft:people',
  unions: 'ft:unions',
  users: 'ft:users',
  otp: email => `ft:otp:${email}`,
  otpCooldown: email => `ft:otp-cooldown:${email}`,
};

export function redis() {
  if (!client) {
    throw new Error('Database not connected. Add Upstash Redis in the Vercel Storage tab, then redeploy.');
  }
  return client;
}

export async function getAll(key) {
  const all = await redis().hgetall(key);
  return Object.values(all || {});
}

export async function getOne(key, id) {
  return (await redis().hget(key, id)) || null;
}

export async function getTree() {
  const [people, unions] = await Promise.all([getAll(KEYS.people), getAll(KEYS.unions)]);
  return { people, unions };
}
