import { useEffect, useMemo, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import forceLinks from './force-links';

const useMemoWithPrevious = (fn, deps) => {
  const previous = useRef(null);
  return useMemo(() => {
    const result = fn(previous.current);
    previous.current = result;
    return result;
  }, deps);
};

const useGraphData = (data) => {
  return useMemoWithPrevious((prev) => {
    const dataCopy = JSON.parse(JSON.stringify(data));
    if (prev) {
      dataCopy.nodes.forEach(node => {
        const prevNode = prev.nodes.find(n => n.id === node.id);
        node.x = prevNode?.x || 0;
        node.y = prevNode?.y || 0;
        // node.vx = prevNode?.vx || 0;
        // node.vy = prevNode?.vy || 0;
        // console.log('node', prevNode?.vx);
      });
    }
    return dataCopy;
  }, [data]);
};

const fixedCenterForce = function(x, y, z) {
  var nodes, strength = 1;

  if (x == null) x = 0;
  if (y == null) y = 0;
  if (z == null) z = 0;

  function force() {
    var i,
        n = nodes.length,
        node,
        sx = 0,
        sy = 0,
        sz = 0;

    for (i = 0; i < n; ++i) {
      node = nodes[i], sx += node.x || 0, sy += node.y || 0, sz += node.z || 0;
    }

    for (sx = (sx / n - x) * strength, sy = (sy / n - y) * strength, sz = (sz / n - z) * strength, i = 0; i < n; ++i) {
      node = nodes[i];
      if (sx) { node.vx -= sx }
      if (sy) { node.vy -= sy; }
      if (sz) { node.vz -= sz; }
    }
  }

  force.initialize = function(_) {
    nodes = _;
  };

  force.x = function(_) {
    return arguments.length ? (x = +_, force) : x;
  };

  force.y = function(_) {
    return arguments.length ? (y = +_, force) : y;
  };

  force.z = function(_) {
    return arguments.length ? (z = +_, force) : z;
  };

  force.strength = function(_) {
    return arguments.length ? (strength = +_, force) : strength;
  };

  return force;
}


export const Graph = ({ data }) => {
  const fgRef = useRef();
  const dataCopy = useGraphData(data);

  useEffect(() => {
    if (fgRef.current) {
      const fg = fgRef.current;
      // console.log(fg.d3Force('charge'));

      fg.d3Force('link', forceLinks());
      // fg.d3Force('link').distanceMax(20);
      // console.log(fg.d3Force('link'));
      console.log('link max distance', fg.d3Force('link').distanceMax());

      // fg.d3Force('charge').distanceMax(40);
      // fg.d3Force('charge').strength(-5);

      // console.log('charge', fg.d3Force('charge'));
      // console.log('charge strength', fg.d3Force('charge').strength());
      // console.log('charge distanceMax', fg.d3Force('charge').distanceMax());
      // console.log('charge distanceMin', fg.d3Force('charge').distanceMin());
      // console.log('charge theta', fg.d3Force('charge').theta());

      // // console.log('center', fixedCenterForce);
      // fg.d3Force('center').strength(1);
      // console.log('center x', fg.d3Force('center').x());
      // console.log('center y', fg.d3Force('center').y());
      // console.log('center z', fg.d3Force('center').z());
      // console.log('center strength', fg.d3Force('center').strength());
    }
  }, []);
  
  return (
    <div style={{ height: '300px' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={dataCopy}
        height={600}
        nodeLabel="id"
        nodeAutoColorBy="group"
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = `${node.id} (${node.score.toFixed(2)})`;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = node.color;
          ctx.fillText(label, node.x, node.y);

          node.__bckgDimensions = bckgDimensions;
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          const bckgDimensions = node.__bckgDimensions;
          bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);
        }}
        // cooldownTime={Infinity}
        // d3AlphaDecay={0}
        // d3VelocityDecay={0.5}
      />
    </div>
  )
}

