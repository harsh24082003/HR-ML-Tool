import React, { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Search, Download, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, TrendingUp, User, AlertTriangle, Briefcase, Clock } from "lucide-react";
import { formatCurrency, getRiskLevel, getRatingColor } from "../utils/formatters";
import EmployeeModal from "./EmployeeModal";

const ITEMS_PER_PAGE = 20;

const RiskBadge = ({ risk }) => {
  const level = getRiskLevel(risk);
  const isHigh = risk > 70;
  return (
    <span
      className={isHigh ? "risk-high" : risk > 40 ? "risk-medium" : ""}
      style={{
        background: level.bg,
        border: `1px solid ${level.color}`,
        color: level.color,
        borderRadius: "20px",
        padding: "3px 12px",
        fontSize: "11px",
        fontWeight: "700",
        whiteSpace: "nowrap",
        display: "inline-block",
        boxShadow: isHigh ? `0 0 10px ${level.color}44` : "none",
      }}
    >
      {risk}% · {level.label}
    </span>
  );
};

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <span style={{ color: "#94a3b8", marginLeft: 4, fontSize: "10px" }}>↕</span>;
  return sortDir === "asc"
    ? <ChevronUp size={13} style={{ display: "inline", marginLeft: 4, color: "#2563eb" }} />
    : <ChevronDown size={13} style={{ display: "inline", marginLeft: 4, color: "#2563eb" }} />;
};

