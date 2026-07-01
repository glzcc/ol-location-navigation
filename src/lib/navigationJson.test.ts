import { describe, expect, it } from 'vitest';
import { parseNavigationNetwork, validateNavigationNetwork } from './navigationJson';

describe('navigationJson', () => {
  it('parses a valid network', () => {
    const network = parseNavigationNetwork(
      JSON.stringify({
        nodes: [{ id: 'a', coord: [0, 0] }],
        edges: []
      })
    );

    expect(network.nodes).toHaveLength(1);
  });

  it('reports missing edge endpoints', () => {
    const issues = validateNavigationNetwork({
      nodes: [{ id: 'a', coord: [0, 0] }],
      edges: [{ id: 'ab', from: 'a', to: 'b' }]
    });

    expect(issues.some(issue => issue.message.includes('to 节点不存在'))).toBe(true);
  });
});
