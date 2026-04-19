import React, { useEffect, useRef } from "react";
import { X, User, TrendingUp, AlertTriangle, Star, Clock, Zap, Activity } from "lucide-react";
import { formatCurrency, getRiskLevel, getRatingColor } from "../utils/formatters";

// Max possible raw score per factor (for normalising 0–100%)
const FACTOR_META = [
  { key: "job_satisfaction",   label: "Low Job Satisfaction",  max: 32 },
  { key: "work_life_balance",  label: "Poor Work-Life Balance", max: 32 },
  { key: "overtime_hours",     label: "High Overtime",          max: 21 },
  { key: "unpaid_leaves",      label: "Unpaid Leaves",          max: 25 },
  { key: "late_login_count",   label: "Late Logins",            max: 22.5 },
  { key: "performance_rating", label: "Low Performance Rating", max: 24 },
  { key: "experience",         label: "Low Experience",         max: 10 },
  { key: "team_engagement",    label: "Low Team Engagement",    max: 28 },
];

const StatRow = ({ label, value, color, delay }) => (
  <div
    className={`fade-in ${delay || ""}`}
    style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "9px 0",
      borderBottom: "1px solid #f1f5f9",
      transition: "background 0.15s",
    }}
  >
    <span style={{ color: "#64748b", fontSize: "13px" }}>{label}</span>
    <span style={{ color: color || "#0f172a", fontWeight: "600", fontSize: "13px" }}>{value}</span>
  </div>
);

