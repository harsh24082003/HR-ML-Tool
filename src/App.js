import React, { useState } from "react";
import {
  Upload,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
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
import Papa from "papaparse";

export default function ProHRDashboard() {
  const [employees, setEmployees] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'signup'
  const [users, setUsers] = useState([
    {
      email: "admin@prohr.com",
      password: "admin123",
      role: "admin",
      name: "Admin",
    },
    { email: "hr@prohr.com", password: "hr123", role: "hr", name: "HR User" },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("📁 CSV PARSED:", results); 
        setEmployees(results.data);
        analyzeData(results.data);
      },
      error: (error) => {
        alert("Error parsing CSV: " + error.message);
      },
    });
  };

  

  // =====================
  // ATTRITION RISK MODEL
  // =====================
  // Returns value between 0–100 (%)
  function calculateAttritionRisk(emp, avgTasks) {
    const holidays = parseFloat(emp.holidays_taken || 0);
    const tasks = parseFloat(emp.tasks_completed || 0);

    // Normalize factors
    const holidayFactor = Math.min(holidays / 10, 1); // higher holidays → higher risk
    const performanceFactor = Math.min(tasks / avgTasks, 1); // lower performance → higher risk

    // Attrition score (weighted)
    const riskScore =
      (holidayFactor * 0.6 + (1 - performanceFactor) * 0.4) * 100;

    return Math.round(riskScore);
  }

  async function getPrediction(emp) {
  try {
    const salaryRes = await fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experience_years: Number(emp.experience_years || 0),
        total_tasks_completed: Number(emp.total_tasks_completed || 0),
        performance_rating: Number(emp.performance_rating || 0),
        projects_handled: Number(emp.projects_handled || 0),
        unpaid_leaves: Number(emp.unpaid_leaves || 0),
        late_login_count: Number(emp.late_login_count || 0),
      }),
    });

    const salaryData = await salaryRes.json();

    const attritionRes = await fetch("http://127.0.0.1:5000/predict-attrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        age: Number(emp.age || 0),
        experience_years: Number(emp.experience_years || 0),
        total_tasks_completed: Number(emp.total_tasks_completed || 0),
        performance_rating: Number(emp.performance_rating || 0),
        unpaid_leaves: Number(emp.unpaid_leaves || 0),
        overtime_hours: Number(emp.overtime_hours || 0),
        late_login_count: Number(emp.late_login_count || 0),
        job_satisfaction: Number(emp.job_satisfaction || 0),
        work_life_balance: Number(emp.work_life_balance || 0),
        team_engagement_score: Number(emp.team_engagement_score || 75),
      }),
    });

    const attritionData = await attritionRes.json();

    return {
      mlSalary: salaryData.predicted_salary || 0,
      attritionRisk: attritionData.attrition_risk || 0,
    };
  } catch (error) {
    console.error("ML Error:", error);
    return { mlSalary: 0, attritionRisk: 0 };
  }
}
  const analyzeData = async (data) => {
    setLoading(true);
    const REVENUE_MULTIPLIER = 1.2; // can tweak later

    let totalBonuses = 0;
    let totalDeductions = 0;

    // Clean data
    const cleanData = data.filter(
  (emp) =>
  emp.employee_id &&
  emp.salary &&
  !isNaN(parseFloat(emp.salary))
);
const limitedData = cleanData.slice(0, 50);  // 🔥 LIMIT TO 50 ROWS
    // Calculate statistics
    const totalEmployees = cleanData.length;
    const avgSalary =
      cleanData.reduce((sum, e) => sum + parseFloat(e.salary || 0), 0) /
      totalEmployees;
    const avgHolidaysUsed =
      cleanData.reduce((sum, e) => sum + parseFloat(e.holidays_taken || 0), 0) /
      totalEmployees;
    const avgTasksCompleted =
      cleanData.reduce(
        (sum, e) => sum + parseFloat(e.tasks_completed || 0),
        0,
      ) / totalEmployees;

    // Simple ML prediction logic
    const predictedPayroll = await Promise.all(
  limitedData.map(async (emp) => {
    const baseSalary = parseFloat(emp.salary || 0);

    const rating = Number(emp.performance_rating || 0);
    const leaves = Number(emp.unpaid_leaves || 0);

    const bonus = baseSalary * (rating / 10);
    const deduction = baseSalary * (leaves / 50);

    totalBonuses += bonus;
    totalDeductions += deduction;

    const finalPayable = Math.round(baseSalary + bonus - deduction);

    const prediction = await getPrediction(emp);
    const mlSalary = prediction.mlSalary;
    const attritionRisk = prediction.attritionRisk;

    return {
      ...emp,
      finalPayable,
      mlSalary,
      attritionRisk,
    };
  })
);

    const totalPayroll = predictedPayroll.reduce(
      (sum, p) => sum + p.finalPayable,
      0,
    );
    const companyRevenue = totalPayroll * REVENUE_MULTIPLIER;
    const projectedGain = companyRevenue - totalPayroll;

    // Revenue trend (next 12 months)
    const revenueTrend = Array.from({ length: 12 }, (_, i) => ({
      month: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ][i],
      revenue: Math.round(companyRevenue * (0.95 + Math.random() * 0.15)),
      payroll: Math.round(totalPayroll * (0.95 + Math.random() * 0.15)),
    }));

    setStats({
  totalEmployees,
  avgSalary: Math.round(avgSalary),
  avgHolidaysUsed: Math.round(avgHolidaysUsed * 10) / 10,
  avgTasksCompleted: Math.round(avgTasksCompleted),
  totalPayroll: Math.round(totalPayroll),
  companyRevenue: Math.round(companyRevenue),
  projectedGain: Math.round(projectedGain),
  totalDeductions: Math.round(totalDeductions),
  totalBonuses: Math.round(totalBonuses),
});

    setPredictions({
      payroll: predictedPayroll,
      revenueTrend,
    });

    setLoading(false);

    // Auto-navigate to dashboard after successful analysis
    setTimeout(() => {
      setActiveTab("dashboard");
    }, 500);
  };

  const performanceDistribution =
  predictions?.payroll.map((p) => ({
    name: p.name || "Unknown",
    performance: Number(p.total_tasks_completed || p.tasks_completed || 0),
  })) || [];

  const deductionVsBonus = stats
    ? [
        { name: "Deductions", value: stats.totalDeductions },
        { name: "Bonuses", value: stats.totalBonuses },
      ]
    : [];

  const COLORS = ["#ef4444", "#10b981"];

  const filteredPayroll =
    predictions?.payroll.filter((emp) => {
      return (
        (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.employee_id || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }) || [];

  const paginatedData = filteredPayroll.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const totalPages = Math.ceil(filteredPayroll.length / itemsPerPage);

  const styles = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)",
      fontFamily: "system-ui, -apple-system, sans-serif",
    },
    header: {
      background: "linear-gradient(to right, #2563eb, #9333ea)",
      color: "white",
      padding: "32px 24px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
      marginBottom: "24px",
    },
    headerTitle: {
      fontSize: "32px",
      fontWeight: "bold",
      marginBottom: "8px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    headerSubtitle: {
      color: "#dbeafe",
      fontSize: "14px",
    },
    maxWidth: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: "24px",
    },
    tabContainer: {
      display: "flex",
      gap: "16px",
      marginBottom: "24px",
      flexWrap: "wrap",
    },
    tabButton: (isActive) => ({
      padding: "8px 24px",
      borderRadius: "8px",
      fontWeight: "600",
      border: "none",
      cursor: isActive ? "pointer" : "not-allowed",
      transition: "all 0.3s",
      background: isActive ? "#2563eb" : "#475569",
      color: "white",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      opacity: isActive ? 1 : 0.5,
    }),
    uploadBox: {
      background: "#1e293b",
      borderRadius: "8px",
      padding: "32px",
      border: "1px solid #334155",
      boxShadow: "0 20px 25px rgba(0,0,0,0.3)",
    },
    uploadTitle: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "white",
      marginBottom: "24px",
    },
    uploadArea: {
      border: "2px dashed #475569",
      borderRadius: "8px",
      padding: "32px",
      textAlign: "center",
      cursor: "pointer",
      transition: "all 0.3s",
      background: "rgba(15, 23, 42, 0.5)",
    },
    uploadText: {
      color: "white",
      fontSize: "18px",
      fontWeight: "600",
      marginTop: "16px",
    },
    uploadSubtext: {
      color: "#94a3b8",
      fontSize: "12px",
      marginTop: "8px",
    },
    codeBlock: {
      background: "#0f172a",
      padding: "12px",
      borderRadius: "4px",
      marginTop: "8px",
      overflow: "auto",
      color: "#cbd5e1",
      fontSize: "12px",
      fontFamily: "monospace",
    },
    successMessage: {
      marginTop: "24px",
      background: "#064e3b",
      border: "1px solid #059669",
      borderRadius: "8px",
      padding: "16px",
      color: "#86efac",
    },
    metricsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "16px",
      marginBottom: "24px",
    },
    metricCard: (gradient) => ({
      background: gradient,
      borderRadius: "8px",
      padding: "24px",
      color: "white",
      boxShadow: "0 10px 15px rgba(0,0,0,0.2)",
    }),
    metricIcon: {
      marginBottom: "8px",
    },
    metricLabel: {
      color: "#cbd5e1",
      fontSize: "12px",
    },
    metricValue: {
      fontSize: "32px",
      fontWeight: "bold",
    },
    chartsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
      gap: "24px",
      marginBottom: "24px",
    },
    chartBox: {
      background: "#1e293b",
      borderRadius: "8px",
      padding: "24px",
      border: "1px solid #334155",
      boxShadow: "0 20px 25px rgba(0,0,0,0.3)",
      marginBottom: "30px",
    },
    chartTitle: {
      fontSize: "20px",
      fontWeight: "bold",
      color: "white",
      marginBottom: "16px",
    },
    chartScrollOuter: {
  width: "100%",
  overflowX: "auto",
  overflowY: "hidden",
  paddingBottom: "10px",
},

