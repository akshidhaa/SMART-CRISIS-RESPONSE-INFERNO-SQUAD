// Dijkstra shortest-path on an undirected zone graph.
// Used by the indoor floor-plan evacuation planner.

export interface DijkstraNode {
  id: string;
  isExit: boolean;
}

export interface DijkstraEdge {
  from: string;
  to: string;
  weight: number;
}

export interface DijkstraResult {
  path: string[];   // ordered zone ids from start to nearest exit
  distance: number;
}

/**
 * Finds the shortest path from startId to the nearest exit node,
 * avoiding all ids in blockedIds (except the start node itself).
 * Returns null if no path exists.
 */
export function dijkstra(
  nodes: DijkstraNode[],
  edges: DijkstraEdge[],
  startId: string,
  blockedIds: Set<string>,
): DijkstraResult | null {
  // Build adjacency list, excluding blocked nodes
  const adj = new Map<string, { id: string; weight: number }[]>();
  for (const n of nodes) adj.set(n.id, []);

  for (const e of edges) {
    // Skip edges that touch a blocked node (start is exempt)
    const fromBlocked = blockedIds.has(e.from) && e.from !== startId;
    const toBlocked = blockedIds.has(e.to) && e.to !== startId;
    if (fromBlocked || toBlocked) continue;
    adj.get(e.from)?.push({ id: e.to, weight: e.weight });
    adj.get(e.to)?.push({ id: e.from, weight: e.weight });
  }

  const exits = nodes.filter((n) => n.isExit && !blockedIds.has(n.id)).map((n) => n.id);
  if (exits.length === 0) return null;
  if (exits.includes(startId)) return { path: [startId], distance: 0 };

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  for (const n of nodes) {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
  }
  dist.set(startId, 0);

  // Simple priority queue via sorted array (zone graphs are small, O(n²) is fine)
  const queue: { id: string; d: number }[] = [{ id: startId, d: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.d - b.d);
    const { id: u } = queue.shift()!;
    const du = dist.get(u)!;

    if (exits.includes(u)) {
      // Reconstruct path from prev pointers
      const path: string[] = [];
      let cur: string | null = u;
      while (cur !== null) {
        path.unshift(cur);
        cur = prev.get(cur) ?? null;
      }
      return { path, distance: du };
    }

    for (const { id: v, weight } of adj.get(u) ?? []) {
      const alt = du + weight;
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        prev.set(v, u);
        queue.push({ id: v, d: alt });
      }
    }
  }

  return null;
}

/**
 * Computes which zone ids should be blocked during evacuation,
 * incorporating both incident zones and facility-type-specific rules.
 */
export function computeBlockedZones(params: {
  incidentZoneIds: string[];
  facilityType: string;
  hasFireIncident: boolean;
  zoneHazardTags: Map<string, string[]>; // zoneId → hazardTags
  zoneTypes: Map<string, string>;        // zoneId → type
}): Set<string> {
  const { incidentZoneIds, facilityType, hasFireIncident, zoneHazardTags, zoneTypes } = params;
  const blocked = new Set(incidentZoneIds);

  // Factory: chemical store zones are always avoided (even without an active incident)
  if (facilityType === 'factory') {
    for (const [id, tags] of zoneHazardTags) {
      if (tags.includes('chemical')) blocked.add(id);
    }
  }

  // Hospital: during fire, disable elevators and restricted zones
  if (facilityType === 'hospital' && hasFireIncident) {
    for (const [id, type] of zoneTypes) {
      if (type === 'elevator') blocked.add(id);
    }
    for (const [id, tags] of zoneHazardTags) {
      if (tags.includes('restricted')) blocked.add(id);
    }
  }

  return blocked;
}
