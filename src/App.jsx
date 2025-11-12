import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import './App.css'

import { Select, Slider } from './widgets';
import { ScoreDistribution } from './ScoreDistribution';
import { Graph } from './Graph';
import { TrustMatrix } from './TrustMatrix';

import * as scenarios from './scenarios';

import {
  initialStateOptions,
  cloneScenario,
  normalizeMatrix,
  normalizeVector,
  calculateScoreHistory,
} from './topologiesUtils';

const fallbackRowScoreAlgos = {
  'TrustSet': (rowIndex, trustedSet) => trustedSet,
  'Uniform (PageRank)': (rowIndex, trustedSet) => trustedSet.map(() => 1 / trustedSet.length),
  'Self-Trust': (rowIndex, trustedSet) => trustedSet.map((_, i) => i === rowIndex ? 1 : 0),
};

export default function App() {
  // Algorithm parameters
  const [alpha, setAlpha] = useState(0.15);
  const [fallbackAlgoName, setFallbackAlgoName] = useState('TrustSet');
  const [initialStateName, setInitialStateName] = useState('Initial Trust Weights');
  const getDefaultsForRow = fallbackRowScoreAlgos[fallbackAlgoName];

  // Scenario
  const [scenarioName, setScenarioName] = useState('BasicWithSybils');
  const currentScenario = useMemo(() => cloneScenario(scenarios[scenarioName]), [scenarioName]);

  // TODO: scenario editing is currently buggy
  // const [data, setData] = useState(currentScenario);
  let data = currentScenario;
  // const setData = (newData) => { data = newData; };

  const simulationData = useMemo(() => {
    // Normalize the trust matrix and trusted set
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
  const { normalizedMatrix, normalizedTrustedSet, history: scoreHistory, iterations } = simulationData;

  // const addNode = () => {
  //   const newData = { ...data };
  //   const newNodeId = `Node${newData.nodes.length + 1}`;
  //   newData.nodes.push({
  //     id: newNodeId,
  //     group: 1,
  //     score: 0,
  //   });
  //   setData(newData);
  // };

  // const addRandomLink = () => {
  //   const newData = { ...data };

  //   // Try to add a random link up to 100 times (to handle case where most links exist)
  //   for (let attempt = 0; attempt < 100; attempt++) {
  //     const source = newData.nodes[Math.floor(Math.random() * newData.nodes.length)].id;
  //     const target = newData.nodes[Math.floor(Math.random() * newData.nodes.length)].id;

  //     // Check if link already exists
  //     if (!newData.links.some(link =>
  //       link.source === source && link.target === target)) {
  //       newData.links.push({
  //         source,
  //         target,
  //         value: Math.random()
  //       });
  //       setData(newData);
  //       break;
  //     }
  //   }
  // };

  // const resetSimulation = () => {
  //   setData(JSON.parse(JSON.stringify(INITIAL_STATE)));
  // };

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
      {/* Title */}
      <h1 style={{ textAlign: 'center', margin: '0', fontSize: '1.8rem', flexShrink: 0 }}>EigenTrust</h1>
      
      {/* Introduction */}
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        padding: '15px',
        backgroundColor: 'rgba(100, 100, 100, 0.1)',
        borderRadius: '8px',
        fontSize: '0.95rem',
        lineHeight: '1.6',
        flexShrink: 0
      }}>
        <p style={{ margin: '0 0 10px 0' }}>
          <strong>EigenTrust</strong> is a reputation algorithm designed for peer-to-peer networks. 
          It calculates trust scores for nodes based on how they rate each other.
        </p>
        <p style={{ margin: '0' }}>
          <strong>Inputs:</strong> A trust matrix (who trusts whom and how much) and initial trust weights for each node. 
          <br />
          <strong> Output:</strong> A global trust score for each node, reflecting the network's collective opinion.
        </p>
      </div>

      {/* Score Distribution */}
      <div style={{ flexShrink: 0, overflow: 'visible' }}>
        <ScoreDistribution data={scoreHistory} iterations={iterations} />
        <p style={{ 
          textAlign: 'center', 
          fontSize: '0.85rem', 
          color: '#aaa', 
          margin: '5px 0 0 0',
          maxWidth: '800px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          This graph shows how trust scores evolve and converge over iterations. The y-axis shows the trust score for each node. The right side of the graph shows the final trust scores for each node as proportion of the total trust.
        </p>
      </div>

      <h3 style={{ margin: '0 0 10px 0', flexShrink: 0, textAlign: 'center' }}>Trust Graph</h3>

      {/* Trust Graph Explanations */}
      <div style={{ 
        maxWidth: '900px', 
        margin: '0 auto 15px auto',
        padding: '0 15px',
        fontSize: '0.9rem',
        lineHeight: '1.6',
        color: '#ccc',
        flexShrink: 0
      }}>
        <p style={{ margin: '0 0 10px 0' }}>
          The trust graph is represented as a <strong>row stochastic matrix</strong>, 
          meaning each row sums to 1. This means each node distributes its total trust (100%) among the other nodes it trusts. 
          The values in the matrix are weights indicating how much trust flows from one node to another.
        </p>
        <p style={{ margin: '0 0 10px 0' }}>
          <strong>Trust Matrix (left):</strong> Each row represents a node, each column represents a potential trustee. 
          The cell at row <em>i</em>, column <em>j</em> shows how much node <em>i</em> trusts node <em>j</em>. 
          Darker cells indicate higher trust values. Each row sums to 1 (normalized) or 0 if that node trusts no one.
        </p>
        <p style={{ margin: '0' }}>
          <strong>Network Topology (right):</strong> Shows the trust relationships as a directed graph. 
          Arrows point from the truster to the trustee. Node labels display the initial trust weights.
        </p>
      </div>

      {/* Graph Selection */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <span style={{ fontWeight: 'bold' }}>Scenario:</span>
        <Select 
          value={scenarioName} 
          setValue={setScenarioName} 
          options={Object.keys(scenarios).filter(s => 
            !['CollapsedDiamond', 'StarJoined', 'StarSplit'].includes(s)
          )} 
        />
      </div>

      {/* Visualizations Row */}
      <div style={{ 
        display: 'flex', 
        gap: '15px',
        maxHeight: '540px',
        width: '100%',
        overflow: 'hidden'
      }}>
        {/* Matrix on the left */}
        <div style={{ 
          flex: '1', 
          minWidth: '0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          maxHeight: '540px'
        }}>
          <TrustMatrix peers={data.nodes} trustMatrix={normalizedMatrix} />
        </div>
        
        {/* Graph on the right */}
        <div style={{ 
          flex: '1', 
          minWidth: '0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          maxHeight: '540px'
        }}>
          <Graph data={data} />
        </div>
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
            <div style={{ fontSize: '0.8rem', color: '#aaa', lineHeight: '1.3' }}>
              Controls the balance between peer opinions and pre-trusted nodes. 
              Higher values give more weight to pre-trusted nodes.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1', minWidth: '0' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Fallback Peer Scoring Algorithm:</span>
            <Select value={fallbackAlgoName} setValue={setFallbackAlgoName} options={Object.keys(fallbackRowScoreAlgos)} />
            <div style={{ fontSize: '0.8rem', color: '#aaa', lineHeight: '1.3' }}>
              When a node trusts no one, this determines their default trust distribution: 
              use initial trust weights, distribute equally (PageRank), or trust only themselves.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1', minWidth: '0' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Initial State:</span>
            <Select value={initialStateName} setValue={setInitialStateName} options={Object.keys(initialStateOptions)} />
            <div style={{ fontSize: '0.8rem', color: '#aaa', lineHeight: '1.3' }}>
              The starting trust distribution. Doesn't affect the final result but can impact iterations required for convergence.
            </div>
          </div>
        </div>
      </div>

      {/* Link to topology comparison */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #444'
      }}>
        <Link to="/topologies" style={{ 
          color: '#4a9eff', 
          textDecoration: 'none', 
          fontSize: '1rem',
          fontWeight: 'bold',
          padding: '10px 20px',
          border: '2px solid #4a9eff',
          borderRadius: '6px',
          display: 'inline-block',
          transition: 'all 0.2s'
        }}>
          Compare Topologies →
        </Link>
      </div>
    </div>
  )
}
