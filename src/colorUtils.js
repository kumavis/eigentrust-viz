// Generate consistent colors for nodes based on their index
export function getNodeColor(index, totalNodes) {
  const hue = (index * 360) / totalNodes;
  return `hsl(${hue}, 70%, 50%)`;
}

// Generate a color map for nodes by their IDs
export function getNodeColorMap(nodeIds) {
  const colorMap = {};
  nodeIds.forEach((id, index) => {
    colorMap[id] = getNodeColor(index, nodeIds.length);
  });
  return colorMap;
}

