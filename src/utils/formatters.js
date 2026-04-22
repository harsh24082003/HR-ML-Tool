export const formatCurrency = (value, compact = false) => {
  if (compact) {
    if (value >= 1_000_000) return `₹${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
    return `₹${value}`;
  }
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
};

export const formatPercent = (value, decimals = 1) =>
  `${Number(value || 0).toFixed(decimals)}%`;

export const getRiskLevel = (risk) => {
  if (risk > 70) return { label: "High", color: "#ef4444", bg: "rgba(239,68,68,0.15)" };
  if (risk > 40) return { label: "Medium", color: "#facc15", bg: "rgba(250,204,21,0.15)" };
  return { label: "Low", color: "#4ade80", bg: "rgba(74,222,128,0.15)" };
};

export const getRatingColor = (rating, max = 10) => {
  const pct = rating / max;
  if (pct >= 0.8) return "#4ade80";
  if (pct >= 0.6) return "#facc15";
  return "#ef4444";
};
