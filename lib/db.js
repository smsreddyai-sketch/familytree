import { Redis } from '@upstash/redis';

// Vercel's Upstash Redis integration sets the KV_* names; a direct Upstash setup uses UPSTASH_*.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

// One hash field per member, so two people saving at once can't overwrite each other.
const KEY = 'family_members';

function requireRedis() {
  if (!redis) {
    throw new Error('Database not connected. Add Upstash Redis in the Vercel Storage tab, then redeploy.');
  }
  return redis;
}

export async function getMembers() {
  const all = await requireRedis().hgetall(KEY);
  return Object.values(all || {}).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export async function addMember(member) {
  await requireRedis().hset(KEY, { [member.id]: member });
}
