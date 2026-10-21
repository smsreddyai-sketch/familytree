import { Redis } from '@upstash/redis';

// Vercel's Upstash Redis integration sets the KV_* names; a direct Upstash setup uses UPSTASH_*.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const client = url && token ? new Redis({ url, token }) : null;

// The first tree keeps the original (pre multi-tree) keys, so its data never has to move.
export const MAIN_TREE = 'main';
const MAIN_TREE_NAME = 'SAMA Family Tree';
const treeKey = (treeId, name) => (treeId === MAIN_TREE ? `ft:${name}` : `ft:t:${treeId}:${name}`);

// One hash field per record, so two people saving different records can't overwrite each other.
export const KEYS = {
  trees: 'ft:trees',
  people: treeId => treeKey(treeId, 'people'),
  unions: treeId => treeKey(treeId, 'unions'),
  users: treeId => treeKey(treeId, 'users'),
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

export async function getTree(treeId) {
  const [people, unions] = await Promise.all([getAll(KEYS.people(treeId)), getAll(KEYS.unions(treeId))]);
  return { people, unions };
}

// All family trees, oldest first. The main tree exists even before it is first renamed.
export async function listTrees() {
  const trees = await getAll(KEYS.trees);
  if (!trees.some(t => t.id === MAIN_TREE)) trees.push({ id: MAIN_TREE, name: MAIN_TREE_NAME, createdAt: 0 });
  return trees.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export async function getTreeInfo(treeId) {
  if (!treeId) return null;
  const stored = await getOne(KEYS.trees, treeId);
  if (stored) return stored;
  return treeId === MAIN_TREE ? { id: MAIN_TREE, name: MAIN_TREE_NAME, createdAt: 0 } : null;
}
