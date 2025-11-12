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

// Bidirectional grid with trust starting in top-left corner
export const BidirectionalGrid = makeBidirectionalGrid(4, 4);

function makeBidirectionalGrid(rows, cols) {
  const nodes = [];
  const links = [];
  
  // Create nodes
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `${r},${c}`;
      const isCorner = r === 0 && c === 0;
      nodes.push({ 
        id, 
        group: 1, 
        score: isCorner ? 10 : 0 
      });
    }
  }
  
  // Create bidirectional edges
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `${r},${c}`;
      // Right neighbor
      if (c < cols - 1) {
        const rightId = `${r},${c + 1}`;
        links.push({ source: id, target: rightId, value: 0.5 });
        links.push({ source: rightId, target: id, value: 0.5 });
      }
      // Bottom neighbor
      if (r < rows - 1) {
        const bottomId = `${r + 1},${c}`;
        links.push({ source: id, target: bottomId, value: 0.5 });
        links.push({ source: bottomId, target: id, value: 0.5 });
      }
    }
  }
  
  return { nodes, links };
}

// Diamond DAG: A -> B, A -> C, B -> D, C -> D
export const DiamondDAG = {
  nodes: [
    { id: 'A', group: 1, score: 10 },
    { id: 'B', group: 1, score: 0 },
    { id: 'C', group: 1, score: 0 },
    { id: 'D', group: 1, score: 0 },
  ],
  links: [
    { source: 'A', target: 'B', value: 0.5 },
    { source: 'A', target: 'C', value: 0.5 },
    { source: 'B', target: 'D', value: 1 },
    { source: 'C', target: 'D', value: 1 },
  ],
};

// BasicWithSybils variant where the primary Sybil has some initial balance
export const SybilsWithBalance = {
  nodes: [
    { id: 'Alice', group: 1, score: 10 },
    { id: 'Bob', group: 1, score: 15 },
    { id: 'Carol', group: 1, score: 20 },
    { id: 'Dave', group: 1, score: 0 },
    { id: 'Sybil', group: 2, score: 5 }, // Sybil has balance now
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

// Interconnected communities with varying self-trust
export const Communities = makeCommunitiesGraph();

function makeCommunitiesGraph() {
  const nodes = [];
  const links = [];
  
  // Community 1: High self-trust (group 1)
  const comm1 = ['A1', 'A2', 'A3', 'A4'];
  comm1.forEach((id, i) => {
    nodes.push({ id, group: 1, score: i === 0 ? 10 : 0 });
  });
  // Full mesh with high self-trust
  comm1.forEach(src => {
    links.push({ source: src, target: src, value: 0.4 }); // Self-trust
    comm1.forEach(tgt => {
      if (src !== tgt) {
        links.push({ source: src, target: tgt, value: 0.2 });
      }
    });
  });
  
  // Community 2: Medium self-trust (group 2)
  const comm2 = ['B1', 'B2', 'B3', 'B4'];
  comm2.forEach(id => {
    nodes.push({ id, group: 2, score: 0 });
  });
  comm2.forEach(src => {
    links.push({ source: src, target: src, value: 0.25 }); // Self-trust
    comm2.forEach(tgt => {
      if (src !== tgt) {
        links.push({ source: src, target: tgt, value: 0.25 });
      }
    });
  });
  
  // Community 3: Low self-trust (group 3)
  const comm3 = ['C1', 'C2', 'C3'];
  comm3.forEach(id => {
    nodes.push({ id, group: 3, score: 0 });
  });
  comm3.forEach(src => {
    links.push({ source: src, target: src, value: 0.1 }); // Self-trust
    comm3.forEach(tgt => {
      if (src !== tgt) {
        links.push({ source: src, target: tgt, value: 0.45 });
      }
    });
  });
  
  // Inter-community connections
  links.push({ source: 'A4', target: 'B1', value: 0.3 });
  links.push({ source: 'B4', target: 'C1', value: 0.3 });
  links.push({ source: 'A2', target: 'C2', value: 0.2 });
  
  return { nodes, links };
}

// Pyramid DAG with 50% self-trust for all nodes
export const PyramidDAG = makePyramidDAG(4);

function makePyramidDAG(levels) {
  const nodes = [];
  const links = [];
  
  // Create nodes in pyramid structure
  let nodeId = 0;
  const levelNodes = [];
  
  for (let level = 0; level < levels; level++) {
    const nodesInLevel = level + 1;
    const currentLevelNodes = [];
    
    for (let i = 0; i < nodesInLevel; i++) {
      const id = `L${level}N${i}`;
      const isTop = level === 0;
      nodes.push({ 
        id, 
        group: level + 1, 
        score: isTop ? 10 : 0 
      });
      currentLevelNodes.push(id);
      
      // Add 50% self-trust
      links.push({ source: id, target: id, value: 0.5 });
    }
    
    // Connect to previous level
    if (level > 0) {
      currentLevelNodes.forEach((currentNode, i) => {
        // Each node connects to the two nodes above it (parent connections)
        if (i < levelNodes[level - 1].length) {
          const weight = 0.5 / 2; // Split remaining 50% between parents
          links.push({ 
            source: levelNodes[level - 1][i], 
            target: currentNode, 
            value: weight 
          });
        }
        if (i > 0 && i - 1 < levelNodes[level - 1].length) {
          const weight = 0.5 / 2;
          links.push({ 
            source: levelNodes[level - 1][i - 1], 
            target: currentNode, 
            value: weight 
          });
        }
      });
    }
    
    levelNodes.push(currentLevelNodes);
  }
  
  return { nodes, links };
}

// Surprise: Hub and Spoke with Random Shortcuts (Small World Network)
export const SmallWorld = makeSmallWorldNetwork(12, 3);

function makeSmallWorldNetwork(nodeCount, shortcuts) {
  const nodes = [];
  const links = [];
  
  // Create a hub
  nodes.push({ id: 'Hub', group: 1, score: 10 });
  
  // Create spoke nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({ id: `Node${i}`, group: 2, score: 0 });
    // Connect to hub
    links.push({ source: 'Hub', target: `Node${i}`, value: 0.7 });
    links.push({ source: `Node${i}`, target: 'Hub', value: 0.3 });
    
    // Connect to neighbors in ring
    const nextId = `Node${(i + 1) % nodeCount}`;
    links.push({ source: `Node${i}`, target: nextId, value: 0.3 });
    
    // Self-trust
    links.push({ source: `Node${i}`, target: `Node${i}`, value: 0.2 });
  }
  
  // Add random shortcuts for small-world property
  for (let i = 0; i < shortcuts; i++) {
    const src = Math.floor(Math.random() * nodeCount);
    const tgt = Math.floor(Math.random() * nodeCount);
    if (src !== tgt) {
      links.push({ 
        source: `Node${src}`, 
        target: `Node${tgt}`, 
        value: 0.2 
      });
    }
  }
  
  return { nodes, links };
}