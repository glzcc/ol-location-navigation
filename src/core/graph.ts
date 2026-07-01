import type { NavEdge, NavNode, NavigationMapConfig, NavigationNetwork } from '../types/navigation';
import { measureNodeDistance } from '../lib/distance';

export interface GraphStep {
  nodeId: string;
  edgeId: string;
  cost: number;
}

export type NavigationGraph = Map<string, GraphStep[]>;

export function createNavigationGraph(
  network: NavigationNetwork,
  mapConfig?: NavigationMapConfig
): NavigationGraph {
  const graph: NavigationGraph = new Map();
  const nodesById = new Map(network.nodes.map(node => [node.id, node]));

  for (const node of network.nodes) {
    if (!node.disabled) {
      graph.set(node.id, []);
    }
  }

  for (const edge of network.edges) {
    if (edge.disabled) {
      continue;
    }

    const from = nodesById.get(edge.from);
    const to = nodesById.get(edge.to);
    if (!from || !to || from.disabled || to.disabled) {
      continue;
    }

    addGraphStep(graph, edge, from, to, mapConfig);
    if (edge.bidirectional !== false) {
      addGraphStep(graph, edge, to, from, mapConfig);
    }
  }

  return graph;
}

function addGraphStep(
  graph: NavigationGraph,
  edge: NavEdge,
  from: NavNode,
  to: NavNode,
  mapConfig?: NavigationMapConfig
): void {
  graph.get(from.id)?.push({
    nodeId: to.id,
    edgeId: edge.id,
    cost: edge.weight ?? measureNodeDistance(from, to, mapConfig)
  });
}
