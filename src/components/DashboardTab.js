import React, { useMemo } from "react";
import { Users, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Award, Target, Activity } from "lucide-react";
import { useCountUp } from "../hooks/useCountUp";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatCurrency } from "../utils/formatters";
import { getDepartmentStats, getSalaryBuckets, getAttritionBuckets, getHighRiskEmployees } from "../utils/calculations";

/* ── Shared UI ── */
const ChartBox = ({ title, subtitle, children, style, className, accentColor }) => (
  <div
    className={`fade-up ${className || ""}`}
    style={{
      background: "#ffffff",
      borderRadius: "16px",
      padding: "24px",
      border: `1px solid ${accentColor ? accentColor + "22" : "#e2e8f0"}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
      ...style,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-3px)";
      e.currentTarget.style.borderColor = accentColor ? accentColor + "44" : "#bfdbfe";
      e.currentTarget.style.boxShadow = `0 8px 32px ${accentColor ? accentColor + "18" : "rgba(37,99,235,0.1)"}`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.borderColor = accentColor ? accentColor + "22" : "#e2e8f0";
      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
    }}
  >
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{ color: "#0f172a", fontSize: "15px", fontWeight: "700" }}>{title}</h3>
      {subtitle && <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "3px" }}>{subtitle}</p>}
    </div>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
      <p style={{ color: "#64748b", fontSize: "12px", marginBottom: "6px" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: "13px", fontWeight: "600" }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

function MetricCard({ icon, label, rawValue, prefix = "", displaySuffix = "", subtitle, gradient, delay }) {
  const counted = useCountUp(rawValue || 0);
  const display = prefix
    ? prefix + counted.toLocaleString("en-IN")
    : displaySuffix
    ? (counted / 10).toFixed(1) + displaySuffix
    : counted.toLocaleString("en-IN");

  return (
    <div
      className={`fade-up ${delay || ""}`}
      style={{ background: gradient, borderRadius: "16px", padding: "22px", color: "white", boxShadow: "0 6px 24px rgba(0,0,0,0.13)", position: "relative", overflow: "hidden", transition: "transform 0.25s ease, box-shadow 0.25s ease", cursor: "default" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "0 18px 44px rgba(0,0,0,0.18)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.13)"; }}
    >
      <div style={{ position: "absolute", top: -20, right: -20, width: 90, height: 90, background: "rgba(255,255,255,0.08)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -14, left: -14, width: 60, height: 60, background: "rgba(255,255,255,0.05)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "12px", padding: "9px", display: "inline-flex" }}>{icon}</div>
      <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", marginTop: "14px" }}>{label}</p>
      <p className="counter-val" style={{ fontSize: "26px", fontWeight: "800", letterSpacing: "-0.5px", marginTop: "2px" }}>{display}</p>
      {subtitle && <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px", marginTop: "4px" }}>{subtitle}</p>}
    </div>
  );
}

export default function DashboardTab({ stats, payroll }) {
  const deptStats = useMemo(() => getDepartmentStats(payroll), [payroll]);
  const salaryBuckets = useMemo(() => getSalaryBuckets(payroll), [payroll]);
  const attritionBuckets = useMemo(() => getAttritionBuckets(payroll), [payroll]);
  const highRisk = useMemo(() => getHighRiskEmployees(payroll, 6), [payroll]);
  const highRiskCount = payroll.filter((e) => e.attritionRisk > 70).length;
  const medRiskCount = payroll.filter((e) => e.attritionRisk > 40 && e.attritionRisk <= 70).length;
  const avgPerf = (payroll.reduce((s, e) => s + parseFloat(e.performance_rating || 0), 0) / payroll.length).toFixed(1);

  const deductionBonus = [
    { name: "Base Pay", value: stats.totalPayroll - stats.totalBonuses, color: "#3b82f6" },
    { name: "Bonuses", value: stats.totalBonuses, color: "#10b981" },
    { name: "Deductions", value: stats.totalDeductions, color: "#ef4444" },
  ];

  const payrollByDept = deptStats.map((d) => ({
    name: d.name,
    totalPayroll: Math.round((d.avgSalary * d.count) / 1000),
  })).sort((a, b) => b.totalPayroll - a.totalPayroll).slice(0, 7);

  const metricCards = [
    { icon: <Users size={20} color="white" />, label: "Total Employees", rawValue: stats.totalEmployees, gradient: "linear-gradient(135deg, #2563eb, #1d4ed8)", delay: "d-1" },
    { icon: <DollarSign size={20} color="white" />, label: "Average Salary", rawValue: stats.avgSalary, prefix: "₹", subtitle: "per month", gradient: "linear-gradient(135deg, #059669, #047857)", delay: "d-2" },
    { icon: <TrendingUp size={20} color="white" />, label: "Total Payroll", rawValue: stats.totalPayroll, prefix: "₹", subtitle: `Revenue: ${formatCurrency(stats.companyRevenue, true)}`, gradient: "linear-gradient(135deg, #7c3aed, #6d28d9)", delay: "d-3" },
    { icon: <Activity size={20} color="white" />, label: "Avg Performance", rawValue: parseFloat(avgPerf) * 10, displaySuffix: "/10", gradient: "linear-gradient(135deg, #d97706, #b45309)", delay: "d-4" },
    { icon: <AlertTriangle size={20} color="white" />, label: "High Risk", rawValue: highRiskCount, subtitle: `${medRiskCount} medium risk`, gradient: "linear-gradient(135deg, #dc2626, #b91c1c)", delay: "d-5" },
    { icon: <Award size={20} color="white" />, label: "Total Bonuses", rawValue: stats.totalBonuses, prefix: "₹", gradient: "linear-gradient(135deg, #0891b2, #0e7490)", delay: "d-6" },
    { icon: <Target size={20} color="white" />, label: "Total Deductions", rawValue: stats.totalDeductions, prefix: "₹", gradient: "linear-gradient(135deg, #be185d, #9d174d)", delay: "d-7" },
    { icon: <TrendingUp size={20} color="white" />, label: "Projected Gain", rawValue: stats.projectedGain, prefix: "₹", gradient: "linear-gradient(135deg, #16a34a, #15803d)", delay: "d-8" },
  ];

  const RISK_COLORS = { low: "#4ade80", medium: "#facc15", high: "#ef4444" };

  return (
    <div className="fade-in">
      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {metricCards.map((c, i) => <MetricCard key={i} {...c} />)}
      </div>

      {/* Row 1 — Workforce + Payroll Composition */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px", marginBottom: "20px" }}>
        <ChartBox title="Headcount by Department" subtitle="Number of employees per department" className="d-1">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptStats} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient id="deptGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <Bar dataKey="count" name="Employees" fill="url(#deptGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Payroll Composition" subtitle="Base pay vs bonuses vs deductions" className="d-2">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={deductionBonus} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={4} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {deductionBonus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v, true)} contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>

      {/* Row 2 — Salary Distribution + Attrition Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px", marginBottom: "20px" }}>
        <ChartBox title="Salary Distribution" subtitle="How salaries are spread across employees" className="d-3">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salaryBuckets} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient id="salaryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c084fc" /><stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <Bar dataKey="count" name="Employees" fill="url(#salaryGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Attrition Risk Summary" subtitle="Employee count by risk level" accentColor="#ef4444" className="d-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={attritionBuckets} layout="vertical" margin={{ left: 10, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} />
              <YAxis dataKey="range" type="category" stroke="#94a3b8" fontSize={11} width={140} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Employees" radius={[0, 6, 6, 0]}>
                {attritionBuckets.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Risk level badges */}
          <div style={{ display: "flex", gap: "10px", marginTop: "16px", justifyContent: "center" }}>
            {attritionBuckets.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", background: b.color + "14", border: `1px solid ${b.color}33`, borderRadius: "20px", padding: "4px 12px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.color }} />
                <span style={{ color: "#334155", fontSize: "12px", fontWeight: "600" }}>{b.count} employees</span>
              </div>
            ))}
          </div>
        </ChartBox>
      </div>

      {/* Row 3 — Payroll by Dept + Top Risk List */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px" }}>
        <ChartBox title="Payroll Spend by Department" subtitle="Total monthly payroll (₹ thousands) per department" className="d-5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={payrollByDept} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v}K`} />
              <Tooltip formatter={(v) => `₹${v}K`} contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px" }} />
              <defs>
                <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <Bar dataKey="totalPayroll" name="Payroll (₹K)" fill="url(#payrollGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Top Attrition Risk List */}
        <div
          className="fade-up d-6"
          style={{ background: "#ffffff", borderRadius: "16px", padding: "24px", border: "1px solid rgba(220,38,38,0.12)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "transform 0.25s ease, border-color 0.25s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "rgba(220,38,38,0.3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(220,38,38,0.12)"; }}
        >
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ color: "#0f172a", fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={16} color="#ef4444" /> Immediate Attrition Risks
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "3px" }}>Employees requiring urgent HR attention</p>
          </div>
          {highRisk.map((emp, i) => (
            <div key={i} className={`fade-in d-${i + 1}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < highRisk.length - 1 ? "1px solid #f8fafc" : "none" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className={emp.attritionRisk > 70 ? "risk-high" : "risk-medium"} style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: emp.attritionRisk > 70 ? "linear-gradient(135deg,#dc2626,#9f1239)" : "linear-gradient(135deg,#d97706,#b45309)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", fontWeight: "800", color: "white", flexShrink: 0,
                }}>{i + 1}</div>
                <div>
                  <p style={{ color: "#0f172a", fontSize: "13px", fontWeight: "600" }}>{emp.name}</p>
                  <p style={{ color: "#94a3b8", fontSize: "11px" }}>{emp.department} · {emp.experience_years}y exp</p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: emp.attritionRisk > 70 ? "#dc2626" : "#d97706", fontWeight: "800", fontSize: "15px" }}>{emp.attritionRisk}%</p>
                <p style={{ color: "#94a3b8", fontSize: "11px" }}>risk score</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
