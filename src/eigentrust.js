export function eigentrustWithWeightedTrustedSet(
  C,
  trustedSetWeights,
  alpha = 0.15,
  errorThreshold = 1e-6,
  maxIterations = 1000
) {
  const numPeers = C.length;

  // Ensure trustedSetWeights length matches the number of peers
  if (trustedSetWeights.length !== numPeers) {
      throw new Error("Length of trustedSetWeights must match the number of peers in the network.");
  }

  // Initialize the trust vector t with the trusted set weights
  let t = [...trustedSetWeights];
  let tPrev = [...t];

  // Transpose the matrix C
  const CT = transposeMatrix(C);

  let delta = Infinity;
  let iteration = 0;

  while (delta > errorThreshold && iteration < maxIterations) {
      // Compute the new trust vector
      let tNew = multiplyMatrixVector(CT, tPrev);

      // Blend with the trusted set weights
      t = tNew.map((val, i) => (1 - alpha) * val + alpha * trustedSetWeights[i]);

      // Calculate delta
      delta = calculateDelta(t, tPrev);

      // Update tPrev for the next iteration
      tPrev = [...t];
      iteration++;
  }

  if (iteration >= maxIterations) {
      console.warn("Eigentrust algorithm did not converge within the maximum iterations.");
  }

  return t;
}

// Helper function to transpose a matrix
function transposeMatrix(matrix) {
  return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
}

// Helper function to multiply a matrix and a vector
function multiplyMatrixVector(matrix, vector) {
  return matrix.map(row => row.reduce((sum, val, index) => sum + val * vector[index], 0));
}

// Helper function to calculate delta (norm of the difference)
function calculateDelta(vector1, vector2) {
  return Math.sqrt(vector1.reduce((sum, val, index) => sum + Math.pow(val - vector2[index], 2), 0));
}

// // Example Usage
// const C = [
//   [0.2, 0.3, 0.5],
//   [0.4, 0.4, 0.2],
//   [0.3, 0.2, 0.5],
// ];

// // Assume the trustedSetWeights array is already normalized
// const trustedSetWeights = [0.7, 0.0, 0.3]; // Peer 0 has 70% weight, Peer 2 has 30% weight, Peer 1 has 0%

// const globalTrust = eigentrustWithWeightedTrustedSet(C, trustedSetWeights);
// console.log("Global Trust Vector with Weighted Trusted Set:", globalTrust);

// // Helper functions (transposeMatrix, multiplyMatrixVector, calculateDelta) remain the same as before