const ChartPanel = ({ title, children, className }) => (
  <div
    className={`fade-up ${className || ""}`}
    style={{
      background: "#ffffff",
      borderRadius: "16px",
      padding: "24px",
      border: "1px solid #e2e8f0",
      marginBottom: "20px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      transition: "transform 0.25s ease, border-color 0.25s ease",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
  >
    <h3 style={{ color: "#0f172a", fontSize: "15px", fontWeight: "700", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
      <TrendingUp size={15} color="#2563eb" /> {title}
    </h3>
    {children}
  </div>
);

const HoverPreview = ({ emp }) => {
  const cardRef = React.useRef(null);

  React.useEffect(() => {
    const CARD_W = 268, CARD_H = 340, OFF = 18;
    const onMove = (e) => {
      if (!cardRef.current) return;
      const left = e.clientX + OFF + CARD_W > window.innerWidth  ? e.clientX - CARD_W - OFF : e.clientX + OFF;
      const top  = e.clientY + OFF + CARD_H > window.innerHeight ? e.clientY - CARD_H - OFF : e.clientY + OFF;
      cardRef.current.style.left = left + "px";
      cardRef.current.style.top  = top  + "px";
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  if (!emp) return null;
  const risk = getRiskLevel(emp.attritionRisk || 0);
  const salary = parseFloat(emp.salary || 0);
  const perf = parseFloat(emp.performance_rating || 0);

  const Row = ({ label, value, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 11, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: color || "#0f172a" }}>{value}</span>
    </div>
  );

  return (
    <div ref={cardRef} style={{
      position: "fixed",
      left: -9999,
      top: -9999,
      width: 260,
      background: "rgba(255,255,255,0.98)",
      backdropFilter: "blur(20px)",
      borderRadius: 16,
      border: "1px solid #e2e8f0",
      boxShadow: "0 20px 60px rgba(37,99,235,0.15)",
      zIndex: 999,
      overflow: "hidden",
      animation: "scaleIn 0.15s ease",
      pointerEvents: "none",
    }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User size={16} color="white" />
          </div>
          <div>
            <p style={{ color: "white", fontWeight: 800, fontSize: 13 }}>{emp.name}</p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{emp.employee_id} · {emp.department}</p>
          </div>
        </div>
        <span style={{ background: risk.bg, border: `1px solid ${risk.color}`, color: risk.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
          {emp.attritionRisk}% · {risk.label} Risk
        </span>
      </div>

      {/* Details */}
      <div style={{ padding: "10px 14px" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
          <Briefcase size={10} /> Compensation
        </p>
        <Row label="Base Salary" value={formatCurrency(salary)} />
        <Row label="Final Payable" value={formatCurrency(emp.finalPayable)} color="#2563eb" />
        {emp.mlSalary > 0 && <Row label="ML Predicted" value={formatCurrency(emp.mlSalary)} color="#7c3aed" />}

        <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "10px 0 6px", display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={10} /> Work Profile
        </p>
        <Row label="Performance" value={`${perf}/10`} color={getRatingColor(perf)} />
        <Row label="Experience" value={`${emp.experience_years} yrs`} />
        <Row label="Overtime" value={`${emp.overtime_hours || 0} hrs`} color={emp.overtime_hours > 40 ? "#ef4444" : undefined} />
        <Row label="Late Logins" value={emp.late_login_count || 0} color={emp.late_login_count > 8 ? "#f59e0b" : undefined} />
        <Row label="Unpaid Leaves" value={emp.unpaid_leaves || 0} color={emp.unpaid_leaves > 5 ? "#ef4444" : undefined} />
      </div>

      <div style={{ padding: "6px 14px 10px", borderTop: "1px solid #f1f5f9" }}>
        <p style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>Click row to see full profile</p>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
      <p style={{ color: "#64748b", fontSize: "12px", marginBottom: "6px" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: "13px", fontWeight: "600" }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function PredictionsTab({ predictions }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [sortField, setSortField] = useState("attritionRisk");
  const [sortDir, setSortDir] = useState("desc");
  const [hoveredEmp, setHoveredEmp] = useState(null);

  const departments = useMemo(
    () => ["All", ...new Set(predictions.payroll.map((e) => e.department).filter(Boolean))],
    [predictions.payroll]
  );

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    let data = predictions.payroll;
    if (selectedDept !== "All") data = data.filter((e) => e.department === selectedDept);
    if (searchTerm) data = data.filter((e) =>
      (e.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.employee_id || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    return [...data].sort((a, b) => {
      const va = parseFloat(a[sortField] || 0), vb = parseFloat(b[sortField] || 0);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [predictions.payroll, selectedDept, searchTerm, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const performanceData = predictions.payroll.slice(0, 30).map((p) => ({
    name: p.name?.split(" ")[0] || "?",
    tasks: Number(p.total_tasks_completed || p.tasks_completed || 0),
  }));

  const exportCSV = () => {
    const headers = ["ID", "Name", "Dept", "Age", "Experience", "Salary", "Final Payable", "ML Salary", "Attrition Risk"];
    const rows = filtered.map((e) => [
      e.employee_id, e.name, e.department, e.age,
      `${e.experience_years}y`, e.salary, e.finalPayable,
      e.mlSalary || 0, `${e.attritionRisk}%`,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "payroll_predictions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const thStyle = {
    padding: "13px 14px",
    color: "#2563eb",
    fontWeight: "700",
    fontSize: "11px",
    textAlign: "left",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    transition: "color 0.15s",
  };

  const COLS = [
    ["employee_id", "ID"], ["name", "Name"], ["age", "Age"], ["department", "Dept"],
    ["experience_years", "Exp"], ["salary", "Salary"], ["finalPayable", "Final Payable"],
    ["mlSalary", "ML Salary"], ["attritionRisk", "Attrition Risk"],
  ];

  return (
    <div className="fade-in">
      {/* Revenue Forecast */}
      <ChartPanel title="12-Month Revenue Forecast" className="d-1">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={predictions.revenueTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v) => formatCurrency(v, true)} contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px" }} />
            <Legend wrapperStyle={{ color: "#64748b", fontSize: "12px" }} />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 6, fill: "#2563eb" }} />
            <Line type="monotone" dataKey="payroll" name="Payroll" stroke="#dc2626" strokeWidth={2.5} dot={false} strokeDasharray="5 5" activeDot={{ r: 6, fill: "#dc2626" }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>

      {/* Tasks chart */}
      <ChartPanel title={`Tasks Completed — Top ${Math.min(performanceData.length, 30)} Employees`} className="d-2">
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: Math.max(performanceData.length * 60, 600) }}>
            <BarChart width={Math.max(performanceData.length * 60, 600)} height={260} data={performanceData} margin={{ bottom: 50, top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} angle={-40} textAnchor="end" interval={0} height={70} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px" }} />
              <defs>
                <linearGradient id="tasksGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <Bar dataKey="tasks" name="Tasks" fill="url(#tasksGrad)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </div>
        </div>
      </ChartPanel>

      {/* Table */}
      <div
        className="fade-up d-3"
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        {/* Controls */}
        <div style={{
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          borderBottom: "1px solid #e2e8f0",
          background: "#f8fafc",
        }}>
          <h3 style={{ color: "#0f172a", fontSize: "15px", fontWeight: "700", flex: 1, minWidth: 120 }}>Payroll Predictions</h3>
          <select
            value={selectedDept}
            onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
            style={{ padding: "8px 12px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#0f172a", fontSize: "13px" }}
          >
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
            <input
              placeholder="Search name or ID..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ padding: "8px 12px 8px 32px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#0f172a", fontSize: "13px", width: 200 }}
            />
          </div>
          <button
            onClick={exportCSV}
            className="btn"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", color: "#2563eb", fontSize: "13px", fontWeight: "600" }}
          >
            <Download size={14} /> Export CSV
          </button>
          <span style={{ color: "#64748b", fontSize: "12px" }}>{filtered.length} records</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {COLS.map(([field, label]) => (
                  <th key={field} style={thStyle} onClick={() => handleSort(field)}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#1d4ed8"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#2563eb"}
                  >
                    {label}<SortIcon field={field} sortField={sortField} sortDir={sortDir} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((emp, idx) => (
                <tr
                  key={idx}
                  className="table-row"
                  onClick={() => setSelectedEmp(emp)}
                  onMouseEnter={() => setHoveredEmp(emp)}
                  onMouseLeave={() => setHoveredEmp(null)}
                  style={{
                    background: hoveredEmp?.employee_id === emp.employee_id ? "#eff6ff" : idx % 2 === 0 ? "#fafbff" : "transparent",
                    cursor: "pointer",
                    borderBottom: "1px solid #f1f5f9",
                    transition: "background 0.1s",
                  }}
                >
                  <td style={{ padding: "12px 14px", color: "#2563eb", fontWeight: "600" }}>{emp.employee_id}</td>
                  <td style={{ padding: "12px 14px", color: "#0f172a", fontWeight: "500" }}>{emp.name}</td>
                  <td style={{ padding: "12px 14px", color: "#334155" }}>{emp.age}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "2px 8px", color: "#475569", fontSize: "12px" }}>{emp.department}</span>
                  </td>
                  <td style={{ padding: "12px 14px", color: "#334155" }}>{emp.experience_years}y</td>
                  <td style={{ padding: "12px 14px", color: "#0f172a" }}>{formatCurrency(parseFloat(emp.salary || 0))}</td>
                  <td style={{ padding: "12px 14px", color: "#2563eb", fontWeight: "600" }}>{formatCurrency(emp.finalPayable)}</td>
                  <td style={{ padding: "12px 14px", color: "#7c3aed" }}>{emp.mlSalary > 0 ? formatCurrency(emp.mlSalary) : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                  <td style={{ padding: "12px 14px" }}><RiskBadge risk={emp.attritionRisk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          borderTop: "1px solid #e2e8f0",
          background: "#f8fafc",
        }}>
          <span style={{ color: "#64748b", fontSize: "12px" }}>
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {[
              [<ChevronsLeft size={14} />, 1, currentPage === 1],
              [<ChevronLeft size={14} />, currentPage - 1, currentPage === 1],
              [<ChevronRight size={14} />, currentPage + 1, currentPage === totalPages],
              [<ChevronsRight size={14} />, totalPages, currentPage === totalPages],
            ].map(([icon, page, disabled], i) => (
              <button
                key={i}
                onClick={() => !disabled && setCurrentPage(page)}
                disabled={disabled}
                className="btn"
                style={{
                  padding: "6px 10px",
                  background: disabled ? "#f8fafc" : "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "7px",
                  color: disabled ? "#cbd5e1" : "#334155",
                  cursor: disabled ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {icon}
              </button>
            ))}
            <span style={{ color: "#64748b", fontSize: "12px", marginLeft: "4px" }}>Page {currentPage} / {totalPages}</span>
          </div>
        </div>
      </div>

      <HoverPreview emp={hoveredEmp} />
      {selectedEmp && <EmployeeModal emp={selectedEmp} onClose={() => setSelectedEmp(null)} />}
    </div>
  );
}
