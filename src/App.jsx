import { useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d';
import './App.css'
import { eigentrustWithWeightedTrustedSet } from './eigentrust';

const Graph = ({ data }) => {
  // force graph mutates the data so we make a deep copy
  const dataCopy = JSON.parse(JSON.stringify(data));
  return (
    <ForceGraph2D
      graphData={dataCopy}
      nodeLabel="id"
      nodeAutoColorBy="group"
      nodeCanvasObject={(node, ctx, globalScale) => {
        const label = `${node.id} (${node.score.toFixed(2)})`;
        const fontSize = 12/globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = node.color;
        ctx.fillText(label, node.x, node.y);

        node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
      }}
      nodePointerAreaPaint={(node, color, ctx) => {
        ctx.fillStyle = color;
        const bckgDimensions = node.__bckgDimensions;
        bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);
      }}
    />
  )
}

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
  const [alpha, setAlpha] = useState(0.1);
  const [data, setData] = useState({
    nodes: [
      { id: 'Alice', group: 1, score: 10 },
      { id: 'Bob', group: 1, score: 15 },
      { id: 'Carol', group: 1, score: 20 },
      { id: 'Dave', group: 1, score: 0 },
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
    ],
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

    console.log(scores);
    console.log(normalizedScores);
    const newData = { ...data };
    const issuance = 10;
    newData.nodes.forEach((node, i) => {
      node.score += issuance * normalizedScores[i];
    });
    setData(newData);
  }

  return (
    <>
      <h1>EigenTrust</h1>
      <div className="read-the-docs">
        <Slider value={alpha} setValue={setAlpha}/>
        <button onClick={() => calculateScores()}>
          Click here to calculate scores
        </button>
      </div>
      <div className="card">
        <Graph data={data}/>
      </div>
    </>
  )
}

export default App
