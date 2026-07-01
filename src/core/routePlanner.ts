import { findNearestNode } from '../lib/nearest';
import type {
  NavigationMapConfig,
  NavigationNetwork,
  NavPoi,
  RoutePointInput,
  RouteResult
} from '../types/navigation';
import { createNavigationGraph } from './graph';
import { createRouteInstructions } from './instructions';

export interface PlanRouteOptions {
  mapConfig?: NavigationMapConfig;
  pois?: NavPoi[];
}

export function planRoute(
  network: NavigationNetwork,
  start: RoutePointInput,
  end: RoutePointInput,
  options: PlanRouteOptions = {}
): RouteResult {
  const startId = resolvePointInput(network, start, options.pois);
  const endId = resolvePointInput(network, end, options.pois);

  if (!startId || !endId) {
    throw new Error('无法解析起点或终点');
  }

  if (startId === endId) {
    return {
      nodeIds: [startId],
      edgeIds: [],
      distance: 0,
      instructions: []
    };
  }

  const graph = createNavigationGraph(network, options.mapConfig);
  const distances = new Map<string, number>();
  const previous = new Map<string, { nodeId: string; edgeId: string }>();
  const unvisited = new Set(graph.keys());

  for (const nodeId of graph.keys()) {
    distances.set(nodeId, nodeId === startId ? 0 : Number.POSITIVE_INFINITY);
  }

  while (unvisited.size > 0) {
    const current = findLowestDistanceNode(unvisited, distances);
    if (!current || current === endId) {
      break;
    }

    unvisited.delete(current);
    const currentDistance = distances.get(current) ?? Number.POSITIVE_INFINITY;
    for (const step of graph.get(current) ?? []) {
      if (!unvisited.has(step.nodeId)) {
        continue;
      }

      const nextDistance = currentDistance + step.cost;
      if (nextDistance < (distances.get(step.nodeId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(step.nodeId, nextDistance);
        previous.set(step.nodeId, { nodeId: current, edgeId: step.edgeId });
      }
    }
  }

  if (!previous.has(endId)) {
    throw new Error('起点和终点之间没有可通行路径');
  }

  const nodeIds = [endId];
  const edgeIds: string[] = [];
  let cursor = endId;
  while (cursor !== startId) {
    const prev = previous.get(cursor);
    if (!prev) {
      throw new Error('路径回溯失败');
    }
    edgeIds.unshift(prev.edgeId);
    nodeIds.unshift(prev.nodeId);
    cursor = prev.nodeId;
  }

  const distance = distances.get(endId) ?? 0;

  return {
    nodeIds,
    edgeIds,
    distance,
    instructions: createRouteInstructions(network, nodeIds, edgeIds, options.mapConfig)
  };
}

function resolvePointInput(
  network: NavigationNetwork,
  input: RoutePointInput,
  pois: NavPoi[] = []
): string | null {
  if (input.type === 'node') {
    return network.nodes.some(node => node.id === input.id && !node.disabled) ? input.id : null;
  }

  if (input.type === 'poi') {
    const poi = pois.find(item => item.id === input.id);
    if (!poi) {
      return null;
    }
    if (poi.nodeId) {
      return poi.nodeId;
    }
    return findNearestNode(poi.coord, network.nodes, poi.floorId)?.id ?? null;
  }

  return findNearestNode(input.coord, network.nodes, input.floorId)?.id ?? null;
}

function findLowestDistanceNode(
  unvisited: Set<string>,
  distances: Map<string, number>
): string | null {
  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const nodeId of unvisited) {
    const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;
    if (distance < bestDistance) {
      best = nodeId;
      bestDistance = distance;
    }
  }

  return best;
}
