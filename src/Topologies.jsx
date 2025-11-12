import { useState, useMemo, useRef, useEffect } from 'react'
import './App.css'

import { Select, Slider } from './widgets';
import { ScoreDistribution } from './ScoreDistribution';
import { Graph } from './Graph';
import { TrustMatrix } from './TrustMatrix';
import { getNodeColor } from './colorUtils';

import * as scenarios from './scenarios';
import { Link } from 'react-router-dom';

import {
  initialStateOptions,
  cloneScenario,
  normalizeMatrix,
  normalizeVector,
  calculateScoreHistory,
  calculateSegmentLengths,
  aggregateNodesByCommunity,
} from './topologiesUtils';

const fallbackRowScoreAlgos = {
  'TrustSet': (rowIndex, trustedSet) => trustedSet,
  'Uniform (PageRank)': (rowIndex, trustedSet) => trustedSet.map(() => 1 / trustedSet.length),
  'Self-Trust': (rowIndex, trustedSet) => trustedSet.map((_, i) => i === rowIndex ? 1 : 0),
};

const scenarioPairs = [
  {
    name: 'Diamond',
    joined: 'CollapsedDiamond',
    split: 'DiamondDAG',
    joinedLabel: 'B and C are joined',
    splitLabel: 'B and C are separate',
  },
  {
    name: 'Star',
    joined: 'StarJoined',
    split: 'StarSplit',
    joinedLabel: 'Center node joined',
    splitLabel: 'Center node split',
  },
];

export default function Sybil() {
  // Algorithm parameters (shared across all scenarios)
  const [alpha, setAlpha] = useState(0.15);
  const [fallbackAlgoName, setFallbackAlgoName] = useState('TrustSet');
  const [initialStateName, setInitialStateName] = useState('Initial Trust Weights');
  const getDefaultsForRow = fallbackRowScoreAlgos[fallbackAlgoName];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '15px',
      width: '100%',
      maxWidth: '100%',
      padding: '15px',
      overflowX: 'hidden'
    }}>
      {/* Header with navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>← Back to EigenTrust</Link>
        <h1 style={{ textAlign: 'center', margin: '0', fontSize: '1.8rem', flex: 1 }}>Splitting and Joining Nodes</h1>
        <div style={{ width: '150px' }} /> {/* Spacer for centering */}
      </div>

      {/* Explanation */}
      <div style={{ 
        maxWidth: '900px', 
        margin: '0 auto',
        padding: '12px 20px',
        backgroundColor: 'rgba(100, 100, 100, 0.1)',
        borderRadius: '8px',
        fontSize: '0.9rem',
        textAlign: 'center',
        flexShrink: 0
      }}>
        Understanding the impact of splitting and joining nodes is relevant to both <strong>Sybil resistance</strong> (preventing 
        malicious actors from gaining influence by creating multiple identities) and <strong>compute scaling strategies</strong> (aggregating 
        nodes to reduce computational complexity while preserving trust distributions).
      </div>

      {/* Parameterization Controls */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '10px',
        padding: '15px',
        border: '1px solid #444',
        borderRadius: '8px',
        flexShrink: 0
      }}>
        <h2 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>Parameterization Controls</h2>
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1', minWidth: '0' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Balance Weight (α): {alpha.toFixed(2)}</div>
            <Slider value={alpha} setValue={setAlpha} step={0.05}/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1', minWidth: '0' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Fallback Peer Scoring:</span>
            <Select value={fallbackAlgoName} setValue={setFallbackAlgoName} options={Object.keys(fallbackRowScoreAlgos)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1', minWidth: '0' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Initial State:</span>
            <Select value={initialStateName} setValue={setInitialStateName} options={Object.keys(initialStateOptions)} />
          </div>
        </div>
      </div>

      {/* Static Comparisons */}
      {scenarioPairs.map((pair) => (
        <ScenarioPairComparison 
          key={pair.name}
          pair={pair}
          alpha={alpha}
          initialStateName={initialStateName}
          getDefaultsForRow={getDefaultsForRow}
        />
      ))}

      {/* Interactive Section */}
      <InteractiveSection 
        alpha={alpha}
        initialStateName={initialStateName}
        getDefaultsForRow={getDefaultsForRow}
      />

      {/* Communities Aggregation Section */}
      <CommunitiesAggregationSection 
        alpha={alpha}
        initialStateName={initialStateName}
        getDefaultsForRow={getDefaultsForRow}
      />
    </div>
  )
}

