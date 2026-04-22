# HR Dashboard Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the monolithic 1273-line App.js into a professional, component-driven HR analytics dashboard with new Analytics tab, employee detail modal, enhanced charts, better backend, and polished UI.

**Architecture:** Break App.js into focused components (Header, AuthModal, UploadTab, DashboardTab, PredictionsTab, AnalyticsTab, EmployeeModal). Extract data logic into a custom hook and utility files. Add new Analytics tab with department breakdown and attrition insights.

**Tech Stack:** React 19, Recharts, Lucide React, PapaParse, Flask, Python 3.11, inline styles (existing pattern)

---

## File Map

**Create:**
- `src/utils/formatters.js` — currency, number, percent formatters
- `src/utils/calculations.js` — dept stats, salary distribution, attrition buckets
- `src/hooks/usePredictions.js` — encapsulate API calls to Flask backend
- `src/components/AuthModal.js` — polished login/signup form
- `src/components/Header.js` — app header with user info + logout
- `src/components/UploadTab.js` — CSV upload area
- `src/components/EmployeeModal.js` — NEW: click employee → full detail modal
- `src/components/DashboardTab.js` — enhanced dashboard (6 KPIs + dept chart + salary chart)
- `src/components/PredictionsTab.js` — enhanced table with modal trigger + export CSV
- `src/components/AnalyticsTab.js` — NEW: dept comparison, attrition analysis, top/bottom performers

**Modify:**
- `src/App.js` — refactored to thin orchestrator (~150 lines)
- `src/index.css` — add global animations, scrollbar styling, modal backdrop
- `backend/app.py` — add `/api/department-stats` and `/api/health` endpoints

---

## Task 1: Utility Functions

**Files:**
- Create: `src/utils/formatters.js`
- Create: `src/utils/calculations.js`

- [ ] **Step 1: Create formatters.js**

```js
// src/utils/formatters.js
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
```

- [ ] **Step 2: Create calculations.js**

```js
// src/utils/calculations.js
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
```

---

## Task 2: usePredictions Hook

**Files:**
- Create: `src/hooks/usePredictions.js`

- [ ] **Step 1: Create hook**

```js
// src/hooks/usePredictions.js
const API = "http://127.0.0.1:5000";

export async function fetchPrediction(emp) {
  try {
    const [salaryRes, attritionRes] = await Promise.all([
      fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experience_years: Number(emp.experience_years || 0),
          total_tasks_completed: Number(emp.total_tasks_completed || emp.tasks_completed || 0),
          performance_rating: Number(emp.performance_rating || 0),
          projects_handled: Number(emp.projects_handled || 0),
          unpaid_leaves: Number(emp.unpaid_leaves || 0),
          late_login_count: Number(emp.late_login_count || 0),
        }),
      }),
      fetch(`${API}/predict-attrition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: Number(emp.age || 30),
          experience_years: Number(emp.experience_years || 0),
          total_tasks_completed: Number(emp.total_tasks_completed || emp.tasks_completed || 0),
          performance_rating: Number(emp.performance_rating || 0),
          unpaid_leaves: Number(emp.unpaid_leaves || 0),
          overtime_hours: Number(emp.overtime_hours || 0),
          late_login_count: Number(emp.late_login_count || 0),
          job_satisfaction: Number(emp.job_satisfaction || 3),
          work_life_balance: Number(emp.work_life_balance || 3),
          team_engagement_score: Number(emp.team_engagement_score || 75),
        }),
      }),
    ]);
    const [salaryData, attritionData] = await Promise.all([salaryRes.json(), attritionRes.json()]);
    return {
      mlSalary: salaryData.predicted_salary || 0,
      attritionRisk: attritionData.attrition_risk || 0,
    };
  } catch {
    return { mlSalary: 0, attritionRisk: 0 };
  }
}
```

---

## Task 3: Backend Enhancements

**Files:**
- Modify: `backend/app.py`

- [ ] **Step 1: Replace app.py with enhanced version**

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np

app = Flask(__name__)
CORS(app, supports_credentials=True)

salary_model = pickle.load(open("model.pkl", "rb"))
attrition_model = pickle.load(open("attrition_model.pkl", "rb"))


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "models": ["salary", "attrition"]})


@app.route("/predict", methods=["POST"])
def predict_salary():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "invalid request"}), 400
    try:
        features = np.array([[
            float(data.get("experience_years", 0)),
            float(data.get("performance_rating", 0)),
            float(data.get("projects_handled", 0)),
            float(data.get("total_tasks_completed", 0)),
            float(data.get("unpaid_leaves", 0)),
            float(data.get("late_login_count", 0)),
        ]])
        prediction = salary_model.predict(features)[0]
        return jsonify({"predicted_salary": round(float(prediction), 2)})
    except Exception as e:
        print("Salary prediction error:", e)
        return jsonify({"predicted_salary": 0}), 500


@app.route("/predict-attrition", methods=["POST"])
def predict_attrition():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"attrition_risk": 0}), 400
    try:
        age = float(data.get("age", 30))
        experience_years = float(data.get("experience_years", 3))
        total_tasks_completed = float(data.get("total_tasks_completed", 100))
        performance_rating = float(data.get("performance_rating", 7))
        unpaid_leaves = float(data.get("unpaid_leaves", 2))
        overtime_hours = float(data.get("overtime_hours", 10))
        late_login_count = float(data.get("late_login_count", 3))
        job_satisfaction = float(data.get("job_satisfaction", 3))
        work_life_balance = float(data.get("work_life_balance", 3))
        team_engagement_score = float(data.get("team_engagement_score", 75))

        risk_score = 0
        risk_score += (5 - job_satisfaction) * 8
        risk_score += (5 - work_life_balance) * 8
        risk_score += min(overtime_hours, 60) * 0.35
        risk_score += min(unpaid_leaves, 10) * 2.5
        risk_score += min(late_login_count, 15) * 1.5
        risk_score += max(0, 6 - performance_rating) * 4
        risk_score += max(0, 5 - experience_years) * 2
        risk_score += max(0, 70 - team_engagement_score) * 0.4

        if job_satisfaction <= 2: risk_score += 8
        if work_life_balance <= 2: risk_score += 8
        if overtime_hours > 45: risk_score += 6
        if unpaid_leaves > 6: risk_score += 5
        if late_login_count > 10: risk_score += 5
        if performance_rating <= 3: risk_score += 6
        if experience_years < 2: risk_score += 4

        final_risk = round(max(8, min(85, risk_score)), 2)
        return jsonify({"attrition_risk": final_risk})
    except Exception as e:
        print("Attrition error:", e)
        return jsonify({"attrition_risk": 0})


if __name__ == "__main__":
    app.run(debug=True)
```

