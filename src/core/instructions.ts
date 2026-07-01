import { measureNodeDistance } from '../lib/distance';
import type {
  NavigationMapConfig,
  NavigationNetwork,
  NavEdge,
  NavNode,
  RouteInstruction
} from '../types/navigation';

export function createRouteInstructions(
  network: NavigationNetwork,
  nodeIds: string[],
  edgeIds: string[],
  mapConfig?: NavigationMapConfig
): RouteInstruction[] {
  const nodesById = new Map(network.nodes.map(node => [node.id, node]));
  const edgesById = new Map(network.edges.map(edge => [edge.id, edge]));
  const instructions: RouteInstruction[] = [];

  for (let index = 0; index < edgeIds.length; index += 1) {
    const from = nodesById.get(nodeIds[index]);
    const to = nodesById.get(nodeIds[index + 1]);
    const edge = edgesById.get(edgeIds[index]);
    if (!from || !to || !edge) {
      continue;
    }

    const distance = edge.weight ?? measureNodeDistance(from, to, mapConfig);
    instructions.push({
      id: `instruction-${index + 1}`,
      nodeId: from.id,
      edgeId: edge.id,
      floorId: from.floorId,
      distance,
      text: createInstructionText(from, to, edge, distance)
    });
  }

  const lastNode = nodesById.get(nodeIds.at(-1) ?? '');
  if (lastNode) {
    instructions.push({
      id: 'instruction-arrive',
      nodeId: lastNode.id,
      floorId: lastNode.floorId,
      distance: 0,
      text: `到达${lastNode.label ? ` ${lastNode.label}` : '终点'}`
    });
  }

  return instructions;
}

function createInstructionText(
  from: NavNode,
  to: NavNode,
  edge: NavEdge,
  distance: number
): string {
  if (edge.type === 'elevator') {
    return `乘电梯前往${formatFloor(to.floorId)}`;
  }

  if (edge.type === 'stairs') {
    return `走楼梯前往${formatFloor(to.floorId)}`;
  }

  const target = to.label ? `至 ${to.label}` : '前进';
  return `${target}，约 ${formatDistance(distance)}`;
}

export function formatDistance(distance: number): string {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)} 公里`;
  }

  return `${Math.round(distance)} 米`;
}

function formatFloor(floorId?: string): string {
  return floorId ? `${floorId} 层` : '目标楼层';
}
