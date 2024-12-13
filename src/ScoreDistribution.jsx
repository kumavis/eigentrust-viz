import React, { useMemo } from 'react';
import { area, stack } from 'd3-shape';

export const ScoreDistribution = ({ data, width = 800, height = 400 }) => {
  // Skip if no data
  if (!data.length) {
    return <div>No data available</div>;
  }
  const lastDataPoint = data[data.length - 1];

  // Transform data to calculate percentages and handle missing nodes
  const normalizedData = useMemo(() => {
    // Get all unique keys across all time points
    const allKeys = new Set();
    data.forEach(entry => {
      Object.keys(entry).forEach(key => allKeys.add(key));
    });

    // If only one entry, duplicate it to show full width bar
    const dataToUse = data.length === 1 ? [data[0], data[0]] : data;
    
    return dataToUse.map(entry => {
      // Fill in missing keys with 0
      const completeEntry = {};
      allKeys.forEach(key => {
        completeEntry[key] = entry[key] || 0;
      });

      const total = Object.values(completeEntry).reduce((sum, val) => sum + val, 0);
      return Object.fromEntries(
        Object.entries(completeEntry).map(([key, value]) => [key, value / total])
      );
    });
  }, [data]);

  // Create stacked data structure using all keys
  const stackedData = useMemo(() => {
    const allKeys = Object.keys(lastDataPoint);
    const stackGenerator = stack().keys(allKeys);
    return stackGenerator(normalizedData);
  }, [normalizedData, lastDataPoint]);

  // Generate consistent colors based on node names
  const colors = useMemo(() => {
    const keys = Object.keys(lastDataPoint);
    return keys.map((key, index) => {
      // Use HSL to generate evenly spaced colors
      const hue = (index * 360) / keys.length;
      return `hsl(${hue}, 70%, 50%)`;
    });
  }, [data[data.length - 1]]);

  // Generate area paths with curved interpolation
  const areaGenerator = area()
    .x((d, i) => {
      if (data.length === 1) {
        // For single entry, stretch across full width
        return i === 0 ? 0 : width;
      }
      return (width / Math.max(1, data.length - 1)) * i;
    })
    .y0(d => height * d[0])
    .y1(d => height * d[1]);

  return (
    <div className="score-distribution">
      <svg width={width} height={height}>
        {/* Background grid */}
        <g className="grid">
          {[0.2, 0.4, 0.6, 0.8].map(y => (
            <line
              key={y}
              x1={0}
              y1={height * y}
              x2={width}
              y2={height * y}
              stroke="#ddd"
              strokeDasharray="4,4"
            />
          ))}
        </g>
        
        {/* Stacked areas */}
        {stackedData.map((series, i) => (
          <g key={series.key}>
            <path
              d={areaGenerator(series)}
              fill={colors[i]}
              opacity={0.8}
              stroke={colors[i]}
              strokeWidth={1}
            />
          </g>
        ))}

        {/* Legend */}
        <g className="legend" transform={`translate(${width - 120}, 20)`}>
          {stackedData.map((series, i) => (
            <g key={series.key} transform={`translate(0, ${i * 20})`}>
              <rect width={15} height={15} fill={colors[i]} />
              <text x={20} y={12} fontSize="12px">{series.key}</text>
            </g>
          ))}
        </g>

        {/* Percentage labels */}
        {normalizedData[normalizedData.length - 1] && 
          stackedData.map((series, i) => {
            const lastValue = normalizedData[normalizedData.length - 1][series.key];
            const yPos = height * (series[series.length - 1][0] + 
                                 series[series.length - 1][1]) / 2;
            return (
              <text
                key={series.key}
                x={width - 40}
                y={yPos}
                fill="white"
                fontSize="12px"
                textAnchor="end"
              >
                {(lastValue * 100).toFixed(1)}%
              </text>
            );
          })
        }
      </svg>
    </div>
  );
};