---

## Task 4: index.css — Global Styles

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace index.css**

```css
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #0f172a;
  color: #e2e8f0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #1e293b; }
::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #64748b; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.fade-in { animation: fadeIn 0.3s ease-out; }
.slide-in { animation: slideIn 0.25s ease-out; }

.skeleton {
  background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 999;
  display: flex; align-items: center; justify-content: center;
}

input, select, button { font-family: inherit; }
button { cursor: pointer; }
```

---

## Task 5: AuthModal Component

**Files:**
- Create: `src/components/AuthModal.js`

- [ ] **Step 1: Create AuthModal.js**

```jsx
// src/components/AuthModal.js
import React, { useState } from "react";
import { LogIn, UserPlus, Eye, EyeOff, Shield } from "lucide-react";

export default function AuthModal({ onAuthSuccess, users, setUsers, mode, setMode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("hr");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) { setError("Invalid email or password"); return; }
    onAuthSuccess(found);
  };

  const handleSignup = () => {
    if (!name || !email || !password) { setError("All fields are required"); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters"); return; }
    if (users.some((u) => u.email === email)) { setError("Email already registered"); return; }
    const newUser = { name, email, password, role };
    setUsers((prev) => [...prev, newUser]);
    onAuthSuccess(newUser);
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", marginBottom: "12px",
    background: "#0f172a", border: "1px solid #334155", borderRadius: "8px",
    color: "white", fontSize: "14px", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="slide-in" style={{ width: "100%", maxWidth: 420, background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "32px", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, background: "linear-gradient(135deg, #2563eb, #9333ea)", borderRadius: "14px", marginBottom: "12px" }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ color: "white", fontSize: "22px", fontWeight: "700" }}>ProHR Dashboard</h1>
          <p style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#fca5a5", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {mode === "signup" && (
          <input placeholder="Full Name" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} style={inputStyle} />
        )}
        <input placeholder="Email address" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} style={inputStyle} />
        <div style={{ position: "relative", marginBottom: "12px" }}>
          <input placeholder="Password" type={showPass ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} style={{ ...inputStyle, marginBottom: 0, paddingRight: "42px" }} />
          <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: "12px", top: "10px", background: "none", border: "none", color: "#64748b" }}>
            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {mode === "signup" && (
          <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
            <option value="hr">HR Manager</option>
            <option value="admin">Admin</option>
          </select>
        )}

        <button
          onClick={mode === "login" ? handleLogin : handleSignup}
          style={{ width: "100%", padding: "12px", background: "linear-gradient(to right, #2563eb, #9333ea)", border: "none", borderRadius: "8px", color: "white", fontWeight: "600", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "4px" }}
        >
          {mode === "login" ? <><LogIn size={18} /> Sign In</> : <><UserPlus size={18} /> Create Account</>}
        </button>

        <p style={{ textAlign: "center", marginTop: "20px", color: "#64748b", fontSize: "13px" }}>
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} style={{ color: "#60a5fa", cursor: "pointer", fontWeight: "600" }}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </span>
        </p>

        {mode === "login" && (
          <div style={{ marginTop: "20px", padding: "12px", background: "#0f172a", borderRadius: "8px", fontSize: "12px", color: "#64748b" }}>
            <p style={{ marginBottom: "4px", color: "#94a3b8", fontWeight: "600" }}>Demo credentials:</p>
            <p>admin@prohr.com / admin123</p>
            <p>hr@prohr.com / hr123</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 6: Header Component

**Files:**
- Create: `src/components/Header.js`

- [ ] **Step 1: Create Header.js**

```jsx
// src/components/Header.js
import React from "react";
import { BarChart3, LogOut, Shield, User } from "lucide-react";

