import { useState, useMemo } from 'react'
import './App.css'

import { eigentrustWithWeightedTrustedSet } from './eigentrust';

import { Slider } from './widgets';
import { ScoreDistribution } from './ScoreDistribution';
import { Graph } from './Graph';
import { TrustMatrix } from './TrustMatrix';

import * as scenarios from './scenarios'


export default function App() {
  const INITIAL_STATE = cloneScenario(scenarios.BasicWithSybils);
  // Initial state constants
  const [alpha, setAlpha] = useState(0.15);
  const [data, setData] = useState(INITIAL_STATE);
  const simulationData = useMemo(() => {
    // Normalize the trust matrix and trusted set
    const normalizedMatrix = normalizeMatrix(data);
    const trustedSet = data.nodes.map(node => node.score);
    const normalizedTrustedSet = normalizeVector(trustedSet);
  
    const history = calculateScoreHistory(data, alpha, normalizedMatrix, normalizedTrustedSet);
    return {
      normalizedMatrix,
      normalizedTrustedSet,
      history,
    };
  }, [data, alpha]);
  const { normalizedMatrix, normalizedTrustedSet, history: scoreHistory } = simulationData;

  const addNode = () => {
    const newData = { ...data };
    const newNodeId = `Node${newData.nodes.length + 1}`;
    newData.nodes.push({
      id: newNodeId,
      group: 1,
      score: 0,
    });
    setData(newData);
  };

  const addRandomLink = () => {
    const newData = { ...data };

    // Try to add a random link up to 100 times (to handle case where most links exist)
    for (let attempt = 0; attempt < 100; attempt++) {
      const source = newData.nodes[Math.floor(Math.random() * newData.nodes.length)].id;
      const target = newData.nodes[Math.floor(Math.random() * newData.nodes.length)].id;

      // Check if link already exists
      if (!newData.links.some(link =>
        link.source === source && link.target === target)) {
        newData.links.push({
          source,
          target,
          value: Math.random()
        });
        setData(newData);
        break;
      }
    }
  };

  const resetSimulation = () => {
    setData(JSON.parse(JSON.stringify(INITIAL_STATE)));
  };

  return (
    <>
      <h1>EigenTrust</h1>
      <div className="read-the-docs">
        <div style={{ width: "300px", margin: "20px auto", textAlign: "center" }}>
          <Slider value={alpha} setValue={setAlpha} step={0.05}/>
          <div>Balance Weight: {alpha.toFixed(2)}</div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
          <button onClick={addNode}>
            Add Node
          </button>
          <button onClick={addRandomLink}>
            Add Random Link
          </button>
          <button onClick={resetSimulation} style={{ backgroundColor: '#ff4444' }}>
            Reset
          </button>
        </div>
      </div>
      <div style={{ marginTop: '20px' }}>
        <ScoreDistribution data={scoreHistory} />
      </div>
      <div>
        <TrustMatrix peers={data.nodes} trustMatrix={normalizedMatrix} />
      </div>
      <div className="card">
        <Graph data={data} />
      </div>
    </>
  )
}

function calculateScoreHistory (data, alpha, normalizedMatrix, normalizedTrustedSet) {
  // calculate scores
  const { result: scores, steps, iterations } = eigentrustWithWeightedTrustedSet(
    normalizedMatrix,
    normalizedTrustedSet,
    alpha,
  );

  // After updating scores, add current balances to history
  const history = stepsToNodeIdMapping(data, steps);
  return history;
}

function stepsToNodeIdMapping(data, steps) {
  const history = steps.map(step => {
    const nodes = data.nodes.map((node, i) => {
      return step[i];
    });
    return nodes;
  })
  return history;
}

function normalizeMatrix (data) {
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

function normalizeVector (vector) {
  const totalWeight = vector.reduce((sum, weight) => sum + weight, 0);
  const normalizedVector = vector.map(w => w / totalWeight);
  return normalizedVector;
}

function cloneScenario (scenario) {
  return JSON.parse(JSON.stringify(scenario));
}