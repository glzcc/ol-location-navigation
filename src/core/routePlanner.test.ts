import { describe, expect, it } from 'vitest';
import { planRoute } from './routePlanner';
import type { NavigationNetwork } from '../types/navigation';

const network: NavigationNetwork = {
  nodes: [
    { id: 'a', coord: [0, 0], label: '入口' },
    { id: 'b', coord: [10, 0], label: '走廊' },
    { id: 'c', coord: [20, 0], label: '会议室' },
    { id: 'd', coord: [0, 30], label: '绕路' }
  ],
  edges: [
    { id: 'ab', from: 'a', to: 'b', weight: 10 },
    { id: 'bc', from: 'b', to: 'c', weight: 10 },
    { id: 'ad', from: 'a', to: 'd', weight: 30 },
    { id: 'dc', from: 'd', to: 'c', weight: 30 }
  ]
};

describe('planRoute', () => {
  it('finds the shortest path through weighted edges', () => {
    const route = planRoute(network, { type: 'node', id: 'a' }, { type: 'node', id: 'c' });

    expect(route.nodeIds).toEqual(['a', 'b', 'c']);
    expect(route.edgeIds).toEqual(['ab', 'bc']);
    expect(route.distance).toBe(20);
    expect(route.instructions.at(-1)?.text).toBe('到达 会议室');
  });

  it('respects disabled edges', () => {
    const route = planRoute(
      {
        ...network,
        edges: network.edges.map(edge => (edge.id === 'bc' ? { ...edge, disabled: true } : edge))
      },
      { type: 'node', id: 'a' },
      { type: 'node', id: 'c' }
    );

    expect(route.nodeIds).toEqual(['a', 'd', 'c']);
    expect(route.distance).toBe(60);
  });

  it('maps coordinates to their nearest route node', () => {
    const route = planRoute(network, { type: 'coord', coord: [1, 1] }, { type: 'coord', coord: [19, 1] });

    expect(route.nodeIds).toEqual(['a', 'b', 'c']);
  });
});
