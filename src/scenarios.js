export const BasicWithSybils = {
  nodes: [
    { id: 'Alice', group: 1, score: 10 },
    { id: 'Bob', group: 1, score: 15 },
    { id: 'Carol', group: 1, score: 20 },
    { id: 'Dave', group: 1, score: 0 },
    { id: 'Sybil', group: 2, score: 0 },
    { id: 'Sybil-1', group: 2, score: 0 },
    { id: 'Sybil-2', group: 2, score: 0 },
    { id: 'Sybil-3', group: 2, score: 0 },
    { id: 'Sybil-4', group: 2, score: 0 },
    { id: 'Sybil-5', group: 2, score: 0 },
  ],
  links: [
    { source: 'Alice', target: 'Alice', value: 0.2 },
    { source: 'Alice', target: 'Bob', value: 0.3 },
    { source: 'Alice', target: 'Carol', value: 0.5 },
    { source: 'Bob', target: 'Alice', value: 0.4 },
    { source: 'Bob', target: 'Bob', value: 0.4 },
    { source: 'Bob', target: 'Carol', value: 0.2 },
    { source: 'Carol', target: 'Alice', value: 0.2 },
    { source: 'Carol', target: 'Bob', value: 0.1 },
    { source: 'Carol', target: 'Carol', value: 0.3 },
    { source: 'Carol', target: 'Dave', value: 0.4 },
    { source: 'Sybil-1', target: 'Sybil', value: 1 },
    { source: 'Sybil-2', target: 'Sybil', value: 1 },
    { source: 'Sybil-3', target: 'Sybil', value: 1 },
    { source: 'Sybil-4', target: 'Sybil', value: 1 },
    { source: 'Sybil-5', target: 'Sybil', value: 1 },
  ],
};

export const LongChain = makeChain(10);

export const Circle = makeCircle(10);

function makeChain (count) {
  const nodes = [];
  const links = [];
  const graph = { nodes, links };
  for (let i = 0; i < count; i++) {
    const isFirstNode = i === 0;
    const score = isFirstNode ? 10 : 0;
    nodes.push({ id: i, group: 1, score });
    if (i > 0) {
      links.push({ source: i - 1, target: i, value: 1 });
    }
  }
  return graph;
}

function makeCircle (count) {
  const graph = makeChain(count);
  graph.links.push({ source: count - 1, target: 0, value: 1 });
  return graph;
}