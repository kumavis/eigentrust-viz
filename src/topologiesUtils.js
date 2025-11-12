import { eigentrustWithWeightedTrustedSet } from './eigentrust';

export const initialStateOptions = {
  'First Node': (normalizedTrustedSet) => [1, ...Array(normalizedTrustedSet.length - 1).fill(0)],
  'Uniform': (normalizedTrustedSet) => Array(normalizedTrustedSet.length).fill(1 / normalizedTrustedSet.length),
  'Initial Trust Weights': (normalizedTrustedSet) => normalizedTrustedSet,
};

export function cloneScenario(scenario) {
  return JSON.parse(JSON.stringify(scenario));
}

export function normalizeMatrix(data) {
  const normalizedMatrix = data.nodes.map((node, i) => {
    const outgoingLinks = data.links.filter(link => link.source === node.id);
    const outGoingScores = data.nodes.map((node) => {
      return outgoingLinks.find(link => link.target === node.id)?.value || 0;
    });
    const outGoingScoresSum = outGoingScores.reduce((sum, val) => sum + val, 0);
    if (outGoingScoresSum === 0) {
      return outGoingScores;
    } else {
      return outGoingScores.map(val => val / outGoingScoresSum);
    }
  });
  return normalizedMatrix;
}

export function normalizeVector(vector) {
  const totalWeight = vector.reduce((sum, weight) => sum + weight, 0);
  const normalizedVector = vector.map(w => w / totalWeight);
  return normalizedVector;
}

export function stepsToNodeIdMapping(data, steps) {
  const history = steps.map(step => {
    const nodes = data.nodes.map((node, i) => {
      return step[i];
    });
    return nodes;
  });
  return history;
}

export function calculateScoreHistory(data, alpha, normalizedMatrix, normalizedTrustedSet, initialState, getDefaultsForRow) {
  const { result: scores, steps, iterations } = eigentrustWithWeightedTrustedSet({
    trustMatrix: normalizedMatrix,
    trustedSetWeights: normalizedTrustedSet,
    alpha,
    initialState,
    getDefaultsForRow,
  });

  const history = stepsToNodeIdMapping(data, steps);
  return { history, iterations };
}

// Helper function to calculate segment lengths from slider positions
export function calculateSegmentLengths(sliderValues) {
  if (sliderValues.length === 0) {
    return [1]; // Single node gets 100% importance
  }
  
  // Sort slider values to get positions on [0, 1]
  const sorted = [...sliderValues].sort((a, b) => a - b);
  
  // Add boundaries
  const positions = [0, ...sorted, 1];
  
  // Calculate segment lengths
  const segments = [];
  for (let i = 1; i < positions.length; i++) {
    segments.push(positions[i] - positions[i - 1]);
  }
  
  return segments;
}

// Function to aggregate nodes by community, using group number set on node
// communityImportanceWeights: Map from group number to array of importance weights for each node in that community
export function aggregateNodesByCommunity(graphData, communityImportanceWeights = {}) {
  const graph = cloneScenario(graphData);
  
  // Find all unique groups
  const groups = [...new Set(graph.nodes.map(n => n.group))];
  
  // Create node ID to group mapping
  const nodeToGroup = {};
  graph.nodes.forEach(node => {
    nodeToGroup[node.id] = node.group;
  });
  
  // Create node ID to importance weight mapping
  const nodeToImportance = {};
  groups.forEach(group => {
    const nodesInGroup = graph.nodes.filter(n => n.group === group);
    const importanceWeights = communityImportanceWeights[group] || 
      nodesInGroup.map(() => 1 / nodesInGroup.length); // Default: equal weights
    
    nodesInGroup.forEach((node, idx) => {
      nodeToImportance[node.id] = importanceWeights[idx];
    });
  });
  
  const newNodes = [];
  const linkAggregation = {}; // Key: "sourceGroup->targetGroup", Value: sum of weights
  
  // Step 1: Create one node per community with summed initial trust weights (not weighted by importance)
  groups.forEach(group => {
    const nodesInGroup = graph.nodes.filter(n => n.group === group);
    const communityId = `Community ${group}`;
    
    // Sum initial trust weights without importance scaling
    const totalScore = nodesInGroup.reduce((sum, n) => sum + n.score, 0);
    
    newNodes.push({
      id: communityId,
      group: group,
      score: totalScore
    });
  });
  
  // Step 2: Aggregate links with importance weighting
  // - If source and target are in same community: adds to self-loop (intra-community)
  // - If source and target are in different communities: adds to cross-community link
  // - Links are weighted by source node importance
  graph.links.forEach(link => {
    const sourceGroup = nodeToGroup[link.source];
    const targetGroup = nodeToGroup[link.target];
    const sourceImportance = nodeToImportance[link.source];
    
    const linkKey = `${sourceGroup}->${targetGroup}`;
    
    if (!linkAggregation[linkKey]) {
      linkAggregation[linkKey] = 0;
    }
    // Weight the link by the source node's importance
    linkAggregation[linkKey] += link.value * sourceImportance;
  });
  
  // Step 3: Convert aggregated links to array format
  const newLinks = [];
  Object.entries(linkAggregation).forEach(([key, value]) => {
    const [sourceGroup, targetGroup] = key.split('->').map(Number);
    newLinks.push({
      source: `Community ${sourceGroup}`,
      target: `Community ${targetGroup}`,
      value: value
    });
  });
  
  return { nodes: newNodes, links: newLinks };
}

