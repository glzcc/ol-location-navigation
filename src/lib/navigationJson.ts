import type {
  NavigationNetwork,
  NavigationValidationIssue,
  NavEdge,
  NavNode
} from '../types/navigation';

export function parseNavigationNetwork(json: string): NavigationNetwork {
  const value = JSON.parse(json) as unknown;
  assertNavigationNetwork(value);
  return value;
}

export function serializeNavigationNetwork(network: NavigationNetwork): string {
  return JSON.stringify(network, null, 2);
}

export function assertNavigationNetwork(value: unknown): asserts value is NavigationNetwork {
  const issues = validateNavigationNetwork(value);
  const errors = issues.filter(issue => issue.level === 'error');
  if (errors.length > 0) {
    throw new Error(errors.map(issue => issue.message).join('\n'));
  }
}

export function validateNavigationNetwork(value: unknown): NavigationValidationIssue[] {
  const issues: NavigationValidationIssue[] = [];

  if (!isRecord(value)) {
    return [{ level: 'error', message: '路网必须是一个对象' }];
  }

  const nodes = value.nodes;
  const edges = value.edges;

  if (!Array.isArray(nodes)) {
    issues.push({ level: 'error', message: 'nodes 必须是数组' });
  }

  if (!Array.isArray(edges)) {
    issues.push({ level: 'error', message: 'edges 必须是数组' });
  }

  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return issues;
  }

  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (!isNode(node)) {
      issues.push({ level: 'error', message: '节点缺少 id 或 coord' });
      continue;
    }

    if (nodeIds.has(node.id)) {
      issues.push({ level: 'error', message: `节点 ID 重复：${node.id}`, targetId: node.id });
    }
    nodeIds.add(node.id);
  }

  const edgeIds = new Set<string>();
  for (const edge of edges) {
    if (!isEdge(edge)) {
      issues.push({ level: 'error', message: '边缺少 id、from 或 to' });
      continue;
    }

    if (edgeIds.has(edge.id)) {
      issues.push({ level: 'error', message: `边 ID 重复：${edge.id}`, targetId: edge.id });
    }
    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.from)) {
      issues.push({ level: 'error', message: `边 ${edge.id} 的 from 节点不存在`, targetId: edge.id });
    }

    if (!nodeIds.has(edge.to)) {
      issues.push({ level: 'error', message: `边 ${edge.id} 的 to 节点不存在`, targetId: edge.id });
    }
  }

  return issues;
}

function isNode(value: unknown): value is NavNode {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    Array.isArray(value.coord) &&
    value.coord.length === 2 &&
    value.coord.every(item => typeof item === 'number')
  );
}

function isEdge(value: unknown): value is NavEdge {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.from === 'string' &&
    typeof value.to === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
