import { useState, useMemo, useEffect } from 'react'
import './App.css'
import { eigentrustWithWeightedTrustedSet } from './eigentrust';
import BalanceDistribution from './BalanceDistribution';
import { Graph } from './Graph';

const TrustMatrix = ({ peers, trustMatrix }) => {
  if (trustMatrix.length !== peers.length || trustMatrix.some(row => row.length !== peers.length)) {
    throw new Error("Trust matrix dimensions must match the number of peers.");
  }

  const cellStyle = (value) => {
    // Black at full trust (1), white at no trust (0)
    const colorVal = 255 * (1 - value);
    return {
      backgroundColor: `rgba(${colorVal}, ${colorVal}, ${colorVal})`,
      width: "30px",
      height: "30px",
      textAlign: "center",
      border: "1px solid #ccc",
    }
  };

  // const renderRow = (row, rowIndex) => (
  //   <div style={{ display: "flex" }} key={rowIndex}>
  //     {row.map((value, colIndex) => (
  //       <div
  //         key={colIndex}
  //         style={cellStyle(value)}
  //         title={`Trust: ${value.toFixed(2)}`} // Tooltip to show the exact trust value
  //       />
  //     ))}
  //   </div>
  // );

  return (
    <div>
      <h3>Normalized Trust Matrix</h3>
      <div style={{ display: "flex", justifyContent: "center" }}>
        {/* Y-axis labels */}
        <div style={{ display: "grid", gridTemplateRows: `repeat(${peers.length}, 30px)`, marginRight: "10px" }}>
          {peers.map((peer, index) => (
            <div key={`y-label-${index}`} style={{ lineHeight: "30px", textAlign: "right" }}>
              {peer.id}
            </div>
          ))}
        </div>

        {/* Grid with x-axis labels */}
        <div>
          {/* X-axis labels */}
          <div style={{ display: "grid", gridTemplateColumns: `30px repeat(${peers.length}, 30px)`, justifyContent: 'center', marginBottom: "5px" }}>
            {peers.map((peer, index) => (
              <div
                key={`x-label-${index}`}
                style={{
                  transform: "translateX(24px) rotate(-45deg)",
                  transformOrigin: "left bottom",
                  wordWrap: 'unset',
                  whiteSpace: 'nowrap',
                  alignContent: 'end',
                }}
              >
                {peer.id}
              </div>
            ))}
          </div>

          {/* Trust matrix grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${peers.length}, 30px)`,
              gap: "1px", // Optional: Adds space between cells
            }}
          >
            {trustMatrix.flatMap((row, rowIndex) =>
              row.map((value, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  style={cellStyle(value)}
                  title={`Trust: ${value.toFixed(2)}`} // Tooltip to show the exact trust value
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "10px" }}>
        <strong>Legend:</strong>
        <span style={{ display: "inline-block", backgroundColor: "white", width: "30px", height: "30px", marginLeft: "5px" }} /> 0
        <span style={{ display: "inline-block", backgroundColor: "black", width: "30px", height: "30px", marginLeft: "5px" }} /> 1
      </div>
    </div>
  );
};

const Slider = ({ value, setValue }) => {
  const handleChange = (event) => {
    setValue(parseFloat(event.target.value));
  };

  return (
    <div style={{ width: "300px", margin: "20px auto", textAlign: "center" }}>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={value}
        onChange={handleChange}
        style={{ width: "100%" }}
      />
      <div>Balance Weight: {value.toFixed(1)}</div>
    </div>
  );
};

function App() {
  // Initial state constants
  const INITIAL_STATE = {
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

  const [alpha, setAlpha] = useState(0.5);
  const [data, setData] = useState(INITIAL_STATE);
  const [scoreHistory, setScoreHistory] = useState([balancesFromGraphData(INITIAL_STATE)]);

  const normalizedMatrix = data.nodes.map((node, i) => {
    const outgoingLinks = data.links.filter(link => link.source === node.id);
    // TODO: normalize
    const outGoingScores = data.nodes.map((node) => {
      return outgoingLinks.find(link => link.target === node.id)?.value || 0;
    });
    return outGoingScores;
  });

  const calculateScores = () => {
    const normalizedMatrix = data.nodes.map((node, i) => {
      const outgoingLinks = data.links.filter(link => link.source === node.id);
      // TODO: normalize
      const outGoingScores = data.nodes.map((node) => {
        return outgoingLinks.find(link => link.target === node.id)?.value || 0;
      });
      return outGoingScores;
    });

    // specify trusted set
    const trustedSet = data.nodes.map(node => node.score);
    const totalWeight = trustedSet.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight > 0) {
      for (const peer in trustedSet) {
        trustedSet[peer] /= totalWeight;
      }
    }

    // calculate scores
    const scores = eigentrustWithWeightedTrustedSet(
      normalizedMatrix,
      trustedSet,
      alpha,
    );
    const sumScores = scores.reduce((sum, val) => sum + val, 0);
    const normalizedScores = scores.map(val => val / sumScores);

    // console.log(scores);
    // console.log(normalizedScores);
    const newData = { ...data };
    const issuance = 10;
    newData.nodes.forEach((node, i) => {
      node.score += issuance * normalizedScores[i];
    });

    // After updating scores, add current balances to history
    const currentBalances = balancesFromGraphData(newData);
    setScoreHistory(prev => [...prev, currentBalances]);
    setData(newData);
  }

  const addNode = () => {
    const newData = { ...data };
    const newNodeId = `Node${newData.nodes.length + 1}`;
    newData.nodes.push({
      id: newNodeId,
      group: 1,
      score: 0,
    });
    setData(newData);
    calculateScores();
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
    calculateScores();
  };

  const resetSimulation = () => {
    setData(JSON.parse(JSON.stringify(INITIAL_STATE)));
    setScoreHistory([balancesFromGraphData(INITIAL_STATE)]);
  };

  // Set up interval for calculating scores only
  useEffect(() => {
    // setTimeout(() => {
    //   calculateScores();
    // }, 0);
    const interval = setInterval(() => {
      calculateScores();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <h1>EigenTrust</h1>
      <div className="read-the-docs">
        <Slider value={alpha} setValue={setAlpha} />
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
        <BalanceDistribution data={scoreHistory} />
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

export default App

function balancesFromGraphData(data) {
  const balances = {};
  data.nodes.map(node => {
    balances[node.id] = node.score;
  });
  return balances;
}