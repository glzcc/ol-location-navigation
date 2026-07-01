import type { NavNode } from '../types/navigation';
import { euclideanDistance } from './distance';

export function findNearestNode(
  coord: [number, number],
  nodes: NavNode[],
  floorId?: string
): NavNode | null {
  let nearest: NavNode | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    if (node.disabled || (floorId && node.floorId && node.floorId !== floorId)) {
      continue;
    }

    const distance = euclideanDistance(coord, node.coord);
    if (distance < nearestDistance) {
      nearest = node;
      nearestDistance = distance;
    }
  }

  return nearest;
}