function ScenarioPairComparison({ pair, alpha, initialStateName, getDefaultsForRow }) {
  const [splitRatio, setSplitRatio] = useState(0.5);
  const hasSplitRatio = pair.name === 'Diamond' || pair.name === 'Star';
  
  const joinedData = useMemo(() => cloneScenario(scenarios[pair.joined]), [pair.joined]);
  const splitData = useMemo(() => {
    const data = cloneScenario(scenarios[pair.split]);
    
    // For Diamond pattern, adjust the split ratio
    if (pair.name === 'Diamond') {
      data.links = data.links.map(link => {
        if (link.source === 'A' && link.target === 'B') {
          return { ...link, value: splitRatio };
        }
        if (link.source === 'A' && link.target === 'C') {
          return { ...link, value: 1 - splitRatio };
        }
        return link;
      });
    }
    
    // For Star pattern, adjust the split ratio for incoming links to the split center nodes
    if (pair.name === 'Star') {
      data.links = data.links.map(link => {
        if (link.source === 'A' && link.target === 'Center') {
          return { ...link, value: splitRatio };
        }
        if (link.source === 'A' && link.target === 'Center2') {
          return { ...link, value: 1 - splitRatio };
        }
        return link;
      });
    }
    
    return data;
  }, [pair.split, pair.name, splitRatio]);

  const joinedSimulation = useSimulationData(joinedData, alpha, initialStateName, getDefaultsForRow);
  const splitSimulation = useSimulationData(splitData, alpha, initialStateName, getDefaultsForRow);

  // Calculate combined scores
  const scoreComparison = useMemo(() => {
    const joinedFinal = joinedSimulation.history[joinedSimulation.history.length - 1];
    const splitFinal = splitSimulation.history[splitSimulation.history.length - 1];

    // For joined: find the BC node
    const joinedNodeId = pair.name === 'Diamond' ? 'BC' : 'Center';
    const joinedIdx = joinedData.nodes.findIndex(n => n.id === joinedNodeId);
    const scoreJoined = joinedFinal[joinedIdx] || 0;

    // For split: sum B and C (or Center and Center2)
    const node1Id = pair.name === 'Diamond' ? 'B' : 'Center';
    const node2Id = pair.name === 'Diamond' ? 'C' : 'Center2';
    const idx1 = splitData.nodes.findIndex(n => n.id === node1Id);
    const idx2 = splitData.nodes.findIndex(n => n.id === node2Id);
    const scoreSplit = (splitFinal[idx1] || 0) + (splitFinal[idx2] || 0);

    const percentDiff = scoreJoined > 0 
      ? ((scoreSplit - scoreJoined) / scoreJoined) * 100 
      : 0;

    return {
      joined: scoreJoined,
      split: scoreSplit,
      percentDiff
    };
  }, [pair.name, joinedData.nodes, splitData.nodes, joinedSimulation.history, splitSimulation.history]);

  // Generate color map for split graph (for ScoreDistribution and Graph - uses node index)
  const splitColorMap = useMemo(() => {
    const colorMap = {};
    const node1Id = pair.name === 'Diamond' ? 'B' : 'Center';
    const node2Id = pair.name === 'Diamond' ? 'C' : 'Center2';
    
    // Find the color of the joined node
    const joinedNodeId = pair.name === 'Diamond' ? 'BC' : 'Center';
    const joinedNodeIndex = joinedData.nodes.findIndex(n => n.id === joinedNodeId);
    const joinedColor = getNodeColor(joinedNodeIndex, joinedData.nodes.length);
    
    splitData.nodes.forEach((node, index) => {
      if (node.id === node1Id || node.id === node2Id) {
        colorMap[index.toString()] = joinedColor;
        colorMap[node.id] = joinedColor; // Also add by node ID for Graph component
      } else {
        const joinedIndex = joinedData.nodes.findIndex(n => n.id === node.id);
        if (joinedIndex >= 0) {
          const color = getNodeColor(joinedIndex, joinedData.nodes.length);
          colorMap[index.toString()] = color;
          colorMap[node.id] = color; // Also add by node ID for Graph component
        }
      }
    });
    
    return colorMap;
  }, [pair.name, joinedData.nodes, splitData.nodes]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '15px',
      border: '2px solid #4a9eff',
      borderRadius: '8px',
      padding: '15px',
      minWidth: 0,
      overflow: 'hidden',
      maxWidth: '1200px',
      margin: '20px auto 0 auto'
    }}>
      <h2 style={{ margin: '0', fontSize: '1.3rem', textAlign: 'center' }}>
        {pair.name} Pattern
      </h2>

      {/* Split Ratio Control */}
      {hasSplitRatio && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '10px',
          padding: '12px',
          backgroundColor: 'rgba(74, 158, 255, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(74, 158, 255, 0.3)'
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>
            Split Ratio: B gets {(splitRatio * 100).toFixed(0)}% | C gets {((1 - splitRatio) * 100).toFixed(0)}%
          </div>
          <Slider value={splitRatio} setValue={setSplitRatio} step={0.05}/>
        </div>
      )}

      {/* Trust Distributions - Side by Side */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ flexShrink: 0, overflow: 'visible', width: '100%' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            {pair.joinedLabel}
          </h3>
          <ScoreDistribution 
            data={joinedSimulation.history} 
            iterations={joinedSimulation.iterations} 
            width={550} 
            height={180}
          />
        </div>
        <div style={{ flexShrink: 0, overflow: 'visible', width: '100%' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            {pair.splitLabel}
          </h3>
          <ScoreDistribution 
            data={splitSimulation.history} 
            iterations={splitSimulation.iterations} 
            width={550} 
            height={180}
            colorMap={splitColorMap}
          />
        </div>
      </div>

      {/* Score Comparison */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        gap: '30px',
        padding: '15px',
        backgroundColor: 'rgba(74, 158, 255, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(74, 158, 255, 0.3)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>
            Combined Score (Joined)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {(scoreComparison.joined * 100).toFixed(2)}%
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          fontSize: '1.5rem',
          color: '#aaa'
        }}>
          ↔
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>
            Combined Score (Split)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {(scoreComparison.split * 100).toFixed(2)}%
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          fontSize: '1.2rem',
          color: '#aaa',
          paddingLeft: '20px',
          borderLeft: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>
              Difference
            </div>
            <div style={{ 
              fontSize: '1.3rem', 
              fontWeight: 'bold',
              color: Math.abs(scoreComparison.percentDiff) < 0.01 ? '#4CAF50' : '#FF9800'
            }}>
              {scoreComparison.percentDiff >= 0 ? '+' : ''}{scoreComparison.percentDiff.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Trust Matrices - Side by Side */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ 
          flex: '1', 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          maxHeight: '400px',
          width: '100%'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            Trust Matrix (Joined)
          </h3>
          <TrustMatrix peers={joinedData.nodes} trustMatrix={joinedSimulation.normalizedMatrix} />
        </div>
        <div style={{ 
          flex: '1', 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          maxHeight: '400px',
          width: '100%'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            Trust Matrix (Split)
          </h3>
          <TrustMatrix peers={splitData.nodes} trustMatrix={splitSimulation.normalizedMatrix} colorMap={splitColorMap} />
        </div>
      </div>

      {/* Force Graphs - Side by Side */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ 
          flex: '1', 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '300px',
          width: '100%'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            Network Graph (Joined)
          </h3>
          <Graph data={joinedData} />
        </div>
        <div style={{ 
          flex: '1', 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '300px',
          width: '100%'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            Network Graph (Split)
          </h3>
          <Graph data={splitData} colorMap={splitColorMap} />
        </div>
      </div>
    </div>
  );
}

// Helper hook to calculate simulation data
function useSimulationData(data, alpha, initialStateName, getDefaultsForRow) {
  return useMemo(() => {
    const normalizedMatrix = normalizeMatrix(data);
    const trustedSet = data.nodes.map(node => node.score);
    const normalizedTrustedSet = normalizeVector(trustedSet);
    const initialState = initialStateOptions[initialStateName](normalizedTrustedSet);
  
    const { history, iterations } = calculateScoreHistory(data, alpha, normalizedMatrix, normalizedTrustedSet, initialState, getDefaultsForRow);
    return {
      normalizedMatrix,
      normalizedTrustedSet,
      history,
      iterations,
    };
  }, [data, alpha, initialStateName, getDefaultsForRow]);
}


function CommunitiesAggregationSection({ alpha, initialStateName, getDefaultsForRow }) {
  const originalData = useMemo(() => cloneScenario(scenarios.Communities), []);

  // Get community structure to initialize sliders
  const communityStructure = useMemo(() => {
    const groups = [...new Set(originalData.nodes.map(n => n.group))];
    const structure = {};
    groups.forEach(group => {
      const nodesInGroup = originalData.nodes.filter(n => n.group === group);
      structure[group] = {
        nodeCount: nodesInGroup.length,
        nodeIds: nodesInGroup.map(n => n.id)
      };
    });
    return structure;
  }, [originalData]);

  // Initialize slider state for each community
  // For a community with n nodes, we need n-1 sliders
  const [communitySliders, setCommunitySliders] = useState(() => {
    const sliders = {};
    Object.keys(communityStructure).forEach(group => {
      const nodeCount = communityStructure[group].nodeCount;
      // Initialize sliders evenly spaced
      sliders[group] = Array(nodeCount - 1).fill(0).map((_, i) => (i + 1) / nodeCount);
    });
    return sliders;
  });

  // Optimization state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const optimizationRef = useRef(null);

  // Function to calculate loss given slider values
  const calculateLoss = (sliders) => {
    // Calculate importance weights from sliders
    const weights = {};
    Object.keys(sliders).forEach(group => {
      weights[group] = calculateSegmentLengths(sliders[group]);
    });

    // Run aggregation with these weights
    const aggregatedData = aggregateNodesByCommunity(originalData, weights);
    
    // Calculate normalized matrices and run simulations
    const originalMatrix = normalizeMatrix(originalData);
    const aggregatedMatrix = normalizeMatrix(aggregatedData);
    
    const originalTrustedSet = originalData.nodes.map(node => node.score);
    const originalNormalizedTrustedSet = normalizeVector(originalTrustedSet);
    const originalInitialState = initialStateOptions[initialStateName](originalNormalizedTrustedSet);
    
    const aggregatedTrustedSet = aggregatedData.nodes.map(node => node.score);
    const aggregatedNormalizedTrustedSet = normalizeVector(aggregatedTrustedSet);
    const aggregatedInitialState = initialStateOptions[initialStateName](aggregatedNormalizedTrustedSet);
    
    const originalResult = calculateScoreHistory(originalData, alpha, originalMatrix, originalNormalizedTrustedSet, originalInitialState, getDefaultsForRow);
    const aggregatedResult = calculateScoreHistory(aggregatedData, alpha, aggregatedMatrix, aggregatedNormalizedTrustedSet, aggregatedInitialState, getDefaultsForRow);
    
    const originalFinal = originalResult.history[originalResult.history.length - 1];
    const aggregatedFinal = aggregatedResult.history[aggregatedResult.history.length - 1];
    
    // Calculate loss: sum of squared differences for each community
    const groups = [...new Set(originalData.nodes.map(n => n.group))];
    let totalLoss = 0;
    
    groups.forEach(group => {
      const communityId = `Community ${group}`;
      
      // Sum scores of all nodes in this community in original graph
      const nodesInGroup = originalData.nodes
        .map((n, idx) => ({ node: n, idx }))
        .filter(({ node }) => node.group === group);
      
      const scoreBefore = nodesInGroup.reduce((sum, { idx }) => sum + (originalFinal[idx] || 0), 0);
      
      // Score in aggregated graph
      const aggregatedIdx = aggregatedData.nodes.findIndex(n => n.id === communityId);
      const scoreAfter = aggregatedFinal[aggregatedIdx] || 0;
      
      // Squared difference
      const diff = scoreAfter - scoreBefore;
      totalLoss += diff * diff;
    });
    
    return totalLoss;
  };

  // Gradient descent optimization
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOptimizing) {
      if (optimizationRef.current) {
        cancelAnimationFrame(optimizationRef.current);
        optimizationRef.current = null;
      }
      return;
    }

    const learningRate = 0.01;
    const epsilon = 0.001; // For finite differences
    const minSliderGap = 0.02; // Minimum gap between consecutive sliders

    const optimizationStep = () => {
      setCommunitySliders(currentSliders => {
        const newSliders = { ...currentSliders };
        
        // Calculate current loss
        const currentLoss = calculateLoss(currentSliders);
        
        // For each community
        Object.keys(currentSliders).forEach(group => {
          const sliders = currentSliders[group];
          
          // For each slider in this community
          sliders.forEach((sliderValue, sliderIdx) => {
            // Calculate gradient using finite difference
            const perturbedSliders = { ...currentSliders };
            perturbedSliders[group] = [...sliders];
            perturbedSliders[group][sliderIdx] = Math.min(1, sliderValue + epsilon);
            
            const perturbedLoss = calculateLoss(perturbedSliders);
            const gradient = (perturbedLoss - currentLoss) / epsilon;
            
            // Update slider value
            let newValue = sliderValue - learningRate * gradient;
            
            // Clamp to [0, 1]
            newValue = Math.max(0, Math.min(1, newValue));
            
            // Ensure proper ordering and minimum gaps
            // Check constraint with previous slider
            if (sliderIdx > 0) {
              newValue = Math.max(newValue, newSliders[group][sliderIdx - 1] + minSliderGap);
            }
            // Check constraint with next slider
            if (sliderIdx < sliders.length - 1) {
              newValue = Math.min(newValue, newSliders[group][sliderIdx + 1] - minSliderGap);
            }
            
            newSliders[group][sliderIdx] = newValue;
          });
        });
        
        return newSliders;
      });
      
      // Continue optimization on next frame
      if (isOptimizing) {
        optimizationRef.current = requestAnimationFrame(optimizationStep);
      }
    };

    // Start optimization
    optimizationRef.current = requestAnimationFrame(optimizationStep);

    return () => {
      if (optimizationRef.current) {
        cancelAnimationFrame(optimizationRef.current);
      }
    };
  }, [isOptimizing, originalData, alpha, initialStateName, getDefaultsForRow]);

  // Calculate importance weights from slider positions
  const communityImportanceWeights = useMemo(() => {
    const weights = {};
    Object.keys(communitySliders).forEach(group => {
      weights[group] = calculateSegmentLengths(communitySliders[group]);
    });
    return weights;
  }, [communitySliders]);

  // Create aggregated version by combining nodes within each community
  const aggregatedData = useMemo(() => {
    return aggregateNodesByCommunity(originalData, communityImportanceWeights);
  }, [originalData, communityImportanceWeights]);

  const originalSimulation = useSimulationData(originalData, alpha, initialStateName, getDefaultsForRow);
  const aggregatedSimulation = useSimulationData(aggregatedData, alpha, initialStateName, getDefaultsForRow);

  // Generate color map for original graph
  const originalColorMap = useMemo(() => {
    const colorMap = {};
    
    originalData.nodes.forEach((node, index) => {
      // Find which aggregated node this belongs to
      const aggregatedNodeId = `Community ${node.group}`;
      const aggregatedIndex = aggregatedData.nodes.findIndex(n => n.id === aggregatedNodeId);
      const color = getNodeColor(aggregatedIndex, aggregatedData.nodes.length);
      colorMap[index.toString()] = color;
      colorMap[node.id] = color; // Also add by node ID for Graph component
    });
    
    return colorMap;
  }, [originalData.nodes, aggregatedData.nodes]);

  // Calculate per-community score comparison
  const communityScoreComparisons = useMemo(() => {
    const originalFinal = originalSimulation.history[originalSimulation.history.length - 1];
    const aggregatedFinal = aggregatedSimulation.history[aggregatedSimulation.history.length - 1];
    
    const groups = [...new Set(originalData.nodes.map(n => n.group))];
    
    return groups.map(group => {
      const communityId = `Community ${group}`;
      
      // Sum scores of all nodes in this community in original graph
      const nodesInGroup = originalData.nodes
        .map((n, idx) => ({ node: n, idx }))
        .filter(({ node }) => node.group === group);
      
      const scoreBefore = nodesInGroup.reduce((sum, { idx }) => sum + (originalFinal[idx] || 0), 0);
      
      // Score in aggregated graph
      const aggregatedIdx = aggregatedData.nodes.findIndex(n => n.id === communityId);
      const scoreAfter = aggregatedFinal[aggregatedIdx] || 0;
      
      const percentDiff = scoreBefore > 0 
        ? ((scoreAfter - scoreBefore) / scoreBefore) * 100 
        : 0;
      
      return {
        group,
        communityId,
        before: scoreBefore,
        after: scoreAfter,
        percentDiff
      };
    });
  }, [originalData.nodes, aggregatedData.nodes, originalSimulation.history, aggregatedSimulation.history]);

  return (
    <>
      <h2 style={{ margin: '30px 0 10px 0', fontSize: '1.4rem', textAlign: 'center', borderTop: '2px solid #444', paddingTop: '30px' }}>
        Communities Aggregation
      </h2>
      <div style={{ 
        maxWidth: '900px', 
        margin: '0 auto 20px auto',
        padding: '12px 20px',
        backgroundColor: 'rgba(70, 130, 180, 0.15)',
        borderRadius: '8px',
        fontSize: '0.9rem',
        textAlign: 'center',
        flexShrink: 0
      }}>
        This section shows what happens when all nodes within each community are aggregated into a single node. 
        Each color represents a different community.
      </div>
      
      <CommunitiesPanel 
        originalData={originalData}
        aggregatedData={aggregatedData}
        originalSimulation={originalSimulation}
        aggregatedSimulation={aggregatedSimulation}
        originalColorMap={originalColorMap}
        communityScoreComparisons={communityScoreComparisons}
        communityStructure={communityStructure}
        communitySliders={communitySliders}
        setCommunitySliders={setCommunitySliders}
        communityImportanceWeights={communityImportanceWeights}
        isOptimizing={isOptimizing}
        setIsOptimizing={setIsOptimizing}
      />
    </>
  );
}

function CommunitiesPanel({ 
  originalData, 
  aggregatedData, 
  originalSimulation, 
  aggregatedSimulation,
  originalColorMap,
  communityScoreComparisons,
  communityStructure,
  communitySliders,
  setCommunitySliders,
  communityImportanceWeights,
  isOptimizing,
  setIsOptimizing
}) {
  const { normalizedMatrix: aggregatedMatrix, history: aggregatedHistory, iterations: aggregatedIterations } = aggregatedSimulation;
  const { normalizedMatrix: originalMatrix, history: originalHistory, iterations: originalIterations } = originalSimulation;

  // Collapseable section state
  const [isRatiosExpanded, setIsRatiosExpanded] = useState(false);

  // Handler to update a specific slider value
  const updateSlider = (group, sliderIndex, value) => {
    setCommunitySliders(prev => ({
      ...prev,
      [group]: prev[group].map((v, i) => i === sliderIndex ? value : v)
    }));
  };

  // Calculate current loss for display
  const currentLoss = useMemo(() => {
    let totalLoss = 0;
    communityScoreComparisons.forEach(({ before, after }) => {
      const diff = after - before;
      totalLoss += diff * diff;
    });
    return totalLoss;
  }, [communityScoreComparisons]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '15px',
      border: '2px solid #4a9eff',
      borderRadius: '8px',
      padding: '15px',
      minWidth: 0,
      overflow: 'hidden',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Community Node Ratios Controls */}
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        padding: '15px',
        backgroundColor: 'rgba(74, 158, 255, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(74, 158, 255, 0.3)'
      }}>
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setIsRatiosExpanded(!isRatiosExpanded)}
        >
          <h3 style={{ margin: '0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem' }}>{isRatiosExpanded ? '▼' : '▶'}</span>
            Community Node Ratios
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
              Loss: {currentLoss.toFixed(6)}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Reset all sliders to evenly spaced defaults
                const resetSliders = {};
                Object.keys(communityStructure).forEach(group => {
                  const nodeCount = communityStructure[group].nodeCount;
                  resetSliders[group] = Array(nodeCount - 1).fill(0).map((_, i) => (i + 1) / nodeCount);
                });
                setCommunitySliders(resetSliders);
              }}
              disabled={isOptimizing}
              style={{
                padding: '8px 16px',
                backgroundColor: isOptimizing ? '#555' : '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isOptimizing ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                transition: 'background-color 0.2s',
                opacity: isOptimizing ? 0.5 : 1
              }}
            >
              Reset to Defaults
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOptimizing(!isOptimizing);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: isOptimizing ? '#ff6b6b' : '#4a9eff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                transition: 'background-color 0.2s'
              }}
            >
              {isOptimizing ? 'Stop Optimization' : 'Optimize Importance Ratios'}
            </button>
          </div>
        </div>
        
        {isRatiosExpanded && (
          <>
            <div style={{ fontSize: '0.85rem', color: '#aaa', textAlign: 'center' }}>
              Adjust the importance of nodes within each community. These weights affect how links are aggregated.
              {isOptimizing && (
                <div style={{ marginTop: '5px', color: '#4a9eff', fontStyle: 'italic' }}>
                  🔄 Running gradient descent to minimize aggregation error...
                </div>
              )}
            </div>
        
        {Object.keys(communityStructure).sort((a, b) => Number(a) - Number(b)).map(group => {
          const { nodeCount, nodeIds } = communityStructure[group];
          const sliders = communitySliders[group];
          const weights = communityImportanceWeights[group];
          
          return (
            <div key={group} style={{
              padding: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '6px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>
                Community {group} ({nodeCount} nodes)
              </div>
              
              {/* Display node IDs with their importance weights */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '10px',
                fontSize: '0.8rem',
                color: '#bbb'
              }}>
                {nodeIds.map((nodeId, idx) => (
                  <div key={nodeId} style={{ textAlign: 'center' }}>
                    <div>{nodeId}</div>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>
                      {(weights[idx] * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Sliders for n-1 split points */}
              {sliders.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sliders.map((sliderValue, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      opacity: isOptimizing ? 0.5 : 1,
                      pointerEvents: isOptimizing ? 'none' : 'auto'
                    }}>
                      <span style={{ fontSize: '0.75rem', minWidth: '80px' }}>
                        Split {idx + 1}: {sliderValue.toFixed(3)}
                      </span>
                      <Slider 
                        value={sliderValue} 
                        setValue={(val) => updateSlider(group, idx, val)}
                        step={0.01}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
          </>
        )}
      </div>
      {/* Score Distributions - Side by Side */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ flexShrink: 0, overflow: 'visible', width: '100%' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            Original Distribution
          </h3>
          <ScoreDistribution 
            data={originalHistory} 
            iterations={originalIterations} 
            width={550} 
            height={180}
            colorMap={originalColorMap}
          />
        </div>
        <div style={{ flexShrink: 0, overflow: 'visible', width: '100%' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            Aggregated by Community
          </h3>
          <ScoreDistribution data={aggregatedHistory} iterations={aggregatedIterations} width={550} height={180} />
        </div>
      </div>

      {/* Community Score Comparisons */}
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '15px',
        backgroundColor: 'rgba(74, 158, 255, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(74, 158, 255, 0.3)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', textAlign: 'center' }}>
          Per-Community Score Comparison
        </h3>
        {communityScoreComparisons.map(({ group, communityId, before, after, percentDiff }) => (
          <div key={group} style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 15px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '4px'
          }}>
            <div style={{ fontWeight: 'bold', minWidth: '120px' }}>
              {communityId}
            </div>
            <div style={{ fontSize: '0.9rem' }}>
              {(before * 100).toFixed(2)}% → {(after * 100).toFixed(2)}%
            </div>
            <div style={{ 
              fontSize: '0.95rem', 
              fontWeight: 'bold',
              color: Math.abs(percentDiff) < 0.01 ? '#4CAF50' : '#FF9800',
              minWidth: '80px',
              textAlign: 'right'
            }}>
              {percentDiff >= 0 ? '+' : ''}{percentDiff.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>

      {/* Trust Matrices - Side by Side */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        {/* Original Trust Matrix */}
        <div style={{ 
          flex: '1', 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          maxHeight: '500px',
          width: '100%'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            Original Trust Matrix
          </h3>
          <TrustMatrix peers={originalData.nodes} trustMatrix={originalMatrix} colorMap={originalColorMap} />
        </div>

        {/* Aggregated Trust Matrix */}
        <div style={{ 
          flex: '1', 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          maxHeight: '500px',
          width: '100%'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            Aggregated Trust Matrix
          </h3>
          <TrustMatrix peers={aggregatedData.nodes} trustMatrix={aggregatedMatrix} />
        </div>
      </div>

      {/* Network Graphs - Side by Side */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        {/* Original Graph */}
        <div style={{ 
          flex: '1', 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '400px',
          width: '100%'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            Original Graph
          </h3>
          <Graph data={originalData} colorMap={originalColorMap} />
        </div>

        {/* Aggregated Graph */}
        <div style={{ 
          flex: '1', 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '400px',
          width: '100%'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            Aggregated Graph
          </h3>
          <Graph data={aggregatedData} />
        </div>
      </div>
    </div>
  );
}

function InteractiveSection({ alpha, initialStateName, getDefaultsForRow }) {
  // Start with a more complex graph
  const baseGraph = useMemo(() => cloneScenario(scenarios.BasicWithSybils), []);
  const [nodeToJoin1, setNodeToJoin1] = useState('');
  const [nodeToJoin2, setNodeToJoin2] = useState('');

  // Get available nodes for selection
  const availableNodes = useMemo(() => baseGraph.nodes.map(n => n.id), [baseGraph]);

  // Generate the current graph based on joined nodes
  const currentGraph = useMemo(() => {
    // If no valid selection, return original graph
    if (!nodeToJoin1 || !nodeToJoin2 || nodeToJoin1 === nodeToJoin2) {
      return baseGraph;
    }

    const graph = cloneScenario(baseGraph);
    const newNodes = [];
    const newLinks = [];
    
    // Create merged node ID
    const mergedId = `${nodeToJoin1}+${nodeToJoin2}`;
    const nodesToJoin = new Set([nodeToJoin1, nodeToJoin2]);
    
    // Add nodes (skip the ones being joined, add merged one instead)
    let mergedScore = 0;
    graph.nodes.forEach(node => {
      if (nodesToJoin.has(node.id)) {
        mergedScore += node.score;
      } else {
        newNodes.push(node);
      }
    });
    
    // Add the merged node with combined score and the same group as first node
    const firstNode = graph.nodes.find(n => n.id === nodeToJoin1);
    newNodes.push({
      id: mergedId,
      group: firstNode.group,
      score: mergedScore,
    });

    // Update links
    graph.links.forEach(link => {
      const sourceIsJoined = nodesToJoin.has(link.source);
      const targetIsJoined = nodesToJoin.has(link.target);
      
      let newSource = sourceIsJoined ? mergedId : link.source;
      let newTarget = targetIsJoined ? mergedId : link.target;
      
      // Find if this link already exists in newLinks
      const existingLink = newLinks.find(l => l.source === newSource && l.target === newTarget);
      
      if (existingLink) {
        // Combine the values
        existingLink.value += link.value;
      } else {
        newLinks.push({
          source: newSource,
          target: newTarget,
          value: link.value
        });
      }
    });

    return { nodes: newNodes, links: newLinks };
  }, [baseGraph, nodeToJoin1, nodeToJoin2]);

  const combinedSimulation = useSimulationData(currentGraph, alpha, initialStateName, getDefaultsForRow);
  const originalSimulation = useSimulationData(baseGraph, alpha, initialStateName, getDefaultsForRow);

  return (
    <>
      <h2 style={{ margin: '30px 0 10px 0', fontSize: '1.4rem', textAlign: 'center', borderTop: '2px solid #444', paddingTop: '30px' }}>
        Interactive: Join Nodes
      </h2>
      <div style={{ 
        maxWidth: '900px', 
        margin: '0 auto 20px auto',
        padding: '12px 20px',
        backgroundColor: 'rgba(70, 130, 180, 0.15)',
        borderRadius: '8px',
        fontSize: '0.9rem',
        textAlign: 'center',
        flexShrink: 0
      }}>
        Select two nodes below to join them together. 
        <br /><br />
        <strong>Note:</strong> Joining nodes within the same connected component preserves the trust distribution. 
        However, joining nodes from <strong>disparate groups</strong> (such as two separate islands in the graph){' '}
        <strong>can change the outcome</strong> by creating new trust pathways between previously disconnected components.
      </div>
      
      <InteractivePanel 
        combinedData={currentGraph}
        originalData={baseGraph}
        combinedSimulation={combinedSimulation}
        originalSimulation={originalSimulation}
        availableNodes={availableNodes}
        nodeToJoin1={nodeToJoin1}
        nodeToJoin2={nodeToJoin2}
        setNodeToJoin1={setNodeToJoin1}
        setNodeToJoin2={setNodeToJoin2}
      />
    </>
  );
}

function InteractivePanel({ 
  combinedData, 
  originalData, 
  combinedSimulation, 
  originalSimulation, 
  availableNodes, 
  nodeToJoin1, 
  nodeToJoin2, 
  setNodeToJoin1, 
  setNodeToJoin2 
}) {
  const { normalizedMatrix, history: combinedHistory, iterations: combinedIterations } = combinedSimulation;
  const { history: originalHistory, iterations: originalIterations } = originalSimulation;

  const isJoining = nodeToJoin1 && nodeToJoin2 && nodeToJoin1 !== nodeToJoin2;

  // Calculate combined scores before and after joining
  const scoreComparison = useMemo(() => {
    if (!isJoining) return null;

    // Get final scores (last step in history)
    const originalFinal = originalHistory[originalHistory.length - 1];
    const combinedFinal = combinedHistory[combinedHistory.length - 1];

    // Find indices of the two nodes being joined in original graph
    const idx1 = originalData.nodes.findIndex(n => n.id === nodeToJoin1);
    const idx2 = originalData.nodes.findIndex(n => n.id === nodeToJoin2);
    
    // Combined score before joining
    const scoreBefore = (originalFinal[idx1] || 0) + (originalFinal[idx2] || 0);

    // Score after joining (find the merged node in combined graph)
    const mergedId = `${nodeToJoin1}+${nodeToJoin2}`;
    const mergedIdx = combinedData.nodes.findIndex(n => n.id === mergedId);
    const scoreAfter = combinedFinal[mergedIdx] || 0;

    // Calculate percent difference
    const percentDiff = scoreBefore > 0 
      ? ((scoreAfter - scoreBefore) / scoreBefore) * 100 
      : 0;

    return {
      before: scoreBefore,
      after: scoreAfter,
      percentDiff
    };
  }, [isJoining, nodeToJoin1, nodeToJoin2, originalHistory, combinedHistory, originalData.nodes, combinedData.nodes]);

  // Generate color map for original graph that matches combined graph colors
  const originalColorMap = useMemo(() => {
    if (!isJoining) return null;

    const mergedId = `${nodeToJoin1}+${nodeToJoin2}`;
    const colorMap = {};
    
    // Find what color the merged node gets in the combined graph
    const mergedNodeIndex = combinedData.nodes.findIndex(n => n.id === mergedId);
    const mergedColor = getNodeColor(mergedNodeIndex, combinedData.nodes.length);
    
    // Assign colors to original nodes based on combined graph
    originalData.nodes.forEach((node, index) => {
      if (node.id === nodeToJoin1 || node.id === nodeToJoin2) {
        // Both joining nodes get the same color as the merged node
        colorMap[index.toString()] = mergedColor;
        colorMap[node.id] = mergedColor; // Also add by node ID for Graph component
      } else {
        // Other nodes get colors based on their position in combined graph
        const combinedIndex = combinedData.nodes.findIndex(n => n.id === node.id);
        if (combinedIndex >= 0) {
          const color = getNodeColor(combinedIndex, combinedData.nodes.length);
          colorMap[index.toString()] = color;
          colorMap[node.id] = color; // Also add by node ID for Graph component
        }
      }
    });
    
    return colorMap;
  }, [isJoining, nodeToJoin1, nodeToJoin2, combinedData.nodes, originalData.nodes]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '15px',
      border: '2px solid #4a9eff',
      borderRadius: '8px',
      padding: '15px',
      minWidth: 0,
      overflow: 'hidden',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Node Selection Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: '6px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Node 1:</label>
          <Select 
            value={nodeToJoin1} 
            setValue={setNodeToJoin1} 
            options={['', ...availableNodes]}
            displayForOption={(val) => val || '-- Select --'}
          />
        </div>
        <div style={{ fontSize: '1.2rem', marginTop: '20px' }}>+</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Node 2:</label>
          <Select 
            value={nodeToJoin2} 
            setValue={setNodeToJoin2} 
            options={['', ...availableNodes]}
            displayForOption={(val) => val || '-- Select --'}
          />
        </div>
        <div style={{ fontSize: '1.2rem', marginTop: '20px' }}>→</div>
        <div style={{ 
          fontSize: '0.9rem', 
          fontWeight: 'bold',
          marginTop: '20px',
          minWidth: '100px',
          textAlign: 'center'
        }}>
          {isJoining ? `${nodeToJoin1}+${nodeToJoin2}` : '(merged node)'}
        </div>
      </div>

      {/* Score Distributions - Side by Side */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ flexShrink: 0, overflow: 'visible', width: '100%' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            Original Distribution
          </h3>
          <ScoreDistribution 
            data={originalHistory} 
            iterations={originalIterations} 
            width={550} 
            height={180}
            colorMap={originalColorMap}
          />
        </div>
        <div style={{ flexShrink: 0, overflow: 'visible', width: '100%' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', textAlign: 'center' }}>
            After Joining
          </h3>
          <ScoreDistribution data={combinedHistory} iterations={combinedIterations} width={550} height={180} />
        </div>
      </div>

      {/* Score Comparison */}
      {isJoining && scoreComparison && (
        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          gap: '30px',
          padding: '15px',
          backgroundColor: 'rgba(74, 158, 255, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(74, 158, 255, 0.3)',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>
              Combined Score Before
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {(scoreComparison.before * 100).toFixed(2)}%
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            fontSize: '1.5rem',
            color: '#aaa'
          }}>
            →
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>
              Combined Score After
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {(scoreComparison.after * 100).toFixed(2)}%
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            fontSize: '1.2rem',
            color: '#aaa',
            paddingLeft: '20px',
            borderLeft: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>
                Difference
              </div>
              <div style={{ 
                fontSize: '1.3rem', 
                fontWeight: 'bold',
                color: Math.abs(scoreComparison.percentDiff) < 0.01 ? '#4CAF50' : '#FF9800'
              }}>
                {scoreComparison.percentDiff >= 0 ? '+' : ''}{scoreComparison.percentDiff.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side by side: Matrix and Graph */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        {/* Trust Matrix */}
        <div style={{ 
          flex: '1', 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          maxHeight: '500px',
          width: '100%'
        }}>
          <TrustMatrix peers={combinedData.nodes} trustMatrix={normalizedMatrix} />
        </div>

        {/* Graph */}
        <div style={{ 
          flex: '1', 
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '500px',
          width: '100%'
        }}>
          <Graph data={combinedData} />
        </div>
      </div>
    </div>
  );
}