export default function Header({ user, onLogout }) {
  return (
    <header style={{ background: "linear-gradient(to right, #1d4ed8, #7c3aed)", padding: "0", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, background: "rgba(255,255,255,0.15)", borderRadius: "10px", backdropFilter: "blur(8px)" }}>
            <BarChart3 size={24} color="white" />
          </div>
          <div>
            <h1 style={{ color: "white", fontSize: "20px", fontWeight: "700", letterSpacing: "-0.3px" }}>ProHR Analytics</h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px" }}>Intelligent Employee Analytics & Payroll Prediction</p>
          </div>
        </div>

        {/* User Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 14px", backdropFilter: "blur(8px)" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #60a5fa, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={16} color="white" />
            </div>
            <div>
              <p style={{ color: "white", fontSize: "13px", fontWeight: "600" }}>{user.name}</p>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                <Shield size={10} /> {user.role.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "white", fontSize: "13px", fontWeight: "500", backdropFilter: "blur(8px)" }}
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
```

---

## Task 7: UploadTab Component

**Files:**
- Create: `src/components/UploadTab.js`

- [ ] **Step 1: Create UploadTab.js**

```jsx
// src/components/UploadTab.js
import React, { useState } from "react";
import { Upload, CheckCircle, FileText, AlertCircle } from "lucide-react";

const REQUIRED_COLUMNS = ["employee_id", "name", "salary", "department", "experience_years", "performance_rating"];

export default function UploadTab({ onUpload, stats, loading }) {
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (!file || !file.name.endsWith(".csv")) {
      alert("Please upload a valid .csv file");
      return;
    }
    onUpload(file);
  };

  return (
    <div className="fade-in" style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ background: "#1e293b", borderRadius: "16px", padding: "32px", border: "1px solid #334155", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #2563eb, #9333ea)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Upload size={20} color="white" />
          </div>
          <div>
            <h2 style={{ color: "white", fontSize: "20px", fontWeight: "700" }}>Upload Employee Data</h2>
            <p style={{ color: "#64748b", fontSize: "13px" }}>Upload your CSV file to begin analysis</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          style={{ border: `2px dashed ${dragOver ? "#3b82f6" : "#334155"}`, borderRadius: "12px", padding: "48px 32px", textAlign: "center", background: dragOver ? "rgba(59,130,246,0.08)" : "rgba(15,23,42,0.4)", transition: "all 0.2s", cursor: "pointer" }}
          onClick={() => document.getElementById("csv-input").click()}
        >
          <input type="file" accept=".csv" id="csv-input" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
          <div style={{ width: 56, height: 56, background: "rgba(59,130,246,0.15)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <FileText size={28} color="#60a5fa" />
          </div>
          <p style={{ color: "white", fontSize: "16px", fontWeight: "600" }}>Drop your CSV file here</p>
          <p style={{ color: "#64748b", fontSize: "13px", marginTop: "6px" }}>or click to browse files</p>
          <p style={{ color: "#475569", fontSize: "12px", marginTop: "12px" }}>Supports .csv files up to 10MB</p>
        </div>

        {/* Required columns */}
        <div style={{ marginTop: "20px", background: "#0f172a", borderRadius: "10px", padding: "16px" }}>
          <p style={{ color: "#93c5fd", fontSize: "13px", fontWeight: "600", marginBottom: "10px" }}>Required Columns:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {REQUIRED_COLUMNS.map((col) => (
              <span key={col} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", padding: "3px 10px", color: "#cbd5e1", fontSize: "12px", fontFamily: "monospace" }}>{col}</span>
            ))}
          </div>
          <p style={{ color: "#64748b", fontSize: "12px", marginTop: "10px" }}>Also supports: age, overtime_hours, late_login_count, unpaid_leaves, job_satisfaction, work_life_balance, total_tasks_completed, projects_handled</p>
        </div>

        {/* Success */}
        {!loading && stats && (
          <div className="fade-in" style={{ marginTop: "20px", background: "rgba(16,185,129,0.12)", border: "1px solid #059669", borderRadius: "10px", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <CheckCircle size={20} color="#4ade80" />
            <div>
              <p style={{ color: "#4ade80", fontWeight: "600" }}>Upload successful!</p>
              <p style={{ color: "#86efac", fontSize: "13px" }}>{stats.totalEmployees} employees analyzed. Switch to Dashboard to view insights.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 8: EmployeeModal Component

**Files:**
- Create: `src/components/EmployeeModal.js`

- [ ] **Step 1: Create EmployeeModal.js**

```jsx
// src/components/EmployeeModal.js
import React from "react";
import { X, User, Briefcase, TrendingUp, AlertTriangle, Star, Clock } from "lucide-react";
import { formatCurrency, getRiskLevel, getRatingColor } from "../utils/formatters";

const StatRow = ({ label, value, color }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1e293b" }}>
    <span style={{ color: "#94a3b8", fontSize: "13px" }}>{label}</span>
    <span style={{ color: color || "#e2e8f0", fontWeight: "600", fontSize: "13px" }}>{value}</span>
  </div>
);

const MiniGauge = ({ value, max = 100, color }) => (
  <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
    <div style={{ height: "100%", width: `${Math.min((value / max) * 100, 100)}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
  </div>
);

export default function EmployeeModal({ emp, onClose }) {
  if (!emp) return null;
  const risk = getRiskLevel(emp.attritionRisk || 0);
  const salary = parseFloat(emp.salary || 0);
  const mlSalary = parseFloat(emp.mlSalary || 0);
  const salaryDiff = mlSalary - salary;
  const perfRating = parseFloat(emp.performance_rating || 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="slide-in" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "#1e293b", borderRadius: "16px", border: "1px solid #334155", boxShadow: "0 40px 80px rgba(0,0,0,0.6)", maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #1d4ed8, #7c3aed)", padding: "24px", borderRadius: "16px 16px 0 0", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px", padding: "6px", color: "white", display: "flex" }}>
            <X size={18} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={26} color="white" />
            </div>
            <div>
              <h2 style={{ color: "white", fontSize: "20px", fontWeight: "700" }}>{emp.name}</h2>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px" }}>{emp.employee_id} · {emp.department}</p>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <span style={{ background: risk.bg, border: `1px solid ${risk.color}`, color: risk.color, borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: "700" }}>
                {risk.label} Risk
              </span>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", marginTop: "4px" }}>{emp.attritionRisk}% attrition</p>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px" }}>
          {/* Attrition gauge */}
          <div style={{ background: "#0f172a", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "#94a3b8", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}><AlertTriangle size={14} /> Attrition Risk</span>
              <span style={{ color: risk.color, fontWeight: "700" }}>{emp.attritionRisk}%</span>
            </div>
            <MiniGauge value={emp.attritionRisk} max={85} color={risk.color} />
          </div>

          {/* Two-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            {/* Personal */}
            <div style={{ background: "#0f172a", borderRadius: "10px", padding: "16px" }}>
              <p style={{ color: "#60a5fa", fontSize: "12px", fontWeight: "600", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}><User size={13} /> PERSONAL</p>
              <StatRow label="Age" value={`${emp.age} yrs`} />
              <StatRow label="Experience" value={`${emp.experience_years} years`} />
              <StatRow label="Department" value={emp.department} />
            </div>
            {/* Performance */}
            <div style={{ background: "#0f172a", borderRadius: "10px", padding: "16px" }}>
              <p style={{ color: "#a78bfa", fontSize: "12px", fontWeight: "600", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}><Star size={13} /> PERFORMANCE</p>
              <StatRow label="Rating" value={`${perfRating}/10`} color={getRatingColor(perfRating)} />
              <StatRow label="Tasks Done" value={emp.total_tasks_completed || emp.tasks_completed || "—"} />
              <StatRow label="Projects" value={emp.projects_handled || "—"} />
            </div>
          </div>

          {/* Salary */}
          <div style={{ background: "#0f172a", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
            <p style={{ color: "#34d399", fontSize: "12px", fontWeight: "600", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}><TrendingUp size={13} /> COMPENSATION</p>
            <StatRow label="Base Salary" value={formatCurrency(salary)} />
            <StatRow label="Final Payable" value={formatCurrency(emp.finalPayable)} color="#60a5fa" />
            <StatRow label="ML Predicted" value={formatCurrency(mlSalary)} color="#a855f7" />
            {mlSalary > 0 && (
              <div style={{ marginTop: "8px", padding: "8px 10px", background: salaryDiff > 0 ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)", borderRadius: "6px" }}>
                <span style={{ color: salaryDiff > 0 ? "#4ade80" : "#f87171", fontSize: "12px", fontWeight: "600" }}>
                  {salaryDiff > 0 ? "↑" : "↓"} Predicted {salaryDiff > 0 ? "above" : "below"} by {formatCurrency(Math.abs(salaryDiff))}
                </span>
              </div>
            )}
          </div>

          {/* Work Habits */}
          <div style={{ background: "#0f172a", borderRadius: "10px", padding: "16px" }}>
            <p style={{ color: "#f97316", fontSize: "12px", fontWeight: "600", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}><Clock size={13} /> WORK HABITS</p>
            <StatRow label="Overtime Hours" value={`${emp.overtime_hours || 0} hrs`} color={emp.overtime_hours > 40 ? "#f87171" : "#e2e8f0"} />
            <StatRow label="Late Logins" value={emp.late_login_count || 0} color={emp.late_login_count > 8 ? "#facc15" : "#e2e8f0"} />
            <StatRow label="Unpaid Leaves" value={emp.unpaid_leaves || 0} color={emp.unpaid_leaves > 5 ? "#f87171" : "#e2e8f0"} />
            <StatRow label="Job Satisfaction" value={`${emp.job_satisfaction || "—"}/5`} color={getRatingColor(emp.job_satisfaction || 0, 5)} />
            <StatRow label="Work-Life Balance" value={`${emp.work_life_balance || "—"}/5`} color={getRatingColor(emp.work_life_balance || 0, 5)} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Task 9: DashboardTab Component

**Files:**
- Create: `src/components/DashboardTab.js`

- [ ] **Step 1: Create DashboardTab.js**

```jsx
// src/components/DashboardTab.js
import React, { useMemo } from "react";
import { Users, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Award, Target, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { formatCurrency } from "../utils/formatters";
import { getDepartmentStats, getSalaryBuckets, getAttritionBuckets, getHighRiskEmployees } from "../utils/calculations";

const MetricCard = ({ icon, label, value, subtitle, gradient, trend }) => (
  <div className="fade-in" style={{ background: gradient, borderRadius: "14px", padding: "22px", color: "white", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: "rgba(255,255,255,0.08)", borderRadius: "50%" }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ background: "rgba(255,255,255,0.18)", borderRadius: "10px", padding: "10px", display: "inline-flex" }}>{icon}</div>
      {trend !== undefined && (
        <span style={{ fontSize: "12px", fontWeight: "600", color: trend >= 0 ? "#86efac" : "#fca5a5", display: "flex", alignItems: "center", gap: "3px" }}>
          {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", marginTop: "14px" }}>{label}</p>
    <p style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px", marginTop: "2px" }}>{value}</p>
    {subtitle && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", marginTop: "4px" }}>{subtitle}</p>}
  </div>
);

const ChartBox = ({ title, children, style }) => (
  <div style={{ background: "#1e293b", borderRadius: "14px", padding: "24px", border: "1px solid #334155", boxShadow: "0 8px 24px rgba(0,0,0,0.2)", ...style }}>
    <h3 style={{ color: "white", fontSize: "16px", fontWeight: "700", marginBottom: "20px" }}>{title}</h3>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "10px 14px" }}>
      <p style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "6px" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: "13px", fontWeight: "600" }}>{p.name}: {typeof p.value === "number" && p.value > 1000 ? formatCurrency(p.value) : p.value}</p>
      ))}
    </div>
  );
};

export default function DashboardTab({ stats, payroll }) {
  const deptStats = useMemo(() => getDepartmentStats(payroll), [payroll]);
  const salaryBuckets = useMemo(() => getSalaryBuckets(payroll), [payroll]);
  const attritionBuckets = useMemo(() => getAttritionBuckets(payroll), [payroll]);
  const highRisk = useMemo(() => getHighRiskEmployees(payroll, 5), [payroll]);
  const deductionBonus = [
    { name: "Deductions", value: stats.totalDeductions, color: "#ef4444" },
    { name: "Bonuses", value: stats.totalBonuses, color: "#10b981" },
  ];
  const highRiskCount = payroll.filter((e) => e.attritionRisk > 70).length;
  const avgPerf = (payroll.reduce((s, e) => s + parseFloat(e.performance_rating || 0), 0) / payroll.length).toFixed(1);

  return (
    <div className="fade-in">
      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <MetricCard icon={<Users size={20} color="white" />} label="Total Employees" value={stats.totalEmployees} gradient="linear-gradient(135deg, #2563eb, #1d4ed8)" />
        <MetricCard icon={<DollarSign size={20} color="white" />} label="Average Salary" value={formatCurrency(stats.avgSalary, true)} subtitle="per month" gradient="linear-gradient(135deg, #059669, #047857)" />
        <MetricCard icon={<TrendingUp size={20} color="white" />} label="Total Payroll" value={formatCurrency(stats.totalPayroll, true)} subtitle={`Revenue: ${formatCurrency(stats.companyRevenue, true)}`} gradient="linear-gradient(135deg, #7c3aed, #6d28d9)" />
        <MetricCard icon={<Activity size={20} color="white" />} label="Avg Performance" value={`${avgPerf}/10`} gradient="linear-gradient(135deg, #d97706, #b45309)" />
        <MetricCard icon={<AlertTriangle size={20} color="white" />} label="High Attrition Risk" value={highRiskCount} subtitle={`of ${stats.totalEmployees} employees`} gradient="linear-gradient(135deg, #dc2626, #b91c1c)" />
        <MetricCard icon={<Award size={20} color="white" />} label="Total Bonuses" value={formatCurrency(stats.totalBonuses, true)} gradient="linear-gradient(135deg, #0891b2, #0e7490)" />
        <MetricCard icon={<Target size={20} color="white" />} label="Total Deductions" value={formatCurrency(stats.totalDeductions, true)} gradient="linear-gradient(135deg, #be185d, #9d174d)" />
        <MetricCard icon={<TrendingUp size={20} color="white" />} label="Projected Gain" value={formatCurrency(stats.projectedGain, true)} gradient="linear-gradient(135deg, #16a34a, #15803d)" />
      </div>

      {/* Row 1: Dept chart + Pie */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", marginBottom: "20px" }}>
        <ChartBox title="Employees by Department">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptStats} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Employees" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Deductions vs Bonuses">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={deductionBonus} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {deductionBonus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v, true)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>

      {/* Row 2: Salary distribution + Attrition buckets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", marginBottom: "20px" }}>
        <ChartBox title="Salary Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salaryBuckets} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="range" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Employees" fill="#a855f7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Attrition Risk Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attritionBuckets} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis dataKey="range" type="category" stroke="#64748b" fontSize={11} width={120} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Employees" radius={[0, 6, 6, 0]}>
                {attritionBuckets.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>

      {/* Row 3: Dept avg salary + High risk */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px" }}>
        <ChartBox title="Average Salary by Department">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptStats} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgSalary" name="Avg Salary" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <div style={{ background: "#1e293b", borderRadius: "14px", padding: "24px", border: "1px solid #334155", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
          <h3 style={{ color: "white", fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={16} color="#ef4444" /> Top Attrition Risks
          </h3>
          {highRisk.map((emp, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < highRisk.length - 1 ? "1px solid #1e293b40" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #dc2626, #9f1239)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: "white" }}>{i + 1}</div>
                <div>
                  <p style={{ color: "white", fontSize: "13px", fontWeight: "600" }}>{emp.name}</p>
                  <p style={{ color: "#64748b", fontSize: "11px" }}>{emp.department} · {emp.experience_years}y exp</p>
                </div>
              </div>
              <span style={{ color: "#ef4444", fontWeight: "700", fontSize: "14px" }}>{emp.attritionRisk}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Task 10: AnalyticsTab Component (NEW)

**Files:**
- Create: `src/components/AnalyticsTab.js`

- [ ] **Step 1: Create AnalyticsTab.js**

```jsx
// src/components/AnalyticsTab.js
import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, ScatterChart, Scatter, Cell, LineChart, Line, Legend } from "recharts";
import { Award, TrendingDown, Users, Zap } from "lucide-react";
import { formatCurrency } from "../utils/formatters";
import { getDepartmentStats, getTopPerformers, getHighRiskEmployees } from "../utils/calculations";

const ChartBox = ({ title, subtitle, children }) => (
  <div style={{ background: "#1e293b", borderRadius: "14px", padding: "24px", border: "1px solid #334155", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{ color: "white", fontSize: "16px", fontWeight: "700" }}>{title}</h3>
      {subtitle && <p style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>{subtitle}</p>}
    </div>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "10px 14px" }}>
      <p style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "6px" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: "13px", fontWeight: "600" }}>{p.name}: {typeof p.value === "number" && p.value > 1000 ? formatCurrency(p.value) : p.value}</p>
      ))}
    </div>
  );
};

export default function AnalyticsTab({ payroll }) {
  const deptStats = useMemo(() => getDepartmentStats(payroll), [payroll]);
  const topPerformers = useMemo(() => getTopPerformers(payroll, 8), [payroll]);
  const highRiskEmps = useMemo(() => getHighRiskEmployees(payroll, 8), [payroll]);

  const experienceBands = useMemo(() => {
    const bands = [
      { band: "0–2 yrs", min: 0, max: 2 }, { band: "3–5 yrs", min: 3, max: 5 },
      { band: "6–10 yrs", min: 6, max: 10 }, { band: "11–15 yrs", min: 11, max: 15 },
      { band: "15+ yrs", min: 16, max: 99 },
    ];
    return bands.map((b) => {
      const group = payroll.filter((e) => parseFloat(e.experience_years) >= b.min && parseFloat(e.experience_years) <= b.max);
      return {
        ...b,
        count: group.length,
        avgSalary: group.length ? Math.round(group.reduce((s, e) => s + parseFloat(e.salary || 0), 0) / group.length) : 0,
        avgRisk: group.length ? Math.round(group.reduce((s, e) => s + parseFloat(e.attritionRisk || 0), 0) / group.length) : 0,
      };
    }).filter((b) => b.count > 0);
  }, [payroll]);

  const satisfactionDist = useMemo(() => {
    const scores = [1, 2, 3, 4, 5];
    return scores.map((s) => ({
      score: `Score ${s}`,
      count: payroll.filter((e) => parseInt(e.job_satisfaction) === s).length,
    }));
  }, [payroll]);

  return (
    <div className="fade-in">
      {/* Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", marginBottom: "20px" }}>
        <ChartBox title="Department Attrition Risk" subtitle="Average attrition risk % per department">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptStats} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgRisk" name="Avg Risk %" radius={[6, 6, 0, 0]}>
                {deptStats.map((entry, i) => (
                  <Cell key={i} fill={entry.avgRisk > 60 ? "#ef4444" : entry.avgRisk > 40 ? "#facc15" : "#4ade80"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Salary vs Experience" subtitle="Average salary across experience bands">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={experienceBands} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="band" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="avgSalary" name="Avg Salary" stroke="#60a5fa" strokeWidth={2.5} dot={{ fill: "#60a5fa", r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>

      {/* Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", marginBottom: "20px" }}>
        <ChartBox title="Job Satisfaction Distribution" subtitle="Number of employees per satisfaction score (1–5)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={satisfactionDist} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="score" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Employees" radius={[6, 6, 0, 0]}>
                {satisfactionDist.map((entry, i) => (
                  <Cell key={i} fill={["#ef4444","#f97316","#facc15","#86efac","#4ade80"][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Attrition Risk by Experience Band" subtitle="Which experience group is at most risk?">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={experienceBands} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="band" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={12} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgRisk" name="Avg Risk %" radius={[6, 6, 0, 0]}>
                {experienceBands.map((entry, i) => (
                  <Cell key={i} fill={entry.avgRisk > 60 ? "#ef4444" : entry.avgRisk > 40 ? "#facc15" : "#4ade80"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>

      {/* Row 3: Top performers + High risk list */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px" }}>
        <div style={{ background: "#1e293b", borderRadius: "14px", padding: "24px", border: "1px solid #334155", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
          <h3 style={{ color: "white", fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}><Award size={16} color="#facc15" /> Top Performers</h3>
          {topPerformers.map((emp, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < topPerformers.length - 1 ? "1px solid #0f172a" : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < 3 ? "linear-gradient(135deg, #f59e0b, #d97706)" : "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "white", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "white", fontSize: "13px", fontWeight: "600" }}>{emp.name}</p>
                <p style={{ color: "#64748b", fontSize: "11px" }}>{emp.department}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#4ade80", fontWeight: "700", fontSize: "13px" }}>{emp.performance_rating}/10</p>
                <p style={{ color: "#64748b", fontSize: "11px" }}>{formatCurrency(emp.salary, true)}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#1e293b", borderRadius: "14px", padding: "24px", border: "1px solid #334155", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
          <h3 style={{ color: "white", fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}><TrendingDown size={16} color="#ef4444" /> Highest Attrition Risk</h3>
          {highRiskEmps.map((emp, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < highRiskEmps.length - 1 ? "1px solid #0f172a" : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #dc2626, #9f1239)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "white", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "white", fontSize: "13px", fontWeight: "600" }}>{emp.name}</p>
                <p style={{ color: "#64748b", fontSize: "11px" }}>{emp.department} · {emp.experience_years}y</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#ef4444", fontWeight: "700", fontSize: "13px" }}>{emp.attritionRisk}%</p>
                <p style={{ color: "#64748b", fontSize: "11px" }}>Satisfaction: {emp.job_satisfaction}/5</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Task 11: PredictionsTab Component

**Files:**
- Create: `src/components/PredictionsTab.js`

- [ ] **Step 1: Create PredictionsTab.js**

```jsx
// src/components/PredictionsTab.js
import React, { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Search, Download, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, getRiskLevel } from "../utils/formatters";
import EmployeeModal from "./EmployeeModal";

const ITEMS_PER_PAGE = 20;

const RiskBadge = ({ risk }) => {
  const level = getRiskLevel(risk);
  return (
    <span style={{ background: level.bg, border: `1px solid ${level.color}`, color: level.color, borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>
      {risk}% · {level.label}
    </span>
  );
};

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <span style={{ color: "#475569", marginLeft: 4 }}>↕</span>;
  return sortDir === "asc" ? <ChevronUp size={14} style={{ display: "inline", marginLeft: 4 }} /> : <ChevronDown size={14} style={{ display: "inline", marginLeft: 4 }} />;
};

export default function PredictionsTab({ predictions }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [sortField, setSortField] = useState("attritionRisk");
  const [sortDir, setSortDir] = useState("desc");

  const departments = useMemo(() => ["All", ...new Set(predictions.payroll.map((e) => e.department).filter(Boolean))], [predictions.payroll]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    let data = predictions.payroll;
    if (selectedDept !== "All") data = data.filter((e) => e.department === selectedDept);
    if (searchTerm) data = data.filter((e) => (e.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (e.employee_id || "").toLowerCase().includes(searchTerm.toLowerCase()));
    return [...data].sort((a, b) => {
      const va = parseFloat(a[sortField] || 0), vb = parseFloat(b[sortField] || 0);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [predictions.payroll, selectedDept, searchTerm, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const performanceData = predictions.payroll.slice(0, 30).map((p) => ({
    name: p.name?.split(" ")[0] || "?",
    tasks: Number(p.total_tasks_completed || p.tasks_completed || 0),
    rating: Number(p.performance_rating || 0),
  }));

  const exportCSV = () => {
    const headers = ["ID", "Name", "Dept", "Age", "Experience", "Salary", "Final Payable", "ML Salary", "Attrition Risk"];
    const rows = filtered.map((e) => [e.employee_id, e.name, e.department, e.age, `${e.experience_years}y`, e.salary, e.finalPayable, e.mlSalary || 0, `${e.attritionRisk}%`]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "payroll_predictions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const thStyle = (field) => ({
    padding: "12px 14px", color: "#94a3b8", fontWeight: "600", fontSize: "12px",
    textAlign: "left", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
    borderBottom: "1px solid #334155", background: "#0f172a",
  });

  return (
    <div className="fade-in">
      {/* Revenue Forecast */}
      <div style={{ background: "#1e293b", borderRadius: "14px", padding: "24px", border: "1px solid #334155", marginBottom: "20px" }}>
        <h3 style={{ color: "white", fontSize: "16px", fontWeight: "700", marginBottom: "20px" }}>12-Month Revenue Forecast</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={predictions.revenueTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v) => formatCurrency(v, true)} contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }} />
            <Legend />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#60a5fa" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="payroll" name="Payroll" stroke="#f87171" strokeWidth={2.5} dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Chart */}
      <div style={{ background: "#1e293b", borderRadius: "14px", padding: "24px", border: "1px solid #334155", marginBottom: "20px" }}>
        <h3 style={{ color: "white", fontSize: "16px", fontWeight: "700", marginBottom: "20px" }}>Tasks Completed (Top 30)</h3>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: Math.max(performanceData.length * 60, 600) }}>
            <BarChart width={Math.max(performanceData.length * 60, 600)} height={260} data={performanceData} margin={{ bottom: 50, top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-40} textAnchor="end" interval={0} height={70} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Bar dataKey="tasks" name="Tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#1e293b", borderRadius: "14px", border: "1px solid #334155", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
        {/* Table controls */}
        <div style={{ padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", borderBottom: "1px solid #334155", background: "#0f172a40" }}>
          <h3 style={{ color: "white", fontSize: "16px", fontWeight: "700", flex: 1 }}>Payroll Predictions</h3>
          <select value={selectedDept} onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }} style={{ padding: "8px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "white", fontSize: "13px" }}>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            <input placeholder="Search name or ID..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={{ padding: "8px 12px 8px 32px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "white", fontSize: "13px", width: 200 }} />
          </div>
          <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "rgba(59,130,246,0.15)", border: "1px solid #3b82f6", borderRadius: "8px", color: "#60a5fa", fontSize: "13px", fontWeight: "600" }}>
            <Download size={14} /> Export CSV
          </button>
          <span style={{ color: "#64748b", fontSize: "12px" }}>{filtered.length} records</span>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {[["employee_id","ID"],["name","Name"],["age","Age"],["department","Dept"],["experience_years","Exp"],["salary","Salary"],["finalPayable","Final Payable"],["mlSalary","ML Salary"],["attritionRisk","Attrition Risk"]].map(([field, label]) => (
                  <th key={field} style={thStyle(field)} onClick={() => handleSort(field)}>
                    {label}<SortIcon field={field} sortField={sortField} sortDir={sortDir} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((emp, idx) => (
                <tr key={idx} onClick={() => setSelectedEmp(emp)} style={{ background: idx % 2 === 0 ? "rgba(15,23,42,0.4)" : "transparent", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(59,130,246,0.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? "rgba(15,23,42,0.4)" : "transparent"}
                >
                  <td style={{ padding: "12px 14px", color: "#60a5fa", fontWeight: "600" }}>{emp.employee_id}</td>
                  <td style={{ padding: "12px 14px", color: "white", fontWeight: "500" }}>{emp.name}</td>
                  <td style={{ padding: "12px 14px", color: "#cbd5e1" }}>{emp.age}</td>
                  <td style={{ padding: "12px 14px" }}><span style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", padding: "2px 8px", color: "#94a3b8", fontSize: "12px" }}>{emp.department}</span></td>
                  <td style={{ padding: "12px 14px", color: "#cbd5e1" }}>{emp.experience_years}y</td>
                  <td style={{ padding: "12px 14px", color: "#e2e8f0" }}>{formatCurrency(parseFloat(emp.salary || 0))}</td>
                  <td style={{ padding: "12px 14px", color: "#60a5fa", fontWeight: "600" }}>{formatCurrency(emp.finalPayable)}</td>
                  <td style={{ padding: "12px 14px", color: "#a855f7" }}>{emp.mlSalary > 0 ? formatCurrency(emp.mlSalary) : <span style={{ color: "#475569" }}>—</span>}</td>
                  <td style={{ padding: "12px 14px" }}><RiskBadge risk={emp.attritionRisk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #334155", background: "#0f172a40" }}>
          <span style={{ color: "#64748b", fontSize: "12px" }}>
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              [<ChevronsLeft size={14} />, 1, currentPage === 1],
              [<ChevronLeft size={14} />, currentPage - 1, currentPage === 1],
              [<ChevronRight size={14} />, currentPage + 1, currentPage === totalPages],
              [<ChevronsRight size={14} />, totalPages, currentPage === totalPages],
            ].map(([icon, page, disabled], i) => (
              <button key={i} onClick={() => !disabled && setCurrentPage(page)} disabled={disabled}
                style={{ padding: "6px 10px", background: disabled ? "#0f172a" : "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: disabled ? "#475569" : "white", cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}>
                {icon}
              </button>
            ))}
            <span style={{ color: "#64748b", fontSize: "12px", display: "flex", alignItems: "center", marginLeft: "4px" }}>Page {currentPage} / {totalPages}</span>
          </div>
        </div>
      </div>

      {selectedEmp && <EmployeeModal emp={selectedEmp} onClose={() => setSelectedEmp(null)} />}
    </div>
  );
}
```

---

## Task 12: Refactor App.js

**Files:**
- Modify: `src/App.js` — replace all 1273 lines with thin orchestrator

- [ ] **Step 1: Replace App.js**

```jsx
// src/App.js
import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import AuthModal from "./components/AuthModal";
import Header from "./components/Header";
import UploadTab from "./components/UploadTab";
import DashboardTab from "./components/DashboardTab";
import PredictionsTab from "./components/PredictionsTab";
import AnalyticsTab from "./components/AnalyticsTab";
import { fetchPrediction } from "./hooks/usePredictions";
import { Upload, BarChart3, TrendingUp, Activity } from "lucide-react";

const INITIAL_USERS = [
  { email: "admin@prohr.com", password: "admin123", role: "admin", name: "Admin" },
  { email: "hr@prohr.com", password: "hr123", role: "hr", name: "HR User" },
];

const REVENUE_MULTIPLIER = 1.2;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function ProHRDashboard() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [authMode, setAuthMode] = useState("login");
  const [activeTab, setActiveTab] = useState("upload");
  const [stats, setStats] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = useCallback((file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => analyzeData(results.data),
      error: (err) => alert("CSV parse error: " + err.message),
    });
  }, []);

  const analyzeData = async (data) => {
    setLoading(true);

    const cleanData = data.filter((e) => e.employee_id && e.salary && !isNaN(parseFloat(e.salary)));
    const limitedData = cleanData.slice(0, 100);
    const total = cleanData.length;
    if (total === 0) { setLoading(false); alert("No valid employee data found."); return; }

    let totalBonuses = 0, totalDeductions = 0;

    const payroll = await Promise.all(
      limitedData.map(async (emp) => {
        const base = parseFloat(emp.salary || 0);
        const rating = Number(emp.performance_rating || 0);
        const leaves = Number(emp.unpaid_leaves || 0);
        const bonus = base * (rating / 10);
        const deduction = base * (leaves / 50);
        totalBonuses += bonus;
        totalDeductions += deduction;
        const finalPayable = Math.round(base + bonus - deduction);
        const { mlSalary, attritionRisk } = await fetchPrediction(emp);
        return { ...emp, salary: base, finalPayable, mlSalary, attritionRisk };
      })
    );

    const totalPayroll = payroll.reduce((s, p) => s + p.finalPayable, 0);
    const companyRevenue = totalPayroll * REVENUE_MULTIPLIER;

    setStats({
      totalEmployees: total,
      avgSalary: Math.round(cleanData.reduce((s, e) => s + parseFloat(e.salary || 0), 0) / total),
      totalPayroll: Math.round(totalPayroll),
      companyRevenue: Math.round(companyRevenue),
      projectedGain: Math.round(companyRevenue - totalPayroll),
      totalDeductions: Math.round(totalDeductions),
      totalBonuses: Math.round(totalBonuses),
      avgHolidaysUsed: 0,
      avgTasksCompleted: Math.round(cleanData.reduce((s, e) => s + parseFloat(e.total_tasks_completed || e.tasks_completed || 0), 0) / total),
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
    setTimeout(() => setActiveTab("dashboard"), 400);
  };

  if (!user) {
    return <AuthModal onAuthSuccess={setUser} users={users} setUsers={setUsers} mode={authMode} setMode={setAuthMode} />;
  }

  const tabActive = (tab) => ({
    padding: "9px 20px", borderRadius: "8px", fontWeight: "600", border: "none",
    cursor: tab === "upload" || stats ? "pointer" : "not-allowed",
    background: activeTab === tab ? "linear-gradient(to right, #2563eb, #7c3aed)" : "#1e293b",
    color: activeTab === tab ? "white" : (stats || tab === "upload") ? "#94a3b8" : "#475569",
    border: activeTab === tab ? "none" : "1px solid #334155",
    display: "flex", alignItems: "center", gap: "7px", fontSize: "14px",
    opacity: !stats && tab !== "upload" ? 0.5 : 1,
    transition: "all 0.2s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0a0f1e 0%, #0f172a 40%, #0d1b2a 100%)" }}>
      <Header user={user} onLogout={() => setUser(null)} />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
          <button style={tabActive("upload")} onClick={() => setActiveTab("upload")}><Upload size={16} /> Upload CSV</button>
          <button style={tabActive("dashboard")} onClick={() => stats && setActiveTab("dashboard")} disabled={!stats}><BarChart3 size={16} /> Dashboard</button>
          <button style={tabActive("predictions")} onClick={() => predictions && setActiveTab("predictions")} disabled={!predictions}><TrendingUp size={16} /> Predictions</button>
          <button style={tabActive("analytics")} onClick={() => predictions && setActiveTab("analytics")} disabled={!predictions}><Activity size={16} /> Analytics</button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ display: "inline-block", width: 52, height: 52, border: "4px solid #1e293b", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: "#64748b", marginTop: "16px", fontSize: "14px" }}>Analyzing employee data & running ML predictions...</p>
          </div>
        )}

        {/* Tab Content */}
        {!loading && activeTab === "upload" && <UploadTab onUpload={handleFileUpload} stats={stats} loading={loading} />}
        {!loading && activeTab === "dashboard" && stats && predictions && <DashboardTab stats={stats} payroll={predictions.payroll} />}
        {!loading && activeTab === "predictions" && predictions && <PredictionsTab predictions={predictions} />}
        {!loading && activeTab === "analytics" && predictions && <AnalyticsTab payroll={predictions.payroll} />}
      </div>
    </div>
  );
}
```

---

## Self-Review

**Spec coverage check:**
- ✅ Component architecture (App.js → 7 components)
- ✅ Utility functions (formatters.js, calculations.js)
- ✅ usePredictions hook (fetchPrediction)
- ✅ AuthModal — polished login/signup with error states, demo creds
- ✅ Header — user badge, role display, logout
- ✅ UploadTab — drag-drop, required columns, success state
- ✅ EmployeeModal — click row → full detail modal with gauges
- ✅ DashboardTab — 8 KPI cards, dept chart, salary distribution, attrition buckets, high risk widget, avg salary by dept
- ✅ AnalyticsTab (NEW) — dept attrition, salary vs experience, satisfaction dist, experience band risk, top performers, high risk list
- ✅ PredictionsTab — sortable columns, export CSV, risk badges, employee modal, better pagination
- ✅ Backend — health endpoint, better error handling, null-safe request parsing
- ✅ index.css — animations, scrollbars, modal backdrop, skeletons

**Placeholder scan:** None found — all steps have complete code.

**Type consistency:** `fetchPrediction` used in App.js matches export in usePredictions.js. `formatCurrency`, `getRiskLevel`, `getRatingColor` used in components match exports in formatters.js. All calculation functions used in DashboardTab/AnalyticsTab match exports in calculations.js.
