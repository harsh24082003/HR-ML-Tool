import React, { useState } from "react";

const REQUIRED_COLS = ["employee_id", "name", "salary", "department", "experience_years", "performance_rating"];
const OPTIONAL_COLS = ["age", "overtime_hours", "late_login_count", "unpaid_leaves", "job_satisfaction", "work_life_balance", "total_tasks_completed", "projects_handled"];

export default function UploadTab({ onUpload, stats, loading }) {
  const [dragOver, setDragOver] = useState(false);
  const [hovering, setHovering] = useState(false);

  const handleFile = (file) => {
    if (!file || !file.name.endsWith(".csv")) {
      alert("Please upload a valid .csv file");
      return;
    }
    onUpload(file);
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "8px 0 40px" }}>
      <style>{`
        @keyframes shimmerMove {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes successSlide {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes uploadBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .upload-zone:hover .upload-icon { animation: uploadBounce 0.7s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "rgba(99,102,241,0.1)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: 24, padding: "5px 16px", marginBottom: 16,
        }}>
          <span style={{ fontSize: 12 }}>✨</span>
          <span style={{ color: "#6366f1", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em" }}>
            ML-POWERED ANALYSIS
          </span>
        </div>

        <h1 style={{
          fontSize: 34,
          fontWeight: 900,
          margin: "0 0 10px",
          letterSpacing: "-0.03em",
          background: "linear-gradient(135deg, #1e293b 0%, #4f46e5 60%, #7c3aed 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          Upload Employee Data
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
          Drop your CSV and let AI analyze attrition risk, predict salaries &amp; surface insights
        </p>
      </div>

      {/* Main card */}
      <div style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(99,102,241,0.15)",
        borderRadius: 22,
        padding: 28,
        boxShadow: "0 8px 40px rgba(99,102,241,0.1), 0 1px 3px rgba(0,0,0,0.06)",
      }}>

        {/* Drop zone */}
        <div
          className="upload-zone"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onClick={() => document.getElementById("csv-upload-input").click()}
          style={{
            position: "relative",
            borderRadius: 16,
            padding: "44px 32px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.25s ease",
            overflow: "hidden",
            background: dragOver
              ? "linear-gradient(135deg, #ede9fe, #e0e7ff)"
              : hovering
              ? "linear-gradient(135deg, #f5f3ff, #eef2ff)"
              : "#fafaff",
            border: `2px dashed ${dragOver ? "#6366f1" : hovering ? "#a5b4fc" : "#c7d2fe"}`,
            boxShadow: dragOver || hovering
              ? "0 0 0 4px rgba(99,102,241,0.1)"
              : "none",
          }}
        >
          <input
            type="file"
            accept=".csv"
            id="csv-upload-input"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />

          {/* Shimmer */}
          {hovering && !dragOver && (
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "linear-gradient(105deg, transparent 40%, rgba(99,102,241,0.06) 50%, transparent 60%)",
              backgroundSize: "200% 100%",
              animation: "shimmerMove 1.8s linear infinite",
            }} />
          )}

          {/* Icon */}
          <div
            className="upload-icon"
            style={{
              width: 70, height: 70, borderRadius: "50%",
              background: dragOver
                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                : "linear-gradient(135deg, #e0e7ff, #ede9fe)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 18px",
              transition: "all 0.25s ease",
              boxShadow: dragOver
                ? "0 8px 24px rgba(99,102,241,0.4)"
                : "0 4px 12px rgba(99,102,241,0.15)",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                stroke={dragOver ? "#fff" : "#6366f1"}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p style={{ color: "#1e293b", fontSize: 17, fontWeight: 700, margin: "0 0 6px" }}>
            {dragOver ? "Release to analyze" : "Drop your CSV file here"}
          </p>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 22px" }}>
            or <span style={{ color: "#6366f1", fontWeight: 600 }}>click to browse</span> &bull; .csv files only
          </p>

          <button
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white", fontWeight: 700, fontSize: 13,
              padding: "10px 26px", borderRadius: 10, border: "none",
              boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
              cursor: "pointer",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Choose File
          </button>
        </div>

        {/* Columns */}
        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{
            background: "#f5f3ff",
            border: "1px solid #ddd6fe",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <p style={{ color: "#7c3aed", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px" }}>
              ✅ Required Columns
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {REQUIRED_COLS.map((col) => (
                <span key={col} style={{
                  background: "white", border: "1px solid #ddd6fe",
                  borderRadius: 6, padding: "3px 9px",
                  color: "#6d28d9", fontSize: 11,
                  fontFamily: "monospace", fontWeight: 600,
                }}>{col}</span>
              ))}
            </div>
          </div>

          <div style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <p style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px" }}>
              ⚡ Optional (better accuracy)
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {OPTIONAL_COLS.map((col) => (
                <span key={col} style={{
                  background: "white", border: "1px solid #e2e8f0",
                  borderRadius: 6, padding: "3px 9px",
                  color: "#94a3b8", fontSize: 11,
                  fontFamily: "monospace",
                }}>{col}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Success */}
        {!loading && stats && (
          <div style={{
            marginTop: 18,
            background: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
            border: "1px solid #6ee7b7",
            borderRadius: 14, padding: "16px 20px",
            display: "flex", alignItems: "center", gap: 14,
            animation: "successSlide 0.4s ease",
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: "rgba(16,185,129,0.15)", border: "1px solid #6ee7b7",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>✅</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#065f46", fontWeight: 800, fontSize: 14, margin: "0 0 2px" }}>
                Analysis Complete!
              </p>
              <p style={{ color: "#047857", fontSize: 13, margin: 0 }}>
                {stats.totalEmployees} employees analyzed — head to <strong>Dashboard</strong> to explore insights.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, flexShrink: 0 }}>
              {[
                { label: "Employees", val: stats.totalEmployees },
                { label: "Avg Salary", val: `₹${(stats.avgSalary / 1000).toFixed(1)}K` },
                { label: "Payroll", val: `₹${(stats.totalPayroll / 1000).toFixed(0)}K` },
                { label: "Avg Tasks", val: stats.avgTasksCompleted },
              ].map((s) => (
                <div key={s.label} style={{
                  background: "rgba(255,255,255,0.7)", borderRadius: 8,
                  padding: "5px 12px", textAlign: "center",
                }}>
                  <p style={{ color: "#059669", fontWeight: 800, fontSize: 13, margin: 0 }}>{s.val}</p>
                  <p style={{ color: "#6b7280", fontSize: 10, margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
