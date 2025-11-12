import { getNodeColor } from './colorUtils';

export const TrustMatrix = ({ peers, trustMatrix, colorMap = null }) => {
  if (trustMatrix.length !== peers.length || trustMatrix.some(row => row.length !== peers.length)) {
    throw new Error("Trust matrix dimensions must match the number of peers.");
  }

  // Generate colors for each peer
  const peerColors = peers.map((peer, index) => {
    if (colorMap && colorMap[index.toString()]) {
      return colorMap[index.toString()];
    }
    return getNodeColor(index, peers.length);
  });

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

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      width: '100%',
      height: '100%'
    }}>

      <div style={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
        {/* Single unified grid with labels and matrix */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `50px repeat(${peers.length}, 30px)`,
            gridTemplateRows: `50px repeat(${peers.length}, 30px)`,
            gap: "1px",
          }}
        >
          {/* Top-left corner cell (empty) */}
          <div style={{ width: "50px", height: "50px" }} />

          {/* X-axis labels (top row) */}
          {peers.map((peer, index) => (
            <div
              key={`x-label-${index}`}
              style={{
                width: "30px",
                height: "50px",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "flex-start",
                overflow: "visible",
              }}
            >
              <div
                style={{
                  transform: "translateX(15px) rotate(-45deg)",
                  transformOrigin: "left bottom",
                  whiteSpace: "nowrap",
                  color: peerColors[index],
                  fontWeight: "bold",
                }}
              >
                {peer.originalId || peer.id}
              </div>
            </div>
          ))}

          {/* Matrix rows with Y-axis labels */}
          {trustMatrix.map((row, rowIndex) => (
            <>
              {/* Y-axis label for this row */}
              <div
                key={`y-label-${rowIndex}`}
                style={{
                  width: "50px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  overflow: "visible",
                  whiteSpace: "nowrap",
                  position: "relative",
                }}
              >
                <span style={{ 
                  marginRight: "8px",
                  color: peerColors[rowIndex],
                  fontWeight: "bold"
                }}>
                  {peers[rowIndex].originalId || peers[rowIndex].id}
                </span>
              </div>

              {/* Matrix cells for this row */}
              {row.map((value, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  style={cellStyle(value)}
                  title={`Trust: ${value.toFixed(2)}`}
                />
              ))}
            </>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", flexShrink: 0 }}>
        <strong>Legend:</strong>
        <span>0</span>
        <div style={{ 
          width: "150px", 
          height: "30px", 
          background: "linear-gradient(to right, white, black)",
          border: "1px solid #ccc"
        }} />
        <span>1</span>
      </div>
    </div>
  );
};