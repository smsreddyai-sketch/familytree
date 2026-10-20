// Builds the "where is our family" summary from the people list and the tree layout.

const placeKey = s => s.trim().replace(/\s+/g, ' ').toLowerCase();

function groupBy(items, getLabel) {
  const groups = new Map();
  for (const item of items) {
    const label = getLabel(item);
    if (!label) continue;
    const key = placeKey(label);
    if (!groups.has(key)) groups.set(key, { label, people: [] });
    groups.get(key).people.push(item);
  }
  return [...groups.values()].sort((a, b) => b.people.length - a.people.length || a.label.localeCompare(b.label));
}

// "Suryapet, Telangana, India" -> "India"; a single word is treated as the whole place.
const countryOf = location => {
  const parts = location.split(',').map(s => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : '';
};

export function buildSummary(people, layout) {
  const living = people.filter(p => p.isAlive !== false);

  const byGeneration = [];
  for (const p of people) {
    const depth = layout.depthOf.get(p.id);
    if (depth === undefined) continue;
    byGeneration[depth] = byGeneration[depth] || { living: 0, late: 0 };
    byGeneration[depth][p.isAlive === false ? 'late' : 'living']++;
  }

  return {
    total: people.length,
    living: living.length,
    late: people.length - living.length,
    generations: layout.generations,
    byGeneration: byGeneration.map((g, i) => ({ generation: i + 1, ...(g || { living: 0, late: 0 }) })),
    places: groupBy(living, p => p.location),
    countries: groupBy(living, p => countryOf(p.location || '')),
    unknownPlace: living.filter(p => !p.location).length,
  };
}
