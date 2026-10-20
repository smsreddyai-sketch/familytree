// Computes positions for a top-down family tree: each person sits with their spouses on one row,
// and each couple's children hang below them, joined by lines.

export const CARD_W = 168;
export const CARD_H = 216;
// Each child of a top ancestor starts a branch; everyone below shares that branch's colour.
const BRANCH_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#0891b2', '#db2777', '#ca8a04', '#dc2626'];
const COUPLE_GAP = 44;
const SIBLING_GAP = 28;
const GROUP_GAP = 48;
const ROW_GAP = 84;
const ROOT_GAP = 110;
const PAD = 40;
const MARRIAGE_Y = 62; // height of the marriage line inside the card row (photo centre)

const byCreated = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);
const byBirth = (a, b) => (a.birthYear ?? 9999) - (b.birthYear ?? 9999) || byCreated(a, b);

export function buildLayout(people, rawUnions) {
  const byId = new Map(people.map(p => [p.id, p]));
  const unions = rawUnions
    .map(u => ({ ...u, partnerIds: (u.partnerIds || []).filter(id => byId.has(id)) }))
    .sort(byCreated);
  const unionById = new Map(unions.map(u => [u.id, u]));

  const unionsByPerson = new Map();
  for (const u of unions) {
    for (const id of u.partnerIds) {
      if (!unionsByPerson.has(id)) unionsByPerson.set(id, []);
      unionsByPerson.get(id).push(u);
    }
  }

  const childrenByUnion = new Map();
  for (const p of people) {
    if (p.parentUnionId && unionById.has(p.parentUnionId)) {
      if (!childrenByUnion.has(p.parentUnionId)) childrenByUnion.set(p.parentUnionId, []);
      childrenByUnion.get(p.parentUnionId).push(p);
    }
  }
  for (const list of childrenByUnion.values()) list.sort(byBirth);

  const hasParents = p => !!p && (unionById.get(p.parentUnionId)?.partnerIds.length || 0) > 0;

  // "S/o Father" / "D/o Father" (mother's name if the father is not in the tree).
  const parentLabel = p => {
    const parents = (unionById.get(p.parentUnionId)?.partnerIds || []).map(id => byId.get(id));
    if (!parents.length) return null;
    const father = parents.find(q => q.gender === 'male') || parents[0];
    const rel = p.gender === 'male' ? 'S/o' : p.gender === 'female' ? 'D/o' : 'Child of';
    return `${rel} ${father.name}`;
  };
  const placed = new Set();
  const primaries = new Set();
  const visitedUnions = new Set();

  // ---- Build the nested structure ----
  function buildUnit(personId) {
    const duplicate = placed.has(personId);
    primaries.add(personId);
    placed.add(personId);

    const groups = [];
    for (const union of unionsByPerson.get(personId) || []) {
      if (visitedUnions.has(union.id)) continue;
      visitedUnions.add(union.id);
      const spouseId = union.partnerIds.find(id => id !== personId) || null;
      const spouseDuplicate = spouseId ? placed.has(spouseId) : false;
      if (spouseId) placed.add(spouseId);
      const children = (childrenByUnion.get(union.id) || [])
        .filter(c => !primaries.has(c.id))
        .map(c => buildUnit(c.id));
      groups.push({ union, spouse: spouseId ? byId.get(spouseId) : null, spouseDuplicate, children });
    }

    // Spouses alternate right, left, right... so each couple's children can sit under that couple.
    let right = 0;
    let left = 0;
    let spouseCount = 0;
    for (const g of groups) {
      if (!g.spouse) g.slot = 0;
      else g.slot = spouseCount++ % 2 === 0 ? ++right : -(++left);
    }

    return { person: byId.get(personId), duplicate, groups };
  }

  const roots = [];
  const isInLaw = p =>
    (unionsByPerson.get(p.id) || []).some(u => u.partnerIds.some(id => id !== p.id && hasParents(byId.get(id))));

  for (const p of [...people].sort(byCreated)) {
    if (placed.has(p.id) || hasParents(p) || isInLaw(p)) continue;
    roots.push(buildUnit(p.id));
  }

  // Anyone still missing (unusual links, e.g. an in-law's other marriage): start from their top ancestor.
  for (const p of [...people].sort(byCreated)) {
    if (placed.has(p.id)) continue;
    let top = p;
    const seen = new Set();
    while (hasParents(top) && !seen.has(top.id)) {
      seen.add(top.id);
      top = byId.get(unionById.get(top.parentUnionId).partnerIds[0]);
    }
    roots.push(buildUnit(top.id));
    if (!placed.has(p.id)) roots.push(buildUnit(p.id));
  }

  // ---- Measure ----
  function measure(unit) {
    const spouses = unit.groups.filter(g => g.spouse).length;
    const cards = 1 + spouses;
    unit.rowWidth = cards * CARD_W + (cards - 1) * COUPLE_GAP;

    unit.groups.sort((a, b) => a.slot - b.slot);
    let childrenWidth = 0;
    let groupsWithKids = 0;
    for (const g of unit.groups) {
      g.width = 0;
      g.children.forEach((c, i) => {
        g.width += measure(c) + (i > 0 ? SIBLING_GAP : 0);
      });
      if (g.children.length) {
        childrenWidth += g.width + (groupsWithKids > 0 ? GROUP_GAP : 0);
        groupsWithKids++;
      }
    }
    unit.childrenWidth = childrenWidth;
    unit.width = Math.max(unit.rowWidth, childrenWidth);
    return unit.width;
  }

  // ---- Position ----
  const nodes = [];
  const lines = [];
  const markers = [];
  const depthOf = new Map();
  let maxDepth = 0;

  let branchCount = 0;

  function place(unit, x, depth, color = null) {
    const y = PAD + depth * (CARD_H + ROW_GAP);
    maxDepth = Math.max(maxDepth, depth);

    // Row cards ordered by slot: left spouses, person (slot 0), right spouses.
    const slots = [...new Set([0, ...unit.groups.filter(g => g.spouse).map(g => g.slot)])].sort((a, b) => a - b);
    const rowX = x + (unit.width - unit.rowWidth) / 2;
    const slotX = slot => rowX + slots.indexOf(slot) * (CARD_W + COUPLE_GAP);
    const personX = slotX(0);

    nodes.push({ key: `${unit.person.id}-${nodes.length}`, person: unit.person, x: personX, y, duplicate: unit.duplicate, color, parentLabel: parentLabel(unit.person) });
    if (!depthOf.has(unit.person.id)) depthOf.set(unit.person.id, depth);

    let childX = x + (unit.width - unit.childrenWidth) / 2;
    for (const g of unit.groups) {
      let ux;
      let uy;
      if (g.spouse) {
        const sx = slotX(g.slot);
        nodes.push({ key: `${g.spouse.id}-${nodes.length}`, person: g.spouse, x: sx, y, duplicate: g.spouseDuplicate, color, parentLabel: parentLabel(g.spouse) });
        if (!depthOf.has(g.spouse.id)) depthOf.set(g.spouse.id, depth);

        const leftEdge = Math.min(personX, sx) + CARD_W;
        const rightEdge = Math.max(personX, sx);
        const divorced = g.union.status !== 'married';
        uy = y + MARRIAGE_Y;
        ux = (leftEdge + rightEdge) / 2;
        lines.push({ x1: leftEdge, y1: uy, x2: rightEdge, y2: uy, dashed: divorced, kind: 'marriage' });
        markers.push({ key: g.union.id, x: ux, y: uy, status: g.union.status });
      } else {
        ux = personX + CARD_W / 2;
        uy = y + CARD_H;
      }

      if (!g.children.length) continue;

      const busY = y + CARD_H + ROW_GAP / 2;
      const kids = g.children.map(child => {
        const childColor = color || BRANCH_COLORS[branchCount++ % BRANCH_COLORS.length];
        const cx = place(child, childX, depth + 1, childColor);
        childX += child.width + SIBLING_GAP;
        return { cx, color: childColor };
      });
      childX += GROUP_GAP - SIBLING_GAP;

      const childTop = y + CARD_H + ROW_GAP;
      const centers = kids.map(k => k.cx);
      lines.push({ x1: ux, y1: uy, x2: ux, y2: busY, kind: 'child', color });
      lines.push({ x1: Math.min(ux, ...centers), y1: busY, x2: Math.max(ux, ...centers), y2: busY, kind: 'child', color });
      for (const k of kids) lines.push({ x1: k.cx, y1: busY, x2: k.cx, y2: childTop, kind: 'child', color: k.color });
    }

    return personX + CARD_W / 2;
  }

  let x = PAD;
  for (const root of roots) {
    measure(root);
    place(root, x, 0);
    x += root.width + ROOT_GAP;
  }

  return {
    nodes,
    lines,
    markers,
    depthOf,
    generations: nodes.length ? maxDepth + 1 : 0,
    width: Math.max(x - ROOT_GAP + PAD, 400),
    height: PAD * 2 + (maxDepth + 1) * CARD_H + maxDepth * ROW_GAP,
  };
}
