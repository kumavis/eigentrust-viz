
export const TrustMatrix = ({ peers, trustMatrix }) => {
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