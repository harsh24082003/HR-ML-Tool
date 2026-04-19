import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, ComposedChart, Legend,
} from "recharts";
import { Award, TrendingDown, BarChart2, Zap, Star, Clock, AlertTriangle, Users } from "lucide-react";
import { formatCurrency, getRatingColor } from "../utils/formatters";
import {
  getPerformanceDistribution,
  getSalaryGapByDept,
  getWorkHabitsStats,
  getSatisfactionVsAttrition,
  getDeptScorecard,
  getTopPerformers,
} from "../utils/calculations";

/* ── Shared UI ── */
const ChartBox = ({ title, subtitle, icon, children, className, accentColor }) => (
  <div
    className={`fade-up ${className || ""}`}
    style={{
      background: "#ffffff",
      borderRadius: "16px",
      padding: "24px",
      border: `1px solid ${accentColor ? accentColor + "20" : "#e2e8f0"}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      transition: "transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-3px)";
      e.currentTarget.style.borderColor = accentColor ? accentColor + "44" : "#bfdbfe";
      e.currentTarget.style.boxShadow = `0 8px 28px ${accentColor ? accentColor + "14" : "rgba(37,99,235,0.1)"}`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.borderColor = accentColor ? accentColor + "20" : "#e2e8f0";
      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
    }}
  >
    <div style={{ marginBottom: "18px" }}>
      <h3 style={{ color: "#0f172a", fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "7px" }}>
        {icon && React.cloneElement(icon, { size: 15, color: accentColor || "#2563eb" })}
        {title}
      </h3>
      {subtitle && <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "3px" }}>{subtitle}</p>}
    </div>
    {children}
  </div>
);

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
      <p style={{ color: "#64748b", fontSize: "12px", marginBottom: "6px" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#334155", fontSize: "13px", fontWeight: "600" }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ── Scorecard row colors ── */
const riskColor = (r) => r > 60 ? "#ef4444" : r > 40 ? "#d97706" : "#059669";
const perfColor = (p) => p >= 8 ? "#059669" : p >= 5 ? "#d97706" : "#ef4444";
const satColor = (s) => s >= 4 ? "#059669" : s >= 3 ? "#d97706" : "#ef4444";

export default function AnalyticsTab({ payroll }) {
  const perfDist = useMemo(() => getPerformanceDistribution(payroll), [payroll]);
  const salaryGap = useMemo(() => getSalaryGapByDept(payroll), [payroll]);
  const workHabits = useMemo(() => getWorkHabitsStats(payroll), [payroll]);
  const satVsRisk = useMemo(() => getSatisfactionVsAttrition(payroll), [payroll]);
  const scorecard = useMemo(() => getDeptScorecard(payroll), [payroll]);
  const topPerformers = useMemo(() => getTopPerformers(payroll, 6), [payroll]);

  const avgSalaryByDept = useMemo(() => {
    const map = {};
    payroll.forEach((e) => {
      const d = e.department || "Unknown";
      if (!map[d]) map[d] = { name: d, total: 0, count: 0 };
      map[d].total += parseFloat(e.salary || 0); map[d].count += 1;
    });
    return Object.values(map).map((d) => ({ name: d.name, avgSalary: Math.round(d.total / d.count) }));
  }, [payroll]);

  const expBands = useMemo(() => {
    const bands = [
      { band: "0–2y", min: 0, max: 2 }, { band: "3–5y", min: 3, max: 5 },
      { band: "6–10y", min: 6, max: 10 }, { band: "11–15y", min: 11, max: 15 }, { band: "15+y", min: 16, max: 99 },
    ];
    return bands.map((b) => {
      const g = payroll.filter((e) => parseFloat(e.experience_years) >= b.min && parseFloat(e.experience_years) <= b.max);
      return { band: b.band, count: g.length, avgSalary: g.length ? Math.round(g.reduce((s, e) => s + parseFloat(e.salary || 0), 0) / g.length) : 0 };
    }).filter((b) => b.count > 0);
  }, [payroll]);

  const expRisk = useMemo(() => {
    const bands = [
      { band: "0–2y", min: 0, max: 2 }, { band: "3–5y", min: 3, max: 5 },
      { band: "6–10y", min: 6, max: 10 }, { band: "11–15y", min: 11, max: 15 }, { band: "15+y", min: 16, max: 99 },
    ];
    return bands.map((b) => {
      const g = payroll.filter((e) => parseFloat(e.experience_years) >= b.min && parseFloat(e.experience_years) <= b.max);
      return { band: b.band, avgRisk: g.length ? Math.round(g.reduce((s, e) => s + parseFloat(e.attritionRisk || 0), 0) / g.length) : 0 };
    }).filter((b) => b.avgRisk > 0);
  }, [payroll]);

  const hasSalaryGap = salaryGap.length > 0;
  const hasWorkHabits = workHabits.some((d) => d.overtime > 0 || d.lateLogins > 0 || d.leaves > 0);
  const hasSat = satVsRisk.length > 0;

  return (
    <div className="fade-in">

      {/* Row 1 — Performance Distribution + ML Salary Gap */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px", marginBottom: "20px" }}>

        <ChartBox
          title="Performance Rating Distribution"
          subtitle="How employees are distributed across rating bands"
          icon={<Star />}
          accentColor="#d97706"
          className="d-1"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={perfDist} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip content={<Tip />} />
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fcd34d" /><stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <Bar dataKey="count" name="Employees" fill="url(#perfGrad)" radius={[6, 6, 0, 0]}>
                {perfDist.map((e, i) => (
                  <Cell key={i} fill={
                    i <= 1 ? "#ef4444" : i === 2 ? "#f97316" : i === 3 ? "#facc15" : "#4ade80"
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
            {[["1–4", "#ef4444", "Low"], ["5–6", "#f97316", "Average"], ["7–8", "#facc15", "Good"], ["9–10", "#4ade80", "Excellent"]].map(([r, c, l]) => (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: "5px", background: c + "14", border: `1px solid ${c}33`, borderRadius: "20px", padding: "3px 10px" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
                <span style={{ fontSize: "11px", color: "#334155", fontWeight: "600" }}>{r} · {l}</span>
              </div>
            ))}
          </div>
        </ChartBox>

        {hasSalaryGap ? (
          <ChartBox
            title="ML Predicted vs Actual Salary"
            subtitle="Compensation gap by department (based on ML model)"
            icon={<Zap />}
            accentColor="#7c3aed"
            className="d-2"
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salaryGap} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dept" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px" }} />
                <Legend wrapperStyle={{ fontSize: "12px", color: "#64748b" }} />
                <Bar dataKey="actual" name="Actual Avg" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="predicted" name="ML Predicted" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p style={{ color: "#94a3b8", fontSize: "11px", marginTop: "10px", textAlign: "center" }}>
              Positive gap = employees may be underpaid vs ML benchmark
            </p>
          </ChartBox>
        ) : (
          <ChartBox title="Average Salary by Department" subtitle="Monthly avg compensation per team" icon={<BarChart2 />} accentColor="#7c3aed" className="d-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={avgSalaryByDept} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<Tip />} />
                <defs>
                  <linearGradient id="purpleGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c084fc" /><stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
                <Bar dataKey="avgSalary" name="Avg Salary" fill="url(#purpleGrad2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        )}
      </div>

      {/* Row 2 — Work Habits + Satisfaction vs Risk */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px", marginBottom: "20px" }}>

        {hasWorkHabits ? (
          <ChartBox
            title="Work Habits by Department"
            subtitle="Avg overtime hours, late logins & unpaid leaves per team"
            icon={<Clock />}
            accentColor="#0891b2"
            className="d-3"
          >
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={workHabits} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dept" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px" }} />
                <Legend wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                <Bar dataKey="overtime" name="Overtime hrs" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="lateLogins" name="Late logins" fill="#fb923c" radius={[3, 3, 0, 0]} />
                <Bar dataKey="leaves" name="Unpaid leaves" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        ) : (
          <ChartBox title="Experience & Salary Curve" subtitle="How average salary grows with experience" icon={<TrendingDown />} accentColor="#0891b2" className="d-3">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={expBands} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="band" stroke="#94a3b8" fontSize={11} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar yAxisId="right" dataKey="count" name="Headcount" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="avgSalary" name="Avg Salary" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: "#2563eb", r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartBox>
        )}

        {hasSat ? (
          <ChartBox
            title="Satisfaction vs Attrition Risk"
            subtitle="Lower satisfaction = higher flight risk (correlation)"
            icon={<AlertTriangle />}
            accentColor="#dc2626"
            className="d-4"
          >
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={satVsRisk} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="score" stroke="#94a3b8" fontSize={12} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} unit="%" domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px" }} />
                <Legend wrapperStyle={{ fontSize: "12px", color: "#64748b" }} />
                <Bar yAxisId="right" dataKey="count" name="Employees" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="avgRisk" name="Avg Risk %" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: "#ef4444", r: 5 }} />
                <Line yAxisId="left" type="monotone" dataKey="avgPerf" name="Avg Perf ×10%" stroke="#16a34a" strokeWidth={2} strokeDasharray="4 3" dot={{ fill: "#16a34a", r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartBox>
        ) : (
          <ChartBox title="Attrition Risk by Experience" subtitle="Which tenure band is most at-risk?" icon={<AlertTriangle />} accentColor="#dc2626" className="d-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={expRisk} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="band" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} unit="%" />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px" }} />
                <Bar dataKey="avgRisk" name="Avg Risk %" radius={[6, 6, 0, 0]}>
                  {[0,1,2,3,4].map((i) => <Cell key={i} fill={i < 2 ? "#ef4444" : i === 2 ? "#facc15" : "#4ade80"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        )}
      </div>

      {/* Row 3 — Department Scorecard + Top Performers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px", marginBottom: "20px" }}>
        <div
          className="fade-up d-5"
          style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden", transition: "transform 0.25s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <h3 style={{ color: "#0f172a", fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "7px" }}>
              <Users size={15} color="#2563eb" /> Department Performance Scorecard
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "3px" }}>Sorted by attrition risk — highest priority departments first</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Department", "Headcount", "Avg Salary", "Avg Performance", "Avg Risk", "High Risk", "Avg Satisfaction", "Avg Overtime"].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", color: "#2563eb", fontWeight: "700", fontSize: "11px", textAlign: "left", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scorecard.map((row, i) => (
                  <tr key={i} className="table-row" style={{ borderBottom: "1px solid #f8fafc", background: i % 2 === 0 ? "#fafbff" : "#ffffff" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "3px 10px", color: "#1d4ed8", fontSize: "12px", fontWeight: "600" }}>{row.dept}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#334155", fontWeight: "600" }}>{row.count}</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{formatCurrency(row.avgSalary, true)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ color: perfColor(row.avgPerf), fontWeight: "700" }}>{row.avgPerf}/10</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden", maxWidth: 60 }}>
                          <div style={{ height: "100%", width: `${row.avgRisk}%`, background: riskColor(row.avgRisk), borderRadius: 3, transition: "width 0.6s" }} />
                        </div>
                        <span style={{ color: riskColor(row.avgRisk), fontWeight: "700", fontSize: "12px" }}>{row.avgRisk}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: row.highRisk > 0 ? "#fef2f2" : "#ecfdf5", border: `1px solid ${row.highRisk > 0 ? "#fecaca" : "#a7f3d0"}`, borderRadius: "20px", padding: "2px 10px", color: row.highRisk > 0 ? "#dc2626" : "#059669", fontSize: "11px", fontWeight: "700" }}>{row.highRisk}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {row.avgSat != null
                        ? <span style={{ color: satColor(row.avgSat), fontWeight: "700" }}>{row.avgSat}/5</span>
                        : <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px", color: row.avgOvertime > 40 ? "#dc2626" : "#334155", fontWeight: row.avgOvertime > 40 ? "700" : "400" }}>
                      {row.avgOvertime > 0 ? `${row.avgOvertime} hrs` : <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 4 — Top Performers */}
      <div
        className="fade-up d-6"
        style={{ background: "#ffffff", borderRadius: "16px", padding: "24px", border: "1px solid rgba(250,204,21,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "transform 0.25s ease, border-color 0.25s ease" }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(250,204,21,0.45)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(250,204,21,0.2)"; }}
      >
        <h3 style={{ color: "#0f172a", fontSize: "15px", fontWeight: "700", marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Award size={15} color="#d97706" /> Top Performers
        </h3>
        <p style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "18px" }}>Employees with highest performance ratings — retention priority</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
          {topPerformers.map((emp, i) => (
            <div key={i} className={`fade-in d-${i + 1}`}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: i < 3 ? "#fffbeb" : "#fafbff", border: `1px solid ${i < 3 ? "#fde68a" : "#f1f5f9"}`, borderRadius: "12px", transition: "background 0.15s" }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: i === 0 ? "linear-gradient(135deg,#f59e0b,#d97706)" : i === 1 ? "linear-gradient(135deg,#94a3b8,#64748b)" : i === 2 ? "linear-gradient(135deg,#b45309,#92400e)" : "#f1f5f9",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: "800", color: i < 3 ? "white" : "#64748b",
                flexShrink: 0,
                boxShadow: i < 3 ? "0 2px 10px rgba(0,0,0,0.15)" : "none",
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "#0f172a", fontSize: "13px", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.name}</p>
                <p style={{ color: "#94a3b8", fontSize: "11px" }}>{emp.department} · {emp.experience_years}y</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ color: "#059669", fontWeight: "800", fontSize: "14px" }}>{emp.performance_rating}/10</p>
                <p style={{ color: "#94a3b8", fontSize: "11px" }}>{formatCurrency(emp.salary, true)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
