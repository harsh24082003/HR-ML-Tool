import React, { useState, useEffect } from "react";
import { BarChart3, LogOut, Shield, User } from "lucide-react";

export default function Header({ user, onLogout }) {
  const [scrolled, setScrolled] = useState(false);
  const [logoutHover, setLogoutHover] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderBottom: "1px solid rgba(226,232,240,0.7)",
      boxShadow: scrolled ? "0 1px 0 #e2e8f0, 0 4px 20px rgba(0,0,0,0.06)" : "none",
      transition: "box-shadow 0.3s ease",
    }}>
      {/* Top gradient accent line */}
      <div style={{
        height: 2,
        background: "linear-gradient(to right, #2563eb, #7c3aed, #2563eb)",
        backgroundSize: "200% 100%",
        animation: "gradientShift 4s ease infinite",
      }} />

      <div style={{
        maxWidth: 1340,
        margin: "0 auto",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        {/* Brand */}
        <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 38,
              height: 38,
              background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 10px rgba(37,99,235,0.25)",
            }}>
              <BarChart3 size={19} color="white" />
            </div>
            {/* Online indicator */}
            <div style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 8,
              height: 8,
              background: "#10b981",
              borderRadius: "50%",
              boxShadow: "0 0 0 2px white, 0 0 0 3px #10b981",
              animation: "glow 2s ease-in-out infinite",
            }} />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1.2, letterSpacing: "-0.3px" }}>
              ProHR <span className="gradient-text">Analytics</span>
            </h1>
            <p style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.02em" }}>Intelligent Workforce Platform</p>
          </div>
        </div>

        {/* User area */}
        <div className="fade-in d-2" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* User pill */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#f8fafc",
            border: "1px solid #e8edf5",
            borderRadius: 10,
            padding: "6px 12px",
          }}>
            {/* Avatar */}
            <div style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <User size={14} color="white" />
            </div>
            <div>
              <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{user.name}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                <Shield size={9} color="#2563eb" />
                <span style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 20,
                  padding: "1px 7px",
                  color: "#1d4ed8",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={onLogout}
            onMouseEnter={() => setLogoutHover(true)}
            onMouseLeave={() => setLogoutHover(false)}
            className="btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: logoutHover ? "#fef2f2" : "#fff",
              border: "1px solid #fecaca",
              borderRadius: 10,
              color: "#dc2626",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