const SectionCard = ({ color, icon, title, children, delay }) => (
  <div
    className={`fade-up ${delay || ""}`}
    style={{
      background: "#f8fafc",
      borderRadius: "12px",
      padding: "16px",
      border: `1px solid rgba(${color},0.15)`,
      transition: "border-color 0.2s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = `rgba(${color},0.35)`; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = `rgba(${color},0.15)`; }}
  >
    <p style={{ fontSize: "11px", fontWeight: "700", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase", letterSpacing: "0.06em", color: `rgb(${color})` }}>
      {icon} {title}
    </p>
    {children}
  </div>
);

const AnimatedGauge = ({ value, max = 92, color }) => {
  const barRef = useRef(null);
  const pct = Math.min((value / max) * 100, 100);

  useEffect(() => {
    if (!barRef.current) return;
    barRef.current.style.width = "0%";
    const id = setTimeout(() => {
      if (barRef.current) barRef.current.style.width = `${pct}%`;
    }, 120);
    return () => clearTimeout(id);
  }, [pct]);

  return (
    <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
      <div
        ref={barRef}
        style={{
          height: "100%",
          background: `linear-gradient(to right, ${color}aa, ${color})`,
          borderRadius: 4,
          transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: `0 0 10px ${color}55`,
        }}
      />
    </div>
  );
};

const FactorBar = ({ label, value, max, index }) => {
  const barRef = useRef(null);
  const pct = Math.min((value / max) * 100, 100);
  const color = pct > 66 ? "#ef4444" : pct > 33 ? "#f59e0b" : "#22c55e";

  useEffect(() => {
    if (!barRef.current) return;
    barRef.current.style.width = "0%";
    const id = setTimeout(() => {
      if (barRef.current) barRef.current.style.width = `${pct}%`;
    }, 200 + index * 70);
    return () => clearTimeout(id);
  }, [pct, index]);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#475569" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 48, textAlign: "right" }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div style={{ height: 5, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
        <div
          ref={barRef}
          style={{
            height: "100%",
            background: `linear-gradient(to right, ${color}88, ${color})`,
            borderRadius: 3,
            transition: "width 0.65s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: `0 0 6px ${color}44`,
          }}
        />
      </div>
    </div>
  );
};

export default function EmployeeModal({ emp, onClose }) {
  if (!emp) return null;
  const risk = getRiskLevel(emp.attritionRisk || 0);
  const salary = parseFloat(emp.salary || 0);
  const mlSalary = parseFloat(emp.mlSalary || 0);
  const salaryDiff = mlSalary - salary;
  const perfRating = parseFloat(emp.performance_rating || 0);
  const hasFactors = emp.attritionFactors && Object.keys(emp.attritionFactors).length > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 600,
          background: "rgba(255,255,255,0.98)",
          backdropFilter: "blur(24px)",
          borderRadius: "20px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 40px 100px rgba(37,99,235,0.15)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1d4ed8, #7c3aed)",
          padding: "26px 24px",
          borderRadius: "20px 20px 0 0",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: "rgba(255,255,255,0.07)", borderRadius: "50%", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -20, left: 40, width: 80, height: 80, background: "rgba(255,255,255,0.04)", borderRadius: "50%", pointerEvents: "none" }} />

          <button
            onClick={onClose}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "7px", color: "white", display: "flex", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
          >
            <X size={18} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div className="float" style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              border: "2px solid rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}>
              <User size={26} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ color: "white", fontSize: "20px", fontWeight: "800" }}>{emp.name}</h2>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", marginTop: "2px" }}>{emp.employee_id} · {emp.department}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{
                background: risk.bg,
                border: `1px solid ${risk.color}`,
                color: risk.color,
                borderRadius: "20px",
                padding: "5px 14px",
                fontSize: "12px",
                fontWeight: "700",
                boxShadow: `0 0 12px ${risk.color}44`,
              }}>
                {risk.label} Risk
              </span>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginTop: "5px" }}>{emp.attritionRisk}% attrition probability</p>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px" }}>
          {/* Attrition gauge */}
          <div
            className="fade-up d-1"
            style={{
              background: "#f8fafc",
              borderRadius: "12px",
              padding: "16px 18px",
              marginBottom: "16px",
              border: `1px solid ${risk.color}33`,
              boxShadow: `0 0 20px ${risk.color}08`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: "#64748b", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertTriangle size={14} color={risk.color} /> Attrition Risk Score
              </span>
              <span style={{ color: risk.color, fontWeight: "800", fontSize: "18px" }}>{emp.attritionRisk}%</span>
            </div>
            <AnimatedGauge value={emp.attritionRisk} max={92} color={risk.color} />
            <p style={{ color: "#64748b", fontSize: "11px", marginTop: "8px" }}>{risk.label} likelihood of leaving within 6 months</p>
          </div>

          {/* Risk Factor Breakdown */}
          {hasFactors && (
            <div className="fade-up d-2" style={{ marginBottom: "16px" }}>
              <div style={{
                background: "#f8fafc",
                borderRadius: "12px",
                padding: "16px 18px",
                border: `1px solid rgba(239,68,68,0.15)`,
              }}>
                <p style={{ fontSize: "11px", fontWeight: "700", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase", letterSpacing: "0.06em", color: "#ef4444" }}>
                  <Activity size={12} /> Risk Factor Breakdown
                </p>
                {FACTOR_META.map((fm, i) => {
                  const val = emp.attritionFactors[fm.key] ?? 0;
                  return (
                    <FactorBar
                      key={fm.key}
                      label={fm.label}
                      value={val}
                      max={fm.max}
                      index={i}
                    />
                  );
                })}
                <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: 8 }}>
                  Each bar shows how much that factor contributes to this employee's attrition risk.
                </p>
              </div>
            </div>
          )}

          {/* Two-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            <SectionCard color="37,99,235" icon={<User size={12} />} title="Personal" delay="d-3">
              <StatRow label="Age" value={`${emp.age} yrs`} delay="d-1" />
              <StatRow label="Experience" value={`${emp.experience_years} years`} delay="d-2" />
              <StatRow label="Department" value={emp.department} delay="d-3" />
            </SectionCard>
            <SectionCard color="124,58,237" icon={<Star size={12} />} title="Performance" delay="d-4">
              <StatRow label="Rating" value={`${perfRating}/10`} color={getRatingColor(perfRating)} delay="d-1" />
              <StatRow label="Tasks Done" value={emp.total_tasks_completed || emp.tasks_completed || "—"} delay="d-2" />
              <StatRow label="Projects" value={emp.projects_handled || "—"} delay="d-3" />
            </SectionCard>
          </div>

          {/* Salary */}
          <SectionCard color="5,150,105" icon={<TrendingUp size={12} />} title="Compensation" delay="d-5">
            <StatRow label="Base Salary" value={formatCurrency(salary)} delay="d-1" />
            <StatRow label="Final Payable" value={formatCurrency(emp.finalPayable)} color="#2563eb" delay="d-2" />
            <StatRow label="ML Predicted" value={mlSalary > 0 ? formatCurrency(mlSalary) : "N/A (backend offline)"} color="#7c3aed" delay="d-3" />
            {mlSalary > 0 && (
              <div
                className="fade-in d-4"
                style={{
                  marginTop: "10px",
                  padding: "9px 12px",
                  background: salaryDiff > 0 ? "rgba(5,150,105,0.06)" : "rgba(220,38,38,0.06)",
                  border: `1px solid ${salaryDiff > 0 ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)"}`,
                  borderRadius: "8px",
                }}
              >
                <span style={{ color: salaryDiff > 0 ? "#059669" : "#dc2626", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Zap size={12} /> Predicted {salaryDiff > 0 ? "above" : "below"} current by {formatCurrency(Math.abs(salaryDiff))}
                </span>
              </div>
            )}
          </SectionCard>

          {/* Work Habits */}
          <div style={{ marginTop: "14px" }}>
            <SectionCard color="217,119,6" icon={<Clock size={12} />} title="Work Habits" delay="d-6">
              <StatRow label="Overtime Hours" value={`${emp.overtime_hours || 0} hrs`} color={emp.overtime_hours > 40 ? "#dc2626" : "#0f172a"} delay="d-1" />
              <StatRow label="Late Logins" value={emp.late_login_count || 0} color={emp.late_login_count > 8 ? "#d97706" : "#0f172a"} delay="d-2" />
              <StatRow label="Unpaid Leaves" value={emp.unpaid_leaves || 0} color={emp.unpaid_leaves > 5 ? "#dc2626" : "#0f172a"} delay="d-3" />
              <StatRow label="Job Satisfaction" value={`${emp.job_satisfaction || "—"}/5`} color={getRatingColor(emp.job_satisfaction || 0, 5)} delay="d-4" />
              <StatRow label="Work-Life Balance" value={`${emp.work_life_balance || "—"}/5`} color={getRatingColor(emp.work_life_balance || 0, 5)} delay="d-5" />
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
