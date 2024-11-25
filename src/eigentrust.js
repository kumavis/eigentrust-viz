// The EigenTrust Algorithm for Reputation Management in P2P Networks
// https://sci-hub.st/https://dl.acm.org/doi/10.1145/775152.775242

// tNow = p;
// repeat
//   tStep = CT * tNow;
//   tNext = (1-a) * tStep + a * p;
//   δ = ‖tNext − tNow‖;
//   tNow = tNext;
// until δ < error;

export function eigentrustWithWeightedTrustedSet(
  trustMatrix,
  trustedSetWeights,
  alpha = 0.15,
  errorThreshold = 1e-6,
  maxIterations = 1000
) {
  const numPeers = trustMatrix.length;

  // Ensure trustedSetWeights length matches the number of peers
  if (trustedSetWeights.length !== numPeers) {
    throw new Error("Length of trustedSetWeights must match the number of peers in the network.");
  }

  // Normalize trusted set weights to sum to 1
  const normalizedTrustedSet = normalizeTrustedSetWeights(trustedSetWeights);
  // Normalize the trust matrix - each row should sum to 1
  const normalizedTrustMatrix = normalizeTrustMatrix(trustMatrix, () => normalizedTrustedSet);

  // Initialize the trust vector t with the normalized trusted weights
  let tNow = [...normalizedTrustedSet];
  let tPrev = [...tNow];

  // Transpose the normalized matrix
  const transposedMatrix = transposeMatrix(normalizedTrustMatrix);

  let delta = Infinity;
  let iteration = 0;

  while (delta > errorThreshold && iteration < maxIterations) {
    // Compute the new trust vector: t = (1-α)CT·t + αp
    let tStep = multiplyMatrixVector(transposedMatrix, tPrev);
    tNow = tStep.map((tStepVal, i) => (1 - alpha) * tStepVal + alpha * normalizedTrustedSet[i]);

    // Calculate delta (convergence check)
    delta = calculateDelta(tNow, tPrev);

    // Update tPrev for the next iteration
    tPrev = [...tNow];
    iteration++;
  }

  if (iteration >= maxIterations) {
    console.warn("Eigentrust algorithm did not converge within the maximum iterations.");
  }

  return tNow;
}

function normalizeTrustMatrix (trustMatrix, getDefaultWeightsFor) {
  return trustMatrix.map((row, rowIndex) => {
    const rowSum = row.reduce((sum, val) => sum + val, 0);
    return rowSum > 0 
      ? row.map(val => val / rowSum)
      // If the row sum is 0, use default weights for that row
      : getDefaultWeightsFor(rowIndex);
  });
}

function normalizeTrustedSetWeights (trustedSetWeights) {
  const totalWeight = trustedSetWeights.reduce((sum, weight) => sum + weight, 0);
  return totalWeight > 0
    ? trustedSetWeights.map(w => w / totalWeight)
    : trustedSetWeights.map(() => 1 / numPeers);
}

// Helper function to transpose a matrix
function transposeMatrix(matrix) {
  return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
}

// Helper function to multiply a matrix and a vector. Returns a new vector.
function multiplyMatrixVector(matrix, vector) {
  return matrix.map(row => row.reduce((sum, val, index) => sum + val * vector[index], 0));
}

// Helper function to calculate delta (norm of the difference)
function calculateDelta(vector1, vector2) {
  return Math.sqrt(vector1.reduce((sum, val, index) => sum + Math.pow(val - vector2[index], 2), 0));
}
