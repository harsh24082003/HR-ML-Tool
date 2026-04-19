import React, { useState } from "react";
import { LogIn, UserPlus, Eye, EyeOff, Shield, Zap } from "lucide-react";

export default function AuthModal({ onAuthSuccess, users, setUsers, mode, setMode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("hr");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) { setError("Invalid email or password"); setIsSubmitting(false); return; }
    onAuthSuccess(found);
  };

  const handleSignup = async () => {
    setIsSubmitting(true);
    if (!name || !email || !password) { setError("All fields are required"); setIsSubmitting(false); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters"); setIsSubmitting(false); return; }
    if (users.some((u) => u.email === email)) { setError("Email already registered"); setIsSubmitting(false); return; }
    await new Promise((r) => setTimeout(r, 400));
    const newUser = { name, email, password, role };
    setUsers((prev) => [...prev, newUser]);
    onAuthSuccess(newUser);
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    marginBottom: 14,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    color: "#0f172a",
    fontSize: 14,
    outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {/* Floating particles — subtle pastel */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position: "fixed",
          width: 4 + i * 2, height: 4 + i * 2,
          borderRadius: "50%",
          background: i % 2 === 0 ? "rgba(37,99,235,0.10)" : "rgba(124,58,237,0.09)",
          top: `${15 + i * 13}%`,
          left: `${5 + i * 15}%`,
          animation: `float ${3 + i}s ease-in-out infinite`,
          animationDelay: `${i * 0.5}s`,
          pointerEvents: "none",
        }} />
      ))}
      {[...Array(4)].map((_, i) => (
        <div key={`r${i}`} style={{
          position: "fixed",
          width: 3 + i * 3, height: 3 + i * 3,
          borderRadius: "50%",
          background: i % 2 === 0 ? "rgba(8,145,178,0.09)" : "rgba(16,185,129,0.09)",
          top: `${60 + i * 9}%`,
          right: `${5 + i * 12}%`,
          animation: `float ${4 + i}s ease-in-out infinite`,
          animationDelay: `${i * 0.7}s`,
          pointerEvents: "none",
        }} />
      ))}

      <div className="scale-in" style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 2 }}>
        {/* Glow behind card */}
        <div style={{
          position: "absolute",
          inset: -24,
          borderRadius: 32,
          background: "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(124,58,237,0.08))",
          filter: "blur(32px)",
          zIndex: -1,
        }} />

        <div style={{
          background: "#ffffff",
          border: "1px solid rgba(226,232,240,0.9)",
          borderRadius: 24,
          padding: "40px 36px",
          boxShadow: "0 8px 32px rgba(37,99,235,0.1), 0 1px 3px rgba(0,0,0,0.05)",
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
              <div style={{
                width: 60,
                height: 60,
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
              }}>
                <Shield size={28} color="white" />
              </div>
              <div className="float" style={{
                position: "absolute", top: -8, right: -8,
                width: 22, height: 22,
                background: "linear-gradient(135deg, #10b981, #059669)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(16,185,129,0.35)",
              }}>
                <Zap size={11} color="white" />
              </div>
            </div>
            <h1 className="gradient-text" style={{ fontSize: 22, fontWeight: 800 }}>ProHR Analytics</h1>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>
              {mode === "login" ? "Sign in to your workspace" : "Create your account"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="fade-in" style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "11px 14px",
              marginBottom: 16,
              color: "#dc2626",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span>✕</span> {error}
            </div>
          )}

          {mode === "signup" && (
            <input
              placeholder="Full Name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              style={inputStyle}
            />
          )}
          <input
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            style={inputStyle}
          />
          <div style={{ position: "relative", marginBottom: 14 }}>
            <input
              placeholder="Password"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              style={{ ...inputStyle, marginBottom: 0, paddingRight: 46 }}
            />
            <button
              onClick={() => setShowPass(!showPass)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", padding: 4 }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
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
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: 13,
              border: "none",
              borderRadius: 11,
              color: "white",
              fontWeight: 700,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {isSubmitting ? (
              <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            ) : (
              mode === "login" ? <><LogIn size={17} /> Sign In</> : <><UserPlus size={17} /> Create Account</>
            )}
          </button>

          <p style={{ textAlign: "center", marginTop: 22, color: "#64748b", fontSize: 13 }}>
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <span
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              style={{ color: "#2563eb", cursor: "pointer", fontWeight: 700 }}
            >
              {mode === "login" ? "Sign up free" : "Sign in"}
            </span>
          </p>

          {mode === "login" && (
            <div style={{
              marginTop: 22,
              background: "#f8fafc",
              border: "1px solid #e8edf5",
              borderRadius: 12,
              padding: 14,
            }}>
              <p style={{ marginBottom: 8, color: "#2563eb", fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Demo Credentials
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[["admin@prohr.com", "admin123", "Admin"], ["hr@prohr.com", "hr123", "HR User"]].map(([e, p, label]) => (
                  <button
                    key={e}
                    onClick={() => { setEmail(e); setPassword(p); setError(""); }}
                    style={{
                      background: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "8px 10px",
                      cursor: "pointer",
                      color: "#334155",
                      fontSize: 11,
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(ev) => ev.currentTarget.style.background = "#eff6ff"}
                    onMouseLeave={(ev) => ev.currentTarget.style.background = "white"}
                  >
                    <div style={{ color: "#2563eb", fontWeight: 600, marginBottom: 2 }}>{label}</div>
                    <div style={{ color: "#64748b" }}>{p}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
