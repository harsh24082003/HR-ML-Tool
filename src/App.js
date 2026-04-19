import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import AuthModal from "./components/AuthModal";
import Header from "./components/Header";
import UploadTab from "./components/UploadTab";
import DashboardTab from "./components/DashboardTab";
import PredictionsTab from "./components/PredictionsTab";
import AnalyticsTab from "./components/AnalyticsTab";
import { ToastContainer, toast } from "./components/Toast";
import { fetchPrediction } from "./hooks/usePredictions";
import { Upload, BarChart3, TrendingUp, Activity } from "lucide-react";

const INITIAL_USERS = [
  { email: "admin@prohr.com", password: "admin123", role: "admin", name: "Admin" },
  { email: "hr@prohr.com", password: "hr123", role: "hr", name: "HR User" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const REVENUE_MULTIPLIER = 1.2;

export default function ProHRDashboard() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [authMode, setAuthMode] = useState("login");
  const [activeTab, setActiveTab] = useState("upload");
  const [stats, setStats] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

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

    let totalBonuses = 0, totalDeductions = 0;

    const payroll = await Promise.all(
      cleanData.map(async (emp) => {
        const base = parseFloat(emp.salary || 0);
        const rating = Number(emp.performance_rating || 0);
        const leaves = Number(emp.unpaid_leaves || 0);
        const bonus = base * (rating / 100);
        const deduction = base * (leaves / 50);
        totalBonuses += bonus;
        totalDeductions += deduction;
        const finalPayable = Math.round(base + bonus - deduction);
        const { mlSalary, attritionRisk, attritionFactors } = await fetchPrediction(emp);
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
      avgTasksCompleted: Math.round(
        cleanData.reduce((s, e) => s + parseFloat(e.total_tasks_completed || e.tasks_completed || 0), 0) / total
      ),
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

  const handleFileUpload = useCallback((file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => analyzeData(results.data),
      error: (err) => toast.error("CSV parse error: " + err.message),
    });
  }, [analyzeData]);

  const handleLogout = () => {
    setUser(null);
    setStats(null);
    setPredictions(null);
    setActiveTab("upload");
    toast.info("Logged out successfully.");
  };

  if (!user) {
    return (
      <>
        <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" /><div className="bg-orb bg-orb-4" />
        <div className="bg-grid" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <AuthModal onAuthSuccess={(u) => { setUser(u); toast.success(`Welcome back, ${u.name}!`); }} users={users} setUsers={setUsers} mode={authMode} setMode={setAuthMode} />
        </div>
        <ToastContainer />
      </>
    );
  }

  const navTabs = [
    { id: "upload", label: "Upload CSV", icon: <Upload size={15} />, always: true },
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 size={15} />, always: false },
    { id: "predictions", label: "Predictions", icon: <TrendingUp size={15} />, always: false },
    { id: "analytics", label: "Analytics", icon: <Activity size={15} />, always: false },
  ];

  return (
    <>
      {/* Animated background */}
      <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" /><div className="bg-orb bg-orb-4" />
      <div className="bg-grid" />

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        <Header user={user} onLogout={handleLogout} />

        <div style={{ maxWidth: 1340, margin: "0 auto", padding: "24px 20px", background: "transparent" }}>
          {/* Nav tabs — refined pill navigation */}
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
                        ? {
                            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                            color: "white",
                            boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                          }
                        : enabled
                        ? {
                            background: "transparent",
                            color: "#475569",
                          }
                        : {
                            background: "transparent",
                            color: "#cbd5e1",
                            opacity: 0.5,
                          }),
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                    {active && (
                      <span className="nav-active-dot" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="fade-up" style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 20,
                padding: 48,
                display: "inline-block",
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
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
                {/* Subtle progress bar */}
                <div style={{ width: 200, height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden", margin: "0 auto" }}>
                  <div style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #2563eb, #7c3aed, #2563eb)",
                    backgroundSize: "200% 100%",
                    borderRadius: 2,
                    animation: "shimmer 1.5s infinite",
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          {!loading && (
            <div key={activeTab} className="tab-slide">
              {activeTab === "upload" && <UploadTab onUpload={handleFileUpload} stats={stats} loading={loading} />}
              {activeTab === "dashboard" && stats && predictions && <DashboardTab stats={stats} payroll={predictions.payroll} />}
              {activeTab === "predictions" && predictions && <PredictionsTab predictions={predictions} />}
              {activeTab === "analytics" && predictions && <AnalyticsTab payroll={predictions.payroll} />}
            </div>
          )}
        </div>
      </div>

      <ToastContainer />
    </>
  );
}
