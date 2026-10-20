// A "family editor" may only change one branch: the chosen person, all their descendants,
// and everyone married to one of those people. Shared by the API (to enforce it) and the browser (to show buttons).
export function branchMembers(people, unions, rootId) {
  const members = new Set();
  if (!rootId || !people.some(p => p.id === rootId)) return members;

  const blood = new Set();
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift();
    if (blood.has(id)) continue;
    blood.add(id);
    members.add(id);
    for (const union of unions) {
      if (!union.partnerIds.includes(id)) continue;
      for (const partnerId of union.partnerIds) members.add(partnerId);
      for (const child of people) if (child.parentUnionId === union.id) queue.push(child.id);
    }
  }
  return members;
}
