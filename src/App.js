import React, { useState, useRef, useCallback, useEffect } from "react";
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
import ChatBot from "./components/ChatBot";

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
  const [showBotPopup, setShowBotPopup] = useState(false);

  useEffect(() => {
    if (!stats) return;
    setShowBotPopup(true);
    const t = setTimeout(() => setShowBotPopup(false), 7000);

    // TTS — fires with popup when data loads
    const greeting = `Hi! I am your ProHR Assistant. I have analyzed ${stats.totalEmployees} employees. Click the bot icon to explore insights about high risk, low risk employees, and more!`;
    const doSpeak = () => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(greeting);
      utter.rate = 0.9;
      utter.pitch = 1.05;
      utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const pick = voices.find((v) => v.lang.startsWith("en") && /female|zira|samantha|karen/i.test(v.name))
        || voices.find((v) => v.lang.startsWith("en"))
        || voices[0];
      if (pick) utter.voice = pick;
      window.speechSynthesis.speak(utter);
    };

    // voices load asynchronously in some browsers
    if (window.speechSynthesis.getVoices().length > 0) {
      setTimeout(doSpeak, 600);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        setTimeout(doSpeak, 300);
      };
    }

    return () => {
      clearTimeout(t);
      window.speechSynthesis.cancel();
    };
  }, [stats]);

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

  // Department pie chart data
  const deptMap = {};
  payrollData.forEach(emp => {
    const d = emp.department || "Unknown";
    deptMap[d] = (deptMap[d] || 0) + 1;
  });
  const deptPieData = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

  // Department avg attrition risk line chart
  const riskMap = {};
  payrollData.forEach(emp => {
    const d = emp.department || "Unknown";
    if (!riskMap[d]) riskMap[d] = { total: 0, count: 0 };
    riskMap[d].total += emp.attritionRisk || 0;
    riskMap[d].count += 1;
  });
  const riskLineData = Object.entries(riskMap)
    .map(([dept, v]) => ({ dept, avgRisk: Math.round(v.total / v.count) }))
    .sort((a, b) => b.avgRisk - a.avgRisk);

  const PIE_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];

  const exportToPDF = () => {
    const element = dashboardRef.current;
    if (!element) {
      toast.error("Dashboard not ready. Please wait.");
      return;
    }

    toast.info("Generating PDF, please wait...");

    html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#0f172a",
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.offsetWidth,
    })
      .then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("l", "mm", "a4");
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
        const x = (pdfW - canvas.width * ratio) / 2;
        pdf.addImage(imgData, "PNG", x, 0, canvas.width * ratio, canvas.height * ratio);
        pdf.save(`ProHR_Report_${selectedDepartment}.pdf`);
        toast.success("PDF exported successfully!");
      })
      .catch(() => {
        toast.error("PDF export failed. Try again.");
      });
  };

  const analyzeData = useCallback(async (data) => {
    setLoading(true);
    setLoadingMsg("Parsing employee records...");

    const allClean = data.filter((e) => e.employee_id && e.salary && !isNaN(parseFloat(e.salary)));

    if (allClean.length === 0) {
      setLoading(false);
      toast.error("No valid employee data found. Check CSV format.");
      return;
    }

    const cleanData = allClean.slice(0, 100);
    const total = cleanData.length;


    setLoadingMsg("Running ML predictions...");

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
          <div style={{ marginBottom: 28, display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
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
                <UploadTab onUpload={handleFileUpload} stats={stats} loading={loading} />
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

                  {/* Charts Row — Dept Pie + Risk Line */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>

                    {/* Department Pie Chart */}
                    <div style={styles.chartBox}>
                      <h3 style={styles.chartTitle}>Department Distribution</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={deptPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {deptPieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => [`${v} employees`, "Count"]} contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "white" }} />
                          <Legend
                            formatter={(value) => <span style={{ color: "#cbd5e1", fontSize: 12 }}>{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Attrition Risk Line Chart */}
                    <div style={styles.chartBox}>
                      <h3 style={styles.chartTitle}>Avg Attrition Risk by Department</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={riskLineData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="dept" stroke="#94a3b8" angle={-30} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                          <YAxis stroke="#94a3b8" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(v) => [`${v}%`, "Avg Risk"]}
                            contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "white" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="avgRisk"
                            stroke="#ef4444"
                            strokeWidth={2.5}
                            dot={{ fill: "#ef4444", r: 5, strokeWidth: 2, stroke: "#1e293b" }}
                            activeDot={{ r: 7, fill: "#f97316" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
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

        {/* Chat FAB — only after data uploaded */}
        {stats && (
          <>
            <style>{`
              @keyframes fabRingSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes fabOrbit {
                from { transform: rotate(0deg) translateX(34px) rotate(0deg); }
                to { transform: rotate(360deg) translateX(34px) rotate(-360deg); }
              }
              @keyframes fabGlow {
                0%, 100% { box-shadow: 0 0 20px 4px rgba(147,51,234,0.55); }
                50% { box-shadow: 0 0 34px 10px rgba(99,102,241,0.7); }
              }
              @keyframes eyeBlink {
                0%, 92%, 100% { transform: scaleY(1); }
                96% { transform: scaleY(0.1); }
              }
              @keyframes popupIn {
                from { opacity: 0; transform: translateX(30px) scale(0.92); }
                to { opacity: 1; transform: translateX(0) scale(1); }
              }
              @keyframes popupOut {
                from { opacity: 1; transform: translateX(0) scale(1); }
                to { opacity: 0; transform: translateX(30px) scale(0.92); }
              }
              @keyframes typeDots {
                0%,80%,100% { opacity: 0.2; transform: translateY(0); }
                40% { opacity: 1; transform: translateY(-3px); }
              }
              .chat-fab-btn:hover .fab-inner { transform: scale(1.08); }
              .chat-fab-btn:hover { filter: brightness(1.1); }
            `}</style>

            {/* Popup speech bubble */}
            {showBotPopup && !isChatOpen && (
              <div style={{
                position: "fixed", bottom: 108, right: 100,
                background: "linear-gradient(135deg, #1e1b4b, #2e1065)",
                border: "1px solid rgba(147,51,234,0.4)",
                borderRadius: "16px 16px 4px 16px",
                padding: "14px 18px",
                width: 230,
                boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(147,51,234,0.2)",
                zIndex: 1002,
                animation: `${showBotPopup ? "popupIn" : "popupOut"} 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards`,
              }}>
                {/* tail */}
                <div style={{
                  position: "absolute", bottom: -10, right: 18,
                  width: 0, height: 0,
                  borderLeft: "10px solid transparent",
                  borderRight: "0px solid transparent",
                  borderTop: "10px solid rgba(147,51,234,0.4)",
                }} />
                <div style={{
                  position: "absolute", bottom: -8, right: 19,
                  width: 0, height: 0,
                  borderLeft: "9px solid transparent",
                  borderRight: "0px solid transparent",
                  borderTop: "9px solid #2e1065",
                }} />

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "linear-gradient(135deg, #9333ea, #6366f1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, flexShrink: 0,
                  }}>🤖</div>
                  <span style={{ color: "#c4b5fd", fontWeight: 700, fontSize: 13 }}>ProHR Assistant</span>
                  <button
                    onClick={() => setShowBotPopup(false)}
                    style={{ marginLeft: "auto", background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
                  >✕</button>
                </div>

                <p style={{ color: "#e2e8f0", fontSize: 12.5, margin: 0, lineHeight: 1.6 }}>
                  👋 Hi! I've analyzed <strong style={{ color: "#a78bfa" }}>{stats.totalEmployees} employees</strong>.
                  <br />Ask me about risks, departments & more!
                </p>

                <div style={{ display: "flex", gap: 3, marginTop: 10, alignItems: "center" }}>
                  <span style={{ color: "#64748b", fontSize: 11 }}>Click the bot to start</span>
                  {[0,1,2].map(i => (
                    <span key={i} style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "#9333ea", display: "inline-block",
                      animation: `typeDots 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Animated FAB */}
            <div
              className="chat-fab-btn"
              onClick={() => { setIsChatOpen(!isChatOpen); setShowBotPopup(false); }}
              style={{
                position: "fixed", bottom: 28, right: 28,
                width: 68, height: 68,
                cursor: "pointer", zIndex: 1001,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {/* Spinning gradient ring */}
              {!isChatOpen && (
                <div style={{
                  position: "absolute", inset: -3,
                  borderRadius: "50%",
                  background: "conic-gradient(from 0deg, #9333ea, #6366f1, #06b6d4, #9333ea)",
                  animation: "fabRingSpin 3s linear infinite",
                  zIndex: 0,
                }} />
              )}

              {/* Glow + inner circle */}
              <div className="fab-inner" style={{
                position: "relative", zIndex: 1,
                width: 62, height: 62, borderRadius: "50%",
                background: isChatOpen
                  ? "linear-gradient(145deg, #4f46e5, #7e22ce)"
                  : "linear-gradient(145deg, #7e22ce, #4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "transform 0.2s ease",
                animation: !isChatOpen ? "fabGlow 2.5s ease-in-out infinite" : "none",
              }}>
                {isChatOpen ? (
                  /* Close X */
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M17 5L5 17M5 5l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                ) : (
                  /* Animated robot face */
                  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                    {/* antenna stem */}
                    <rect x="18" y="3" width="2" height="7" rx="1" fill="rgba(255,255,255,0.9)"/>
                    {/* antenna ball */}
                    <circle cx="19" cy="3" r="2.2" fill="white"/>
                    <circle cx="19" cy="3" r="1" fill="#a78bfa"/>
                    {/* head */}
                    <rect x="7" y="10" width="24" height="18" rx="6" fill="white" fillOpacity="0.95"/>
                    {/* left eye group */}
                    <g style={{transformOrigin:"13px 19px", animation:"eyeBlink 4s ease-in-out infinite"}}>
                      <circle cx="13" cy="19" r="3.5" fill="#7e22ce"/>
                      <circle cx="14.2" cy="17.8" r="1.2" fill="white"/>
                      <circle cx="13" cy="19" r="1" fill="#1e1b4b"/>
                    </g>
                    {/* right eye group */}
                    <g style={{transformOrigin:"25px 19px", animation:"eyeBlink 4s ease-in-out 0.1s infinite"}}>
                      <circle cx="25" cy="19" r="3.5" fill="#7e22ce"/>
                      <circle cx="26.2" cy="17.8" r="1.2" fill="white"/>
                      <circle cx="25" cy="19" r="1" fill="#1e1b4b"/>
                    </g>
                    {/* smile */}
                    <path d="M14 24.5 Q19 27.5 24 24.5" stroke="#7e22ce" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                    {/* left ear */}
                    <rect x="4" y="16" width="3.5" height="7" rx="1.75" fill="white" fillOpacity="0.8"/>
                    {/* right ear */}
                    <rect x="30.5" y="16" width="3.5" height="7" rx="1.75" fill="white" fillOpacity="0.8"/>
                  </svg>
                )}
              </div>

              {/* Orbiting dot */}
              {!isChatOpen && (
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  width: 8, height: 8, marginTop: -4, marginLeft: -4,
                  animation: "fabOrbit 3s linear infinite",
                  zIndex: 2, pointerEvents: "none",
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#22d3ee",
                    boxShadow: "0 0 6px 2px rgba(34,211,238,0.8)",
                  }} />
                </div>
              )}
            </div>

            <ChatBot
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              predictions={predictions}
              stats={stats}
              employees={employees}
            />
          </>
        )}
      </div>

      <ToastContainer />
    </>
  );
}