chartScrollInner: {
  minWidth: "900px",
},
    financeSection: {
      background: "#1e293b",
      borderRadius: "8px",
      padding: "24px",
      border: "1px solid #334155",
      boxShadow: "0 20px 25px rgba(0,0,0,0.3)",
      marginBottom: "24px",
    },
    financeRow: {
      display: "flex",
      justifyContent: "space-between",
      color: "#cbd5e1",
      paddingBottom: "12px",
      borderBottom: "1px solid #475569",
    },
    financeLabel: {
      color: "#94a3b8",
    },
    financeValue: {
      fontWeight: "bold",
      color: "#3b82f6",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      color: "#cbd5e1",
      fontSize: "12px",
      marginTop: "16px",
    },
    tableHeader: {
      borderBottom: "1px solid #475569",
      background: "#0f172a",
      padding: "12px",
    },
    tableCell: {
      padding: "12px",
      borderBottom: "1px solid #334155",
      textAlign: "right",
    },
    loading: {
      textAlign: "center",
      paddingTop: "32px",
    },
    spinner: {
      display: "inline-block",
      width: "48px",
      height: "48px",
      border: "4px solid #334155",
      borderTopColor: "#3b82f6",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    },
  };

  function Auth({ onAuthSuccess, users, setUsers, mode, setMode }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("hr");

    const handleLogin = () => {
      const found = users.find(
        (u) => u.email === email && u.password === password,
      );
      if (!found) {
        alert("Invalid credentials");
        return;
      }
      onAuthSuccess(found);
    };

    const handleSignup = () => {
      if (!name || !email || !password) {
        alert("All fields required");
        return;
      }
      const exists = users.some((u) => u.email === email);
      if (exists) {
        alert("User already exists");
        return;
      }
      const newUser = { name, email, password, role };
      setUsers([...users, newUser]);
      onAuthSuccess(newUser);
    };

    return (
      <div
        style={{
          maxWidth: 420,
          margin: "100px auto",
          background: "#1e293b",
          padding: 24,
          borderRadius: 8,
          color: "white",
        }}
      >
        <h2 style={{ marginBottom: 16 }}>
          {mode === "login" ? "Login to ProHR" : "Create Account"}
        </h2>

        {mode === "signup" && (
          <input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 12 }}
          />
        )}

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 12 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 12 }}
        />

        {mode === "signup" && (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 12 }}
          >
            <option value="hr">HR</option>
            <option value="admin">Admin</option>
          </select>
        )}

        <button
          onClick={mode === "login" ? handleLogin : handleSignup}
          style={{ width: "100%", padding: 10, marginBottom: 12 }}
        >
          {mode === "login" ? "Login" : "Create Account"}
        </button>

        <p
          style={{ textAlign: "center", cursor: "pointer", color: "#60a5fa" }}
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? "New user? Create account"
            : "Already have an account? Login"}
        </p>
      </div>
    );
  }
  if (!user) {
    return (
      <Auth
        onAuthSuccess={setUser}
        users={users}
        setUsers={setUsers}
        mode={authMode}
        setMode={setAuthMode}
      />
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.maxWidth}>
          <div style={styles.headerTitle}>
            <BarChart3 size={32} />
            <span>ProHR ML Model</span>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <span style={{ marginRight: 12 }}>
              Welcome, {user.name} ({user.role})
            </span>
            <button
              onClick={() => setUser(null)}
              style={{ padding: "6px 12px", cursor: "pointer" }}
            >
              Logout
            </button>
          </div>

          <div style={styles.headerSubtitle}>
            Intelligent Employee Analytics & Payroll Prediction
          </div>
        </div>
      </div>

      <div style={styles.maxWidth}>
        {/* Navigation Tabs */}
        <div style={styles.tabContainer}>
          <button
            onClick={() => setActiveTab("upload")}
            style={styles.tabButton(activeTab === "upload")}
          >
            <Upload size={18} />
            Upload CSV
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            style={styles.tabButton(stats !== null)}
            disabled={!stats}
          >
            <BarChart3 size={18} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("predictions")}
            style={styles.tabButton(predictions !== null)}
            disabled={!predictions}
          >
            <TrendingUp size={18} />
            Predictions
          </button>
        </div>

        {/* Upload Section */}
        {activeTab === "upload" && (
          <div>
            <div style={styles.uploadBox}>
              <h2 style={styles.uploadTitle}>Upload Employee Data</h2>
              <div style={styles.uploadArea}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                  id="csv-input"
                />
                <label htmlFor="csv-input" style={{ cursor: "pointer" }}>
                  <Upload
                    size={48}
                    style={{ color: "#60a5fa", margin: "0 auto 16px" }}
                  />
                  <p style={styles.uploadText}>Click to upload CSV</p>
                  <p style={styles.uploadSubtext}>
                    Required columns: employee_id, name, salary, holidays_taken,
                    tasks_completed
                  </p>
                </label>
              </div>
              <div
                style={{
                  marginTop: "24px",
                  background: "#334155",
                  padding: "16px",
                  borderRadius: "4px",
                  color: "#cbd5e1",
                  fontSize: "12px",
                }}
              >
                <p
                  style={{
                    fontWeight: "600",
                    color: "#93c5fd",
                    marginBottom: "8px",
                  }}
                >
                  📋 CSV Format Example:
                </p>
                <code style={styles.codeBlock}>
                  employee_id,name,salary,holidays_taken,tasks_completed
                  <br />
                  E001,John Doe,50000,5,120
                  <br />
                  E002,Jane Smith,60000,3,135
                </code>
              </div>
            </div>
            {!loading && stats && (
              <div style={styles.successMessage}>
                <p style={{ fontWeight: "600" }}>
                  ✓ Data uploaded successfully! {stats.totalEmployees} employees
                  analyzed.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Dashboard Section */}
        {activeTab === "dashboard" && stats && (
          <div>
            {/* Key Metrics */}
            <div style={styles.metricsGrid}>
              <div
                style={styles.metricCard(
                  "linear-gradient(to bottom right, #3b82f6, #2563eb)",
                )}
              >
                <div style={styles.metricIcon}>
                  <Users size={24} />
                </div>
                <p style={styles.metricLabel}>Total Employees</p>
                <p style={styles.metricValue}>{stats.totalEmployees}</p>
              </div>
              <div
                style={styles.metricCard(
                  "linear-gradient(to bottom right, #10b981, #059669)",
                )}
              >
                <div style={styles.metricIcon}>
                  <DollarSign size={24} />
                </div>
                <p style={styles.metricLabel}>Avg Salary</p>
                <p style={styles.metricValue}>
                  ${(stats.avgSalary / 1000).toFixed(1)}K
                </p>
              </div>
              <div
                style={styles.metricCard(
                  "linear-gradient(to bottom right, #a855f7, #9333ea)",
                )}
              >
                <div style={styles.metricIcon}>
                  <AlertCircle size={24} />
                </div>
                <p style={styles.metricLabel}>Avg Holidays</p>
                <p style={styles.metricValue}>{stats.avgHolidaysUsed}</p>
              </div>
              <div
                style={styles.metricCard(
                  "linear-gradient(to bottom right, #f97316, #ea580c)",
                )}
              >
                <div style={styles.metricIcon}>
                  <TrendingUp size={24} />
                </div>
                <p style={styles.metricLabel}>Avg Tasks</p>
                <p style={styles.metricValue}>{stats.avgTasksCompleted}</p>
              </div>
            </div>

            {/* Financial Overview */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                gap: "24px",
              }}
            >
              <div style={styles.financeSection}>
                <h3 style={styles.chartTitle}>Financial Overview</h3>
                <div style={{ marginTop: "16px" }}>
                  <div style={styles.financeRow}>
                    <span>Total Monthly Payroll:</span>
                    <span style={{ color: "#4ade80" }}>
                      ${(stats.totalPayroll / 1000).toFixed(1)}K
                    </span>
                  </div>
                  <div style={styles.financeRow}>
                    <span>Total Deductions:</span>
                    <span style={{ color: "#f87171" }}>
                      -${(stats.totalDeductions / 1000).toFixed(1)}K
                    </span>
                  </div>
                  <div style={styles.financeRow}>
                    <span>Total Bonuses:</span>
                    <span style={{ color: "#4ade80" }}>
                      +${(stats.totalBonuses / 1000).toFixed(1)}K
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: "12px",
                      paddingTop: "12px",
                      borderTop: "1px solid #475569",
                    }}
                  >
                    <div
                      style={{
                        ...styles.financeRow,
                        borderBottom: "none",
                        fontSize: "16px",
                      }}
                    >
                      <span>Projected Company Revenue:</span>
                      <span style={{ color: "#60a5fa" }}>
                        ${(stats.companyRevenue / 1000).toFixed(1)}K
                      </span>
                    </div>
                    <div
                      style={{
                        ...styles.financeRow,
                        borderBottom: "none",
                        fontSize: "16px",
                      }}
                    >
                      <span>Projected Gain:</span>
                      <span style={{ color: "#4ade80" }}>
                        ${(stats.projectedGain / 1000).toFixed(1)}K
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.financeSection}>
                <h3 style={styles.chartTitle}>Deductions vs Bonuses</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={deductionVsBonus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) =>
                        `${entry.name}: $${(entry.value / 1000).toFixed(1)}K`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `$${(value / 1000).toFixed(1)}K`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Predictions Section */}
        {activeTab === "predictions" && predictions && (
          <div>
            {/* Revenue Forecast */}
            <div style={styles.chartBox}>
              <h3 style={styles.chartTitle}>12-Month Revenue Forecast</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={predictions.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="month" stroke="#cbd5e1" />
                  <YAxis stroke="#cbd5e1" width={70} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                    formatter={(value) => `$${(value / 1000).toFixed(1)}K`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Projected Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="payroll"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Projected Payroll"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Chart */}
            <div style={styles.chartBox}>
  <h3 style={styles.chartTitle}>Total Tasks Completed by Employees</h3>

  <div style={styles.chartScrollOuter}>
    <div
      style={{
        ...styles.chartScrollInner,
        width: `${Math.max(performanceDistribution.length * 70, 900)}px`,
      }}
    >
      <BarChart
  width={Math.max(performanceDistribution.length * 70, 900)}
  height={350}   
  data={performanceDistribution}
  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}  
>
        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
        <XAxis
          dataKey="name"
          stroke="#cbd5e1"
          angle={-45}
          textAnchor="end"
          interval={0}
          height={100}
          
        />
        <YAxis stroke="#cbd5e1" 
          label={{
    value: "Tasks Completed",
    angle: -90,
    position: "insideLeft",
    fill: "#cbd5e1",
    style: { textAnchor: "middle" },
  }}
        />
        <Tooltip />
        <Legend />
        <Bar dataKey="performance" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </div>
  </div>
  <div
  style={{
    textAlign: "center",
    color: "#cbd5e1",
    marginTop: "10px",
    fontSize: "14px",
    fontWeight: "500",
  }}
>
  Employee Name
</div>
</div>

            {/* Payroll Details Table */}
            <div
              style={{
                ...styles.chartBox,
                marginTop: "24px",
                overflowX: "auto",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h3 style={styles.chartTitle}>Payroll Predictions</h3>

                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #475569",
                    background: "#0f172a",
                    color: "white",
                    width: "220px",
                  }}
                />
              </div>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={{ textAlign: "left", padding: "12px" }}>
                      Emp ID
                    </th>
                    <th style={{ textAlign: "right", padding: "12px" }}>
                      Name
                    </th>
                    <th style={{ textAlign: "right", padding: "12px" }}>Age</th>
                    <th style={{ textAlign: "right", padding: "12px" }}>
                      Dept
                    </th>
                    <th style={{ textAlign: "right", padding: "12px" }}>
                      Experience
                    </th>
                    <th style={{ textAlign: "right", padding: "12px" }}>
                      Salary
                    </th>
                    <th style={{ textAlign: "right", padding: "12px" }}>
                      Final Payable
                    </th>
                    <th style={{ textAlign: "right", padding: "12px" }}>
                      Predicted Salary
                    </th>
                    <th style={{ textAlign: "right", padding: "12px" }}>
                      Attrition Risk (%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((emp, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background:
                          idx % 2 === 0
                            ? "rgba(30, 41, 59, 0.5)"
                            : "transparent",
                      }}
                    >
                      {/* Employee ID */}
                      <td style={{ ...styles.tableCell, textAlign: "left" }}>
                        {emp.employee_id}
                      </td>

                      {/* Name */}
                      <td style={{ ...styles.tableCell, textAlign: "left" }}>
                        {emp.name}
                      </td>

                      {/* Age */}
                      <td style={styles.tableCell}>{emp.age}</td>

                      {/* Department */}
                      <td style={styles.tableCell}>{emp.department}</td>

                      {/* Experience */}
                      <td style={styles.tableCell}>
                        {emp.experience_years} yrs
                      </td>

                      {/* Base Salary */}
                      <td style={styles.tableCell}>
                        ₹{emp.salary.toLocaleString()}
                      </td>

                      {/* Final Payable */}
                      <td
                        style={{
                          ...styles.tableCell,
                          color: "#60a5fa",
                          fontWeight: "bold",
                        }}
                      >
                        ₹{emp.finalPayable.toLocaleString()}
                      </td>

                      {/* Predicted Salary */}
                      <td style={{ ...styles.tableCell, color: "#a855f7" }}>
                        ₹{(emp.mlSalary || 0).toLocaleString()}
                      </td>

                      {/* Attrition Risk */}
                      <td
                        style={{
                          ...styles.tableCell,
                          color:
                            emp.attritionRisk > 70
                              ? "#ef4444"
                              : emp.attritionRisk > 40
                                ? "#facc15"
                                : "#4ade80",
                          fontWeight: "bold",
                        }}
                      >
                        {emp.attritionRisk}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "10px",
                  marginTop: "16px",
                  alignItems: "center",
                }}
              >
                {/* First Page Button */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: "6px 12px",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  ⏮ First
                </button>
                {/* Prev Button */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  style={{
                    padding: "6px 12px",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  ⬅ Prev
                </button>

                {/* Page Info */}
                <span style={{ color: "white" }}>
                  Page {currentPage} of {totalPages}
                </span>

                {/* Next Button */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      prev < totalPages ? prev + 1 : prev,
                    )
                  }
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "6px 12px",
                    cursor:
                      currentPage === totalPages ? "not-allowed" : "pointer",
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  Next ➡
                </button>

                {/* Last Page Button */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  style={{ padding: "6px 12px", cursor: "pointer" }}
                >
                  Last ⏩
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p style={{ color: "#cbd5e1", marginTop: "16px" }}>
              Processing data...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
