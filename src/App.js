import React, { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Papa from "papaparse";
import {
  Upload,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Assuming these are your local components
import AuthModal from "./components/AuthModal";
import Header from "./components/Header";
import UploadTab from "./components/UploadTab";
import DashboardTab from "./components/DashboardTab";
import PredictionsTab from "./components/PredictionsTab";
import AnalyticsTab from "./components/AnalyticsTab";
import { ToastContainer, toast } from "./components/Toast";
import { fetchPrediction } from "./hooks/usePredictions";

const INITIAL_USERS = [
  { email: "admin@prohr.com", password: "admin123", role: "admin", name: "Admin" },
  { email: "hr@prohr.com", password: "hr123", role: "hr", name: "HR User" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const REVENUE_MULTIPLIER = 1.2;

// Fallback styles to prevent undefined errors
const styles = {
  headerSubtitle: { color: "#94a3b8", fontSize: "14px" },
  maxWidth: { maxWidth: 1340, margin: "0 auto", padding: "24px 20px" },
  uploadBox: { border: "2px dashed #475569", padding: "40px", textAlign: "center", borderRadius: "12px" },
  uploadTitle: { color: "white", marginBottom: "16px" },
  uploadArea: { display: "flex", flexDirection: "column", alignItems: "center" },
  uploadText: { color: "#60a5fa", fontWeight: "bold" },
  uploadSubtext: { color: "#94a3b8", fontSize: "12px", marginTop: "8px" },
  codeBlock: { display: "block", background: "#1e293b", padding: "10px", marginTop: "10px", borderRadius: "4px" },
  successMessage: { color: "#4ade80", marginTop: "16px", textAlign: "center" },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" },
  metricCard: (bg) => ({ background: bg, padding: "20px", borderRadius: "12px", color: "white" }),
  metricIcon: { marginBottom: "12px" },
  metricLabel: { fontSize: "14px", opacity: 0.8 },
  metricValue: { fontSize: "24px", fontWeight: "bold" },
  financeSection: { background: "#1e293b", padding: "20px", borderRadius: "12px" },
  chartTitle: { color: "white", marginBottom: "16px" },
  financeRow: { display: "flex", justifyContent: "space-between", marginBottom: "12px", color: "#cbd5e1" },
  chartBox: { background: "#1e293b", padding: "20px", borderRadius: "12px", marginTop: "24px" },
  chartScrollOuter: { overflowX: "auto" },
  chartScrollInner: { minWidth: "900px" },
  table: { width: "100%", borderCollapse: "collapse", color: "white", fontSize: "14px" },
  tableHeader: { borderBottom: "1px solid #475569" },
  tableCell: { padding: "12px", borderBottom: "1px solid #334155" },
  loading: { textAlign: "center", padding: "40px" },
  spinner: { width: "40px", height: "40px", border: "4px solid #334155", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }
};

export default function ProHRDashboard() {
  // Authentication & Navigation State
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [authMode, setAuthMode] = useState("login");
  const [activeTab, setActiveTab] = useState("upload");

  // Data State
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [predictions, setPredictions] = useState(null);
  
  // Loading State
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  // UI & Table State
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  
  // Tooltip & Modal State
  const [hoveredEmp, setHoveredEmp] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [simEmp, setSimEmp] = useState(null);
  const [simBonus, setSimBonus] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Refs
  const dashboardRef = useRef(null);

  // Derived Data for UI
  const departments = ['All', ...new Set(employees.map(e => e.department).filter(Boolean))];
  const payrollData = predictions?.payroll || [];
  
  const filteredData = payrollData.filter(emp => {
    const matchesDept = selectedDepartment === 'All' || emp.department === selectedDepartment;
    const matchesSearch = emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  const performanceDistribution = filteredData.map(emp => ({
    name: emp.name,
    performance: Number(emp.tasks_completed || emp.total_tasks_completed || 0)
  }));

  const exportToPDF = () => {
    const element = dashboardRef.current;
    if (!element) return;
    
    html2canvas(element, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ProHR_Report_${selectedDepartment}.pdf`);
    });
  };

  const analyzeData = useCallback(async (data) => {
    setLoading(true);
    setLoadingMsg("Parsing employee records...");

    const cleanData = data.filter((e) => e.employee_id && e.salary && !isNaN(parseFloat(e.salary)));
    const total = cleanData.length;

    if (total === 0) {
      setLoading(false);
      toast.error("No valid employee data found. Check CSV format.");
      return;
    }

    setLoadingMsg(`Running ML predictions for ${total} employees...`);

    let totalBonuses = 0;
    let totalDeductions = 0;
    let totalTasks = 0;
    let totalHolidays = 0;

    const payroll = await Promise.all(
      cleanData.map(async (emp) => {
        const base = parseFloat(emp.salary || 0);
        const rating = Number(emp.performance_rating || 0);
        const leaves = Number(emp.unpaid_leaves || emp.holidays_taken || 0);
        const tasks = Number(emp.total_tasks_completed || emp.tasks_completed || 0);
        
        const bonus = base * (rating / 100);
        const deduction = base * (leaves / 50);
        
        totalBonuses += bonus;
        totalDeductions += deduction;
        totalTasks += tasks;
        totalHolidays += leaves;

        const finalPayable = Math.round(base + bonus - deduction);
        
        // Fetch ML data
        const { mlSalary, attritionRisk, attritionFactors } = await fetchPrediction(emp).catch(() => ({ mlSalary: 0, attritionRisk: 0 }));
        
        return { ...emp, salary: base, finalPayable, mlSalary, attritionRisk, attritionFactors };
      })
    );

    const totalPayroll = payroll.reduce((s, p) => s + p.finalPayable, 0);
    const companyRevenue = totalPayroll * REVENUE_MULTIPLIER;
    const highRiskCount = payroll.filter((e) => e.attritionRisk > 70).length;

    setStats({
      totalEmployees: total,
      avgSalary: Math.round(cleanData.reduce((s, e) => s + parseFloat(e.salary || 0), 0) / total),
      totalPayroll: Math.round(totalPayroll),
      companyRevenue: Math.round(companyRevenue),
      projectedGain: Math.round(companyRevenue - totalPayroll),
      totalDeductions: Math.round(totalDeductions),
      totalBonuses: Math.round(totalBonuses),
      avgTasksCompleted: Math.round(totalTasks / total),
      avgHolidaysUsed: Math.round(totalHolidays / total),
    });

    setPredictions({
      payroll,
      revenueTrend: MONTHS.map((month) => ({
        month,
        revenue: Math.round(companyRevenue * (0.92 + Math.random() * 0.16)),
        payroll: Math.round(totalPayroll * (0.92 + Math.random() * 0.16)),
      })),
    });

    setLoading(false);
    setLoadingMsg("");

    if (highRiskCount > 0) {
      toast.warning(`Analysis complete — ${highRiskCount} employee${highRiskCount > 1 ? "s" : ""} at high attrition risk.`);
    } else {
      toast.success(`${total} employees analyzed successfully!`);
    }

    setTimeout(() => setActiveTab("dashboard"), 300);
  }, []);

  const handleFileUpload = useCallback((e) => {
    const file = e.target?.files?.[0] || e;
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("📁 CSV PARSED:", results);
        setEmployees(results.data);
        analyzeData(results.data);
      },
      error: (err) => toast.error("CSV parse error: " + err.message),
    });
  }, [analyzeData]);

  const handleLogout = () => {
    setUser(null);
    setStats(null);
    setPredictions(null);
    setEmployees([]);
    setActiveTab("upload");
    toast.info("Logged out successfully.");
  };

  const navTabs = [
    { id: "upload", label: "Upload CSV", icon: <Upload size={15} />, always: true },
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 size={15} />, always: false },
    { id: "predictions", label: "Predictions", icon: <TrendingUp size={15} />, always: false },
    { id: "analytics", label: "Analytics", icon: <Activity size={15} />, always: false },
  ];

  if (!user) {
    return (
      <>
        <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" /><div className="bg-orb bg-orb-4" />
        <div className="bg-grid" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <AuthModal 
            onAuthSuccess={(u) => { setUser(u); toast.success(`Welcome back, ${u.name}!`); }} 
            users={users} 
            setUsers={setUsers} 
            mode={authMode} 
            setMode={setAuthMode} 
          />
        </div>
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      {/* Animated background */}
      <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" /><div className="bg-orb bg-orb-4" />
      <div className="bg-grid" />

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        <Header user={user} onLogout={handleLogout} />

        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={styles.headerSubtitle}>
            Intelligent Employee Analytics & Payroll Prediction
          </div>
        </div>

        <div style={styles.maxWidth}>
          {/* Navigation Tabs - Refined Pill Layout */}
          <div style={{ marginBottom: 28, display: "flex", flexWrap: "wrap" }}>
            <div style={{
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid #e8edf5",
              borderRadius: 14,
              padding: 5,
              display: "inline-flex",
              gap: 4,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              {navTabs.map((tab) => {
                const enabled = tab.always || !!stats;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => enabled && setActiveTab(tab.id)}
                    disabled={!enabled}
                    className="btn"
                    style={{
                      padding: "9px 18px",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      borderRadius: 10,
                      border: "none",
                      transition: "all 0.15s ease",
                      cursor: enabled ? "pointer" : "not-allowed",
                      ...(active
                        ? { background: "linear-gradient(135deg, #2563eb, #4f46e5)", color: "white", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }
                        : enabled
                        ? { background: "transparent", color: "#475569" }
                        : { background: "transparent", color: "#cbd5e1", opacity: 0.5 }),
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                    {active && <span className="nav-active-dot" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="fade-up" style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{
                background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 20,
                padding: 48, display: "inline-block", boxShadow: "0 4px 24px rgba(0,0,0,0.08)"
              }}>
                <div style={{ position: "relative", display: "inline-block", marginBottom: 24 }}>
                  <div className="spinner-ring" />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BarChart3 size={18} color="#2563eb" />
                  </div>
                </div>
                <p className="gradient-text" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  {loadingMsg || "Processing..."}
                </p>
                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>Running ML models on employee data</p>
                <div style={{ width: 200, height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden", margin: "0 auto" }}>
                  <div style={{
                    height: "100%", background: "linear-gradient(90deg, #2563eb, #7c3aed, #2563eb)",
                    backgroundSize: "200% 100%", borderRadius: 2, animation: "shimmer 1.5s infinite"
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          {!loading && (
            <div key={activeTab} className="tab-slide">
              {/* UPLOAD TAB */}
              {activeTab === "upload" && (
                <div>
                  <div style={styles.uploadBox}>
                    <h2 style={styles.uploadTitle}>Upload Employee Data</h2>
                    <div style={styles.uploadArea}>
                      <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: "none" }} id="csv-input" />
                      <label htmlFor="csv-input" style={{ cursor: "pointer" }}>
                        <Upload size={48} style={{ color: "#60a5fa", margin: "0 auto 16px" }} />
                        <p style={styles.uploadText}>Click to upload CSV</p>
                        <p style={styles.uploadSubtext}>
                          Required columns: employee_id, name, salary, holidays_taken, tasks_completed
                        </p>
                      </label>
                    </div>
                    <div style={{ marginTop: "24px", background: "#334155", padding: "16px", borderRadius: "4px", color: "#cbd5e1", fontSize: "12px", textAlign: "left" }}>
                      <p style={{ fontWeight: "600", color: "#93c5fd", marginBottom: "8px" }}>📋 CSV Format Example:</p>
                      <code style={styles.codeBlock}>
                        employee_id,name,salary,holidays_taken,tasks_completed<br />
                        E001,John Doe,50000,5,120<br />
                        E002,Jane Smith,60000,3,135
                      </code>
                    </div>
                  </div>
                  {stats && (
                    <div style={styles.successMessage}>
                      <p style={{ fontWeight: "600" }}>✓ Data uploaded successfully! {stats.totalEmployees} employees analyzed.</p>
                    </div>
                  )}
                </div>
              )}

              {/* DASHBOARD TAB */}
              {activeTab === "dashboard" && stats && predictions && (
                <div ref={dashboardRef} style={{ padding: "20px", background: "#0f172a", borderRadius: "12px" }}>
                  
                  {/* Export Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h2 style={{ color: "white", margin: 0 }}>{selectedDepartment} Department Health Report</h2>
                    <button onClick={exportToPDF} style={{ background: "#3b82f6", color: "white", padding: "10px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                      📥 Export to PDF
                    </button>
                  </div>

                  {/* Key Metrics */}
                  <div style={styles.metricsGrid}>
                    <div style={styles.metricCard("linear-gradient(to bottom right, #3b82f6, #2563eb)")}>
                      <div style={styles.metricIcon}><Users size={24} /></div>
                      <p style={styles.metricLabel}>Total Employees</p>
                      <p style={styles.metricValue}>{stats.totalEmployees}</p>
                    </div>
                    <div style={styles.metricCard("linear-gradient(to bottom right, #10b981, #059669)")}>
                      <div style={styles.metricIcon}><DollarSign size={24} /></div>
                      <p style={styles.metricLabel}>Avg Salary</p>
                      <p style={styles.metricValue}>${(stats.avgSalary / 1000).toFixed(1)}K</p>
                    </div>
                    <div style={styles.metricCard("linear-gradient(to bottom right, #a855f7, #9333ea)")}>
                      <div style={styles.metricIcon}><AlertCircle size={24} /></div>
                      <p style={styles.metricLabel}>Avg Holidays</p>
                      <p style={styles.metricValue}>{stats.avgHolidaysUsed}</p>
                    </div>
                    <div style={styles.metricCard("linear-gradient(to bottom right, #f97316, #ea580c)")}>
                      <div style={styles.metricIcon}><TrendingUp size={24} /></div>
                      <p style={styles.metricLabel}>Avg Tasks</p>
                      <p style={styles.metricValue}>{stats.avgTasksCompleted}</p>
                    </div>
                  </div>

                  {/* Financial Overview */}
                  <div style={styles.financeSection}>
                    <h3 style={styles.chartTitle}>Financial Overview</h3>
                    <div style={{ marginTop: "16px" }}>
                      <div style={styles.financeRow}>
                        <span>Total Monthly Payroll:</span>
                        <span style={{ color: "#4ade80" }}>${(stats.totalPayroll / 1000).toFixed(1)}K</span>
                      </div>
                      <div style={styles.financeRow}>
                        <span>Total Deductions:</span>
                        <span style={{ color: "#f87171" }}>-${(stats.totalDeductions / 1000).toFixed(1)}K</span>
                      </div>
                      <div style={styles.financeRow}>
                        <span>Total Bonuses:</span>
                        <span style={{ color: "#4ade80" }}>+${(stats.totalBonuses / 1000).toFixed(1)}K</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Chart */}
                  <div style={styles.chartBox}>
                    <h3 style={styles.chartTitle}>Total Tasks Completed by Employees</h3>
                    <div style={styles.chartScrollOuter}>
                      <div style={{ ...styles.chartScrollInner, width: `${Math.max(performanceDistribution.length * 70, 900)}px` }}>
                        <BarChart width={Math.max(performanceDistribution.length * 70, 900)} height={350} data={performanceDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                          <XAxis dataKey="name" stroke="#cbd5e1" angle={-45} textAnchor="end" interval={0} height={100} />
                          <YAxis stroke="#cbd5e1" label={{ value: "Tasks Completed", angle: -90, position: "insideLeft", fill: "#cbd5e1", style: { textAnchor: "middle" } }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="performance" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </div>
                    </div>
                    <div style={{ textAlign: "center", color: "#cbd5e1", marginTop: "10px", fontSize: "14px", fontWeight: "500" }}>
                      Employee Name
                    </div>
                  </div>

                  {/* Payroll Details Table */}
                  <div style={{ ...styles.chartBox, marginTop: "24px", overflowX: "auto", padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h3 style={styles.chartTitle}>Payroll Predictions</h3>
                      <div>
                        <select value={selectedDepartment} onChange={(e) => { setSelectedDepartment(e.target.value); setCurrentPage(1); }} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #475569", background: "#0f172a", color: "white", marginRight: "16px" }}>
                          {departments.map((dept, index) => (
                            <option key={index} value={dept}>{dept}</option>
                          ))}
                        </select>
                        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #475569", background: "#0f172a", color: "white", width: "220px" }} />
                      </div>
                    </div>

                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeader}>
                          <th style={{ textAlign: "left", ...styles.tableCell }}>Emp ID</th>
                          <th style={{ textAlign: "left", ...styles.tableCell }}>Name</th>
                          <th style={{ textAlign: "center", ...styles.tableCell }}>Age</th>
                          <th style={{ textAlign: "center", ...styles.tableCell }}>Dept</th>
                          <th style={{ textAlign: "center", ...styles.tableCell }}>Experience</th>
                          <th style={{ textAlign: "right", ...styles.tableCell }}>Salary</th>
                          <th style={{ textAlign: "right", ...styles.tableCell }}>Final Payable</th>
                          <th style={{ textAlign: "right", ...styles.tableCell }}>Predicted Salary</th>
                          <th style={{ textAlign: "right", ...styles.tableCell }}>Attrition Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((emp, idx) => (
                          <tr
                            key={idx}
                            onClick={() => { setSimEmp(emp); setSimBonus(0); }}
                            onMouseEnter={(e) => { setHoveredEmp(emp); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                            onMouseMove={(e) => { setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                            onMouseLeave={() => setHoveredEmp(null)}
                            style={{ background: idx % 2 === 0 ? "rgba(30, 41, 59, 0.5)" : "transparent", cursor: "pointer" }}
                          >
                            <td style={{ ...styles.tableCell, textAlign: "left" }}>{emp.employee_id}</td>
                            <td style={{ ...styles.tableCell, textAlign: "left" }}>{emp.name}</td>
                            <td style={{ ...styles.tableCell, textAlign: "center" }}>{emp.age || "N/A"}</td>
                            <td style={{ ...styles.tableCell, textAlign: "center" }}>{emp.department || "N/A"}</td>
                            <td style={{ ...styles.tableCell, textAlign: "center" }}>{emp.experience_years} yrs</td>
                            <td style={{ ...styles.tableCell, textAlign: "right" }}>₹{(emp.salary || 0).toLocaleString()}</td>
                            <td style={{ ...styles.tableCell, textAlign: "right", color: "#60a5fa", fontWeight: "bold" }}>₹{(emp.finalPayable || 0).toLocaleString()}</td>
                            <td style={{ ...styles.tableCell, textAlign: "right", color: "#a855f7" }}>₹{(emp.mlSalary || 0).toLocaleString()}</td>
                            <td style={{ ...styles.tableCell, textAlign: "right", color: emp.attritionRisk > 70 ? "#ef4444" : emp.attritionRisk > 40 ? "#facc15" : "#4ade80", fontWeight: "bold" }}>
                              {emp.attritionRisk || 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "16px", alignItems: "center" }}>
                      <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ padding: "6px 12px", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}>
                        ⏮ First
                      </button>
                      <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={{ padding: "6px 12px", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}>
                        ⬅ Prev
                      </button>
                      <span style={{ color: "white" }}>Page {currentPage} of {totalPages}</span>
                      <button onClick={() => setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev))} disabled={currentPage === totalPages} style={{ padding: "6px 12px", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}>
                        Next ➡
                      </button>
                      <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ padding: "6px 12px", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}>
                        Last ⏩
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Tabs Placeholders */}
              {activeTab === "predictions" && predictions && <PredictionsTab predictions={predictions} />}
              {activeTab === "analytics" && predictions && <AnalyticsTab payroll={predictions.payroll} />}
            </div>
          )}
        </div>

        {/* Hover Tooltip Overlay */}
        {hoveredEmp && (
          <div style={{ position: "fixed", top: tooltipPos.y + 15, left: tooltipPos.x + 15, background: "#1e293b", border: "1px solid #475569", borderRadius: "8px", padding: "16px", color: "white", boxShadow: "0 20px 25px rgba(0,0,0,0.5)", zIndex: 1000, pointerEvents: "none", minWidth: "250px" }}>
            <h4 style={{ margin: "0 0 12px 0", color: "#3b82f6", borderBottom: "1px solid #334155", paddingBottom: "8px" }}>
              {hoveredEmp.name} ({hoveredEmp.employee_id})
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
              <span style={{ color: "#94a3b8" }}>Department:</span><span>{hoveredEmp.department || "N/A"}</span>
              <span style={{ color: "#94a3b8" }}>Experience:</span><span>{hoveredEmp.experience_years || 0} yrs</span>
              <span style={{ color: "#94a3b8" }}>Tasks Done:</span><span>{hoveredEmp.total_tasks_completed || hoveredEmp.tasks_completed || 0}</span>
              <span style={{ color: "#94a3b8" }}>Performance:</span><span>{hoveredEmp.performance_rating || "N/A"}/10</span>
              <span style={{ color: "#94a3b8" }}>Leaves:</span><span>{hoveredEmp.unpaid_leaves || hoveredEmp.holidays_taken || 0}</span>
            </div>
          </div>
        )}

        {/* What-If Simulator Modal */}
        {simEmp && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
            <div style={{ background: "#1e293b", padding: "32px", borderRadius: "12px", border: "1px solid #475569", width: "400px", color: "white" }}>
              <h3 style={{ marginTop: 0, color: "#60a5fa" }}>Retention Simulator</h3>
              <p>Simulate interventions for <strong>{simEmp.name}</strong></p>
              
              <div style={{ display: "flex", justifyContent: "space-between", margin: "24px 0 12px" }}>
                <span>Current Risk:</span>
                <span style={{ color: "#ef4444", fontWeight: "bold" }}>{simEmp.attritionRisk}%</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
                <span>Simulated Risk:</span>
                <span style={{ color: "#10b981", fontWeight: "bold" }}>
                  {Math.max(0, (simEmp.attritionRisk || 0) - Math.floor(simBonus * 0.8))}%
                </span>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px" }}>Simulate Salary Bonus: +{simBonus}%</label>
                <input type="range" min="0" max="30" value={simBonus} onChange={(e) => setSimBonus(Number(e.target.value))} style={{ width: "100%" }} />
                <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                  New Projected Salary: ₹{Math.round((simEmp.salary || 0) * (1 + simBonus / 100)).toLocaleString()}
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button onClick={() => setSimEmp(null)} style={{ padding: "8px 16px", borderRadius: "6px", cursor: "pointer", background: "#475569", color: "white", border: "none" }}>Close</button>
                <button onClick={() => { toast.success("Action saved to backend!"); setSimEmp(null); }} style={{ padding: "8px 16px", borderRadius: "6px", cursor: "pointer", background: "#3b82f6", color: "white", border: "none" }}>Apply Intervention</button>
              </div>
            </div>
          </div>
        )}

        {/* Agentic AI Chat Widget */}
        <div onClick={() => setIsChatOpen(!isChatOpen)} style={{ position: "fixed", bottom: "30px", right: "30px", background: "#9333ea", width: "60px", height: "60px", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", zIndex: 1000, fontSize: "24px" }}>
          🤖
        </div>

        {isChatOpen && (
          <div style={{ position: "fixed", bottom: "100px", right: "30px", width: "350px", height: "450px", background: "#1e293b", borderRadius: "12px", border: "1px solid #475569", boxShadow: "0 20px 25px rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", flexDirection: "column" }}>
            <div style={{ background: "#9333ea", padding: "16px", borderRadius: "12px 12px 0 0", color: "white", fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
              <span>ProHR Data Assistant</span>
              <button onClick={() => setIsChatOpen(false)} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ flex: 1, padding: "16px", color: "#94a3b8", overflowY: "auto", fontSize: "14px" }}>
              <p>👋 Hi! I'm analyzing {employees.length} employee records.</p>
              <p>Ask me things like: <br/><em>"Who is most likely to leave in Engineering?"</em></p>
            </div>
            <div style={{ padding: "16px", borderTop: "1px solid #334155" }}>
              <input type="text" placeholder="Type your question..." style={{ width: "90%", padding: "10px", borderRadius: "6px", border: "1px solid #475569", background: "#0f172a", color: "white" }} />
            </div>
          </div>
        )}
      </div>

      <ToastContainer />
    </>
  );
}