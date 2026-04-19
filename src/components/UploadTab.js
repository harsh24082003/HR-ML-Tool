import React, { useState } from "react";
import { Upload, CheckCircle, FileText, Sparkles } from "lucide-react";

const COLS = ["employee_id", "name", "salary", "department", "experience_years", "performance_rating"];
const OPTIONAL = ["age", "overtime_hours", "late_login_count", "unpaid_leaves", "job_satisfaction", "work_life_balance", "total_tasks_completed", "projects_handled"];

export default function UploadTab({ onUpload, stats, loading }) {
  const [dragOver, setDragOver] = useState(false);
  const [dropZoneHover, setDropZoneHover] = useState(false);

  const handleFile = (file) => {
    if (!file || !file.name.endsWith(".csv")) {
      alert("Please upload a valid .csv file");
      return;
    }
    onUpload(file);
  };

  return (
    <div className="fade-up" style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Heading */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 20,
          padding: "4px 14px",
          marginBottom: 16,
        }}>
          <Sparkles size={13} color="#2563eb" />
          <span style={{ color: "#2563eb", fontSize: 12, fontWeight: 600 }}>ML-Powered Analysis</span>
        </div>
        <h2 style={{ color: "#0f172a", fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.03em" }}>
          Upload Employee Data
        </h2>
        <p style={{ color: "#64748b", fontSize: 14 }}>
          Drop your CSV and let AI analyze attrition risk, predict salaries, and surface insights
        </p>
      </div>

      {/* Main card */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 20,
        padding: 32,
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onMouseEnter={() => setDropZoneHover(true)}
          onMouseLeave={() => setDropZoneHover(false)}
          onClick={() => document.getElementById("csv-input").click()}
          style={{
            border: `2px dashed ${dragOver ? "#3b82f6" : dropZoneHover ? "#93c5fd" : "#dde3ed"}`,
            borderRadius: 14,
            padding: "52px 32px",
            textAlign: "center",
            background: dragOver ? "#eff6ff" : dropZoneHover ? "#f5f8ff" : "#fafbff",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <input
            type="file"
            accept=".csv"
            id="csv-input"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />

          <div style={{
            background: dragOver ? "#dbeafe" : "#eff6ff",
            borderRadius: 14,
            width: 60,
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            transition: "all 0.2s ease",
            transform: dragOver ? "scale(1.08)" : "scale(1)",
          }}>
            <FileText size={28} color="#2563eb" />
          </div>

          <p style={{ color: "#0f172a", fontSize: 17, fontWeight: 700 }}>
            {dragOver ? "Release to upload" : "Drop your CSV file here"}
          </p>
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>
            or click to browse &bull; .csv files only
          </p>
        </div>

        {/* Required columns */}
        <div style={{ marginTop: 22 }}>
          <p style={{
            color: "#2563eb",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}>
            Required Columns
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
            {COLS.map((col) => (
              <span key={col} style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 6,
                padding: "3px 10px",
                color: "#1d4ed8",
                fontSize: 12,
                fontFamily: "monospace",
                fontWeight: 600,
              }}>
                {col}
              </span>
            ))}
          </div>

          <p style={{
            color: "#94a3b8",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 8,
          }}>
            Optional (for better ML accuracy)
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {OPTIONAL.map((col) => (
              <span key={col} style={{
                background: "#f8fafc",
                border: "1px solid #e8edf5",
                borderRadius: 6,
                padding: "3px 10px",
                color: "#94a3b8",
                fontSize: 12,
                fontFamily: "monospace",
              }}>
                {col}
              </span>
            ))}
          </div>
        </div>

        {/* Success state */}
        {!loading && stats && (
          <div className="fade-in" style={{
            marginTop: 22,
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: 12,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#059669",
          }}>
            <div style={{
              width: 36,
              height: 36,
              background: "rgba(16,185,129,0.12)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <CheckCircle size={20} color="#059669" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>Upload complete!</p>
              <p style={{ color: "#065f46", fontSize: 13, marginTop: 1 }}>
                {stats.totalEmployees} employees analyzed — switch to Dashboard to explore insights.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
