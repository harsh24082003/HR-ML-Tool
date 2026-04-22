export const getDepartmentStats = (payroll) => {
  const map = {};
  payroll.forEach((emp) => {
    const dept = emp.department || "Unknown";
    if (!map[dept]) map[dept] = { name: dept, count: 0, totalSalary: 0, totalRisk: 0, highRisk: 0 };
    map[dept].count += 1;
    map[dept].totalSalary += parseFloat(emp.salary || 0);
    map[dept].totalRisk += parseFloat(emp.attritionRisk || 0);
    if (emp.attritionRisk > 70) map[dept].highRisk += 1;
  });
  return Object.values(map).map((d) => ({
    ...d,
    avgSalary: Math.round(d.totalSalary / d.count),
    avgRisk: Math.round(d.totalRisk / d.count),
  }));
};

export const getSalaryBuckets = (payroll) => {
  const buckets = [
    { range: "< 40K", min: 0, max: 40000, count: 0 },
    { range: "40–60K", min: 40000, max: 60000, count: 0 },
    { range: "60–80K", min: 60000, max: 80000, count: 0 },
    { range: "80–100K", min: 80000, max: 100000, count: 0 },
    { range: "100–120K", min: 100000, max: 120000, count: 0 },
    { range: "> 120K", min: 120000, max: Infinity, count: 0 },
  ];
  payroll.forEach((emp) => {
    const s = parseFloat(emp.salary || 0);
    const bucket = buckets.find((b) => s >= b.min && s < b.max);
    if (bucket) bucket.count += 1;
  });
  return buckets;
};

export const getAttritionBuckets = (payroll) => [
  { range: "Low (0–40%)", count: payroll.filter((e) => e.attritionRisk <= 40).length, color: "#4ade80" },
  { range: "Medium (41–70%)", count: payroll.filter((e) => e.attritionRisk > 40 && e.attritionRisk <= 70).length, color: "#facc15" },
  { range: "High (71–100%)", count: payroll.filter((e) => e.attritionRisk > 70).length, color: "#ef4444" },
];

export const getTopPerformers = (payroll, n = 5) =>
  [...payroll]
    .sort((a, b) => parseFloat(b.performance_rating || 0) - parseFloat(a.performance_rating || 0))
    .slice(0, n);

export const getHighRiskEmployees = (payroll, n = 5) =>
  [...payroll]
    .sort((a, b) => b.attritionRisk - a.attritionRisk)
    .slice(0, n);

export const getPerformanceDistribution = (payroll) => [
  { range: "1–2", min: 0, max: 2.9 },
  { range: "3–4", min: 3, max: 4.9 },
  { range: "5–6", min: 5, max: 6.9 },
  { range: "7–8", min: 7, max: 8.9 },
  { range: "9–10", min: 9, max: 10 },
].map((b) => ({
  range: b.range,
  count: payroll.filter((e) => parseFloat(e.performance_rating || 0) >= b.min && parseFloat(e.performance_rating || 0) <= b.max).length,
}));

export const getSalaryGapByDept = (payroll) => {
  const map = {};
  payroll.forEach((emp) => {
    const dept = emp.department || "Unknown";
    if (!map[dept]) map[dept] = { dept, totalActual: 0, totalML: 0, countML: 0, count: 0 };
    map[dept].count += 1;
    map[dept].totalActual += parseFloat(emp.salary || 0);
    if (emp.mlSalary > 0) { map[dept].totalML += parseFloat(emp.mlSalary || 0); map[dept].countML += 1; }
  });
  return Object.values(map).map((d) => ({
    dept: d.dept,
    actual: Math.round(d.totalActual / d.count),
    predicted: d.countML > 0 ? Math.round(d.totalML / d.countML) : 0,
    gap: d.countML > 0 ? Math.round(d.totalML / d.countML - d.totalActual / d.count) : 0,
  })).filter((d) => d.predicted > 0);
};

export const getWorkHabitsStats = (payroll) => {
  const map = {};
  payroll.forEach((emp) => {
    const dept = emp.department || "Unknown";
    if (!map[dept]) map[dept] = { dept, overtime: 0, lateLogins: 0, leaves: 0, count: 0 };
    map[dept].count += 1;
    map[dept].overtime += parseFloat(emp.overtime_hours || 0);
    map[dept].lateLogins += parseFloat(emp.late_login_count || 0);
    map[dept].leaves += parseFloat(emp.unpaid_leaves || 0);
  });
  return Object.values(map).map((d) => ({
    dept: d.dept,
    overtime: parseFloat((d.overtime / d.count).toFixed(1)),
    lateLogins: parseFloat((d.lateLogins / d.count).toFixed(1)),
    leaves: parseFloat((d.leaves / d.count).toFixed(1)),
  }));
};

export const getSatisfactionVsAttrition = (payroll) =>
  [1, 2, 3, 4, 5].map((score) => {
    const group = payroll.filter((e) => parseInt(e.job_satisfaction) === score);
    return {
      score: `Sat ${score}`,
      count: group.length,
      avgRisk: group.length ? Math.round(group.reduce((s, e) => s + parseFloat(e.attritionRisk || 0), 0) / group.length) : 0,
      avgPerf: group.length ? parseFloat((group.reduce((s, e) => s + parseFloat(e.performance_rating || 0), 0) / group.length).toFixed(1)) : 0,
    };
  }).filter((d) => d.count > 0);

export const getDeptScorecard = (payroll) => {
  const map = {};
  payroll.forEach((emp) => {
    const dept = emp.department || "Unknown";
    if (!map[dept]) map[dept] = { dept, count: 0, salary: 0, perf: 0, risk: 0, sat: 0, satCount: 0, highRisk: 0, overtime: 0 };
    map[dept].count += 1;
    map[dept].salary += parseFloat(emp.salary || 0);
    map[dept].perf += parseFloat(emp.performance_rating || 0);
    map[dept].risk += parseFloat(emp.attritionRisk || 0);
    if (emp.attritionRisk > 70) map[dept].highRisk += 1;
    if (emp.job_satisfaction) { map[dept].sat += parseFloat(emp.job_satisfaction); map[dept].satCount += 1; }
    map[dept].overtime += parseFloat(emp.overtime_hours || 0);
  });
  return Object.values(map)
    .map((d) => ({
      dept: d.dept,
      count: d.count,
      avgSalary: Math.round(d.salary / d.count),
      avgPerf: parseFloat((d.perf / d.count).toFixed(1)),
      avgRisk: Math.round(d.risk / d.count),
      highRisk: d.highRisk,
      avgSat: d.satCount > 0 ? parseFloat((d.sat / d.satCount).toFixed(1)) : null,
      avgOvertime: parseFloat((d.overtime / d.count).toFixed(1)),
    }))
    .sort((a, b) => b.avgRisk - a.avgRisk);
};
