import React, { useState, useRef, useEffect } from "react";

const QUICK_ACTIONS = [
  { label: "🔴 High Risk", query: "show high risk employees" },
  { label: "🟢 Low Risk", query: "show low risk employees" },
  { label: "🏢 Dept Summary", query: "department summary" },
  { label: "🏆 Top Performers", query: "top performers" },
  { label: "💰 Salary Insights", query: "salary insights" },
  { label: "📊 Overall Stats", query: "overall stats" },
];

function buildResponse(input, predictions, stats, employees) {
  const q = input.toLowerCase().trim();
  const payroll = predictions?.payroll || [];

  if (!payroll.length) {
    return "📂 Please upload a CSV file first so I can analyze your employee data.";
  }

  // High risk
  if (q.includes("high risk") || q.includes("high attrition") || q.includes("leaving")) {
    const highRisk = payroll
      .filter((e) => e.attritionRisk > 70)
      .sort((a, b) => b.attritionRisk - a.attritionRisk)
      .slice(0, 5);

    if (!highRisk.length)
      return "✅ Great news! No employees are currently at high attrition risk (>70%).";

    const lines = highRisk.map(
      (e) =>
        `• ${e.name} (${e.department || "N/A"}) — Risk: ${e.attritionRisk}% | Salary: ₹${(e.salary || 0).toLocaleString()}`
    );
    return `🔴 **Top High-Risk Employees** (${payroll.filter((e) => e.attritionRisk > 70).length} total):\n\n${lines.join("\n")}\n\n💡 Consider salary revisions or engagement programs for these employees.`;
  }

  // Low risk
  if (q.includes("low risk") || q.includes("safe") || q.includes("stable")) {
    const lowRisk = payroll
      .filter((e) => e.attritionRisk < 30)
      .sort((a, b) => a.attritionRisk - b.attritionRisk)
      .slice(0, 5);

    if (!lowRisk.length)
      return "⚠️ No employees currently have very low attrition risk (<30%).";

    const lines = lowRisk.map(
      (e) =>
        `• ${e.name} (${e.department || "N/A"}) — Risk: ${e.attritionRisk}% | Tasks: ${e.total_tasks_completed || e.tasks_completed || 0}`
    );
    return `🟢 **Most Stable Employees** (${payroll.filter((e) => e.attritionRisk < 30).length} total):\n\n${lines.join("\n")}\n\n✨ These employees are highly engaged and retained.`;
  }

  // Medium risk
  if (q.includes("medium risk") || q.includes("moderate")) {
    const medRisk = payroll.filter((e) => e.attritionRisk >= 30 && e.attritionRisk <= 70);
    const lines = medRisk
      .sort((a, b) => b.attritionRisk - a.attritionRisk)
      .slice(0, 5)
      .map((e) => `• ${e.name} (${e.department || "N/A"}) — Risk: ${e.attritionRisk}%`);

    return `🟡 **Medium Risk Employees** (${medRisk.length} total):\n\n${lines.join("\n")}\n\n💡 Monitor these employees closely and address concerns early.`;
  }

  // Department summary
  if (q.includes("dept") || q.includes("department") || q.includes("team")) {
    const deptMap = {};
    payroll.forEach((e) => {
      const d = e.department || "Unknown";
      if (!deptMap[d]) deptMap[d] = { count: 0, totalRisk: 0, totalSalary: 0 };
      deptMap[d].count++;
      deptMap[d].totalRisk += e.attritionRisk || 0;
      deptMap[d].totalSalary += e.salary || 0;
    });

    const lines = Object.entries(deptMap)
      .sort((a, b) => b[1].totalRisk / b[1].count - a[1].totalRisk / a[1].count)
      .map(
        ([dept, data]) =>
          `• ${dept}: ${data.count} employees | Avg Risk: ${Math.round(data.totalRisk / data.count)}% | Avg Salary: ₹${Math.round(data.totalSalary / data.count).toLocaleString()}`
      );

    return `🏢 **Department Summary**:\n\n${lines.join("\n")}`;
  }

  // Top performers
  if (q.includes("top perform") || q.includes("best employee") || q.includes("performer")) {
    const top = payroll
      .sort(
        (a, b) =>
          (b.total_tasks_completed || b.tasks_completed || 0) -
          (a.total_tasks_completed || a.tasks_completed || 0)
      )
      .slice(0, 5);

    const lines = top.map(
      (e, i) =>
        `${i + 1}. ${e.name} (${e.department || "N/A"}) — Tasks: ${e.total_tasks_completed || e.tasks_completed || 0} | Rating: ${e.performance_rating || "N/A"}`
    );

    return `🏆 **Top 5 Performers by Tasks Completed**:\n\n${lines.join("\n")}\n\n⭐ These employees are your highest contributors!`;
  }

  // Salary insights
  if (q.includes("salary") || q.includes("pay") || q.includes("compensation") || q.includes("earning")) {
    const sorted = [...payroll].sort((a, b) => (b.salary || 0) - (a.salary || 0));
    const topEarners = sorted.slice(0, 3).map((e) => `• ${e.name}: ₹${(e.salary || 0).toLocaleString()}`);
    const lowEarners = sorted.slice(-3).map((e) => `• ${e.name}: ₹${(e.salary || 0).toLocaleString()}`);

    return `💰 **Salary Insights**:\n\nAvg Salary: ₹${(stats?.avgSalary || 0).toLocaleString()}\nTotal Payroll: ₹${(stats?.totalPayroll || 0).toLocaleString()}\n\n🔝 Top Earners:\n${topEarners.join("\n")}\n\n📉 Lowest Salaries:\n${lowEarners.join("\n")}`;
  }

  // Overall stats
  if (
    q.includes("overall") ||
    q.includes("stats") ||
    q.includes("summary") ||
    q.includes("overview") ||
    q.includes("total")
  ) {
    const highCount = payroll.filter((e) => e.attritionRisk > 70).length;
    const medCount = payroll.filter((e) => e.attritionRisk >= 30 && e.attritionRisk <= 70).length;
    const lowCount = payroll.filter((e) => e.attritionRisk < 30).length;

    return `📊 **Overall Report**:\n\nTotal Employees: ${stats?.totalEmployees || 0}\nAvg Salary: ₹${(stats?.avgSalary || 0).toLocaleString()}\nTotal Payroll: ₹${(stats?.totalPayroll || 0).toLocaleString()}\nTotal Bonuses: ₹${(stats?.totalBonuses || 0).toLocaleString()}\nTotal Deductions: ₹${(stats?.totalDeductions || 0).toLocaleString()}\n\n🔴 High Risk: ${highCount} employees\n🟡 Medium Risk: ${medCount} employees\n🟢 Low Risk: ${lowCount} employees`;
  }

  // Specific employee lookup
  const found = payroll.find(
    (e) =>
      e.name?.toLowerCase().includes(q) ||
      e.employee_id?.toLowerCase().includes(q)
  );
  if (found) {
    return `👤 **${found.name}** (${found.employee_id})\n\nDepartment: ${found.department || "N/A"}\nSalary: ₹${(found.salary || 0).toLocaleString()}\nFinal Payable: ₹${(found.finalPayable || 0).toLocaleString()}\nAttrition Risk: ${found.attritionRisk}%\nTasks Completed: ${found.total_tasks_completed || found.tasks_completed || 0}\nPerformance Rating: ${found.performance_rating || "N/A"}\nLeaves Taken: ${found.unpaid_leaves || found.holidays_taken || 0}`;
  }

  // Greetings
  if (q.match(/^(hi|hello|hey|helo|namaste|help)$/)) {
    return `👋 Hi! I'm your **ProHR Data Assistant**.\n\nI'm analyzing **${payroll.length} employees**. You can ask me:\n\n• "Show high risk employees"\n• "Department summary"\n• "Top performers"\n• "Salary insights"\n• Or type any employee name to look them up!`;
  }

  return `🤔 I didn't quite get that. Try asking:\n\n• "High risk employees"\n• "Low risk employees"\n• "Department summary"\n• "Top performers"\n• "Salary insights"\n• "Overall stats"\n• Or type an employee name!`;
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const lines = msg.text.split("\n");

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #9333ea, #6366f1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          🤖
        </div>
      )}
      <div
        style={{
          maxWidth: "80%",
          padding: "10px 14px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser
            ? "linear-gradient(135deg, #6366f1, #9333ea)"
            : "rgba(255,255,255,0.07)",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.1)",
          color: "white",
          fontSize: 13,
          lineHeight: 1.6,
          wordBreak: "break-word",
        }}
      >
        {lines.map((line, i) => {
          const isBold = line.startsWith("**") && line.includes("**");
          if (isBold) {
            const cleaned = line.replace(/\*\*/g, "");
            return (
              <p key={i} style={{ margin: "2px 0", fontWeight: 700, color: "#c4b5fd" }}>
                {cleaned}
              </p>
            );
          }
          if (line.trim() === "") return <br key={i} />;
          return (
            <p key={i} style={{ margin: "2px 0" }}>
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #9333ea, #6366f1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
        }}
      >
        🤖
      </div>
      <div
        style={{
          padding: "10px 16px",
          borderRadius: "18px 18px 18px 4px",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          gap: 5,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#9333ea",
              display: "inline-block",
              animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ChatBot({ predictions, stats, employees, isOpen, onClose }) {
  const payrollCount = predictions?.payroll?.length || 0;

  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: `👋 Hi! I'm your **ProHR Data Assistant**.\n\nI'm ready to analyze your employee data. Use the quick actions below or ask me anything!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = buildResponse(trimmed, predictions, stats, employees);
      setMessages((prev) => [...prev, { role: "bot", text: response }]);
      setIsTyping(false);
    }, 600 + Math.random() * 400);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chat-input:focus { outline: none; border-color: #9333ea !important; box-shadow: 0 0 0 2px rgba(147,51,234,0.2); }
        .quick-btn:hover { background: rgba(147,51,234,0.25) !important; border-color: #9333ea !important; transform: translateY(-1px); }
        .send-btn:hover { background: linear-gradient(135deg, #7e22ce, #4f46e5) !important; transform: scale(1.05); }
        .chat-close:hover { background: rgba(255,255,255,0.15) !important; }
        .chat-minimize:hover { background: rgba(255,255,255,0.15) !important; }
      `}</style>

      <div
        style={{
          position: "fixed",
          bottom: 100,
          right: 30,
          width: 370,
          height: isMinimized ? 0 : 500,
          background: "rgba(15, 23, 42, 0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 16,
          border: "1px solid rgba(147,51,234,0.3)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(147,51,234,0.1)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "chatSlideUp 0.25s ease",
          transition: "height 0.3s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #9333ea, #6366f1)",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
              }}
            >
              🤖
            </div>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>ProHR Assistant</div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>
                {payrollCount > 0 ? `Analyzing ${payrollCount} employees` : "Upload data to start"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="chat-minimize"
              onClick={() => setIsMinimized(!isMinimized)}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "white",
                width: 28,
                height: 28,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s",
              }}
            >
              —
            </button>
            <button
              className="chat-close"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "white",
                width: 28,
                height: 28,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "14px 14px 8px",
                scrollbarWidth: "thin",
                scrollbarColor: "#334155 transparent",
              }}
            >
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div
              style={{
                padding: "8px 14px",
                borderTop: "1px solid rgba(255,255,255,0.07)",
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.query}
                  className="quick-btn"
                  onClick={() => sendMessage(action.query)}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 20,
                    border: "1px solid rgba(147,51,234,0.3)",
                    background: "rgba(147,51,234,0.12)",
                    color: "#c4b5fd",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div
              style={{
                padding: "10px 14px 14px",
                borderTop: "1px solid rgba(255,255,255,0.07)",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                ref={inputRef}
                className="chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about employees..."
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  fontSize: 13,
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: "none",
                  background:
                    input.trim()
                      ? "linear-gradient(135deg, #9333ea, #6366f1)"
                      : "rgba(255,255,255,0.08)",
                  color: "white",
                  cursor: input.trim() ? "pointer" : "not-allowed",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
              >
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
