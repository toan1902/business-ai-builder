import { useState, useRef, useEffect, useCallback } from "react";

/* ─────────────────────────── DATA ─────────────────────────── */
const MODULES = [
  { id: "dashboard", icon: "🏠", label: "Dashboard Tổng quan", desc: "KPI, biểu đồ, thống kê",     color: "#6366f1" },
  { id: "crm",       icon: "👥", label: "CRM Khách hàng",      desc: "Leads, pipeline, lịch sử",  color: "#8b5cf6" },
  { id: "sales",     icon: "📈", label: "Bán hàng & POS",      desc: "Đơn hàng, doanh thu",        color: "#06b6d4" },
  { id: "invoice",   icon: "🧾", label: "Hóa đơn & Kế toán",  desc: "Xuất hóa đơn, thu chi",      color: "#10b981" },
  { id: "inventory", icon: "📦", label: "Kho hàng",            desc: "Tồn kho, nhập xuất",         color: "#f59e0b" },
  { id: "hr",        icon: "🏢", label: "Nhân sự HRM",         desc: "Chấm công, lương, KPI",      color: "#ec4899" },
  { id: "project",   icon: "🗂️", label: "Quản lý Dự án",      desc: "Task, deadline, Kanban",     color: "#14b8a6" },
  { id: "report",    icon: "📊", label: "Báo cáo BI",          desc: "Analytics, dashboard",       color: "#f97316" },
  { id: "ecommerce", icon: "🛒", label: "Thương mại điện tử",  desc: "Shop online, đơn hàng",      color: "#84cc16" },
  { id: "support",   icon: "💬", label: "Hỗ trợ Khách hàng",  desc: "Ticket, chatbot, FAQ",       color: "#a78bfa" },
  { id: "supply",    icon: "🚚", label: "Chuỗi Cung ứng",      desc: "NCC, đặt hàng, giao vận",   color: "#fb7185" },
  { id: "asset",     icon: "🖥️", label: "Quản lý Tài sản",    desc: "Thiết bị, bảo trì",         color: "#38bdf8" },
];

const THEMES = [
  { id: "modern",    label: "Hiện đại",     icon: "✨" },
  { id: "minimal",   label: "Tối giản",     icon: "◽" },
  { id: "corporate", label: "Doanh nghiệp", icon: "🏛️" },
  { id: "startup",   label: "Startup",      icon: "🚀" },
  { id: "luxury",    label: "Luxury",       icon: "💎" },
  { id: "dark",      label: "Dark Mode",    icon: "🌑" },
];

const STACKS = [
  { id: "react",   label: "React + Tailwind",  icon: "⚛️" },
  { id: "vue",     label: "Vue 3 + Vite",      icon: "💚" },
  { id: "html",    label: "HTML/CSS/JS thuần", icon: "🌐" },
  { id: "next",    label: "Next.js 14",         icon: "▲" },
  { id: "svelte",  label: "SvelteKit",          icon: "🔥" },
];

const QUICK_PROMPTS = [
  { icon: "🔍", text: "Thêm tìm kiếm & lọc dữ liệu" },
  { icon: "📱", text: "Cải thiện responsive mobile" },
  { icon: "🔐", text: "Thêm xác thực & phân quyền" },
  { icon: "📊", text: "Thêm biểu đồ chart analytics" },
  { icon: "📤", text: "Export Excel / PDF" },
  { icon: "🔔", text: "Thêm thông báo real-time" },
  { icon: "🌐", text: "Hỗ trợ đa ngôn ngữ i18n" },
  { icon: "🎨", text: "Nâng cấp UI/UX đẹp hơn" },
];

/* ── Builds AI prompt for a specific module ── */
function buildModulePrompt(modules, company, themeId, stackId, extra, targetId) {
  const mod        = MODULES.find(m => m.id === targetId);
  const themeLabel = THEMES.find(t => t.id === themeId)?.label  || themeId;
  const stackLabel = STACKS.find(s => s.id === stackId)?.label  || stackId;
  return `Bạn là senior fullstack engineer. Tạo module "${mod?.label}" cho hệ thống kinh doanh "${company || "Công ty ABC"}".

DỰ ÁN: ${modules.map(id => MODULES.find(m => m.id === id)?.label).join(", ")}
GIAO DIỆN: ${themeLabel} | STACK: ${stackLabel}
${extra ? `YÊU CẦU ĐẶC BIỆT: ${extra}` : ""}

TẠO MODULE "${mod?.label}" với:
1. Component React hoàn chỉnh, chạy được ngay lập tức
2. Mock data thực tế (tên người Việt, số liệu hợp lý, tiếng Việt)
3. CRUD đầy đủ (bảng danh sách, modal thêm/sửa, xác nhận xóa)
4. UI đẹp, professional, accent color ${mod?.color}
5. Loading states, empty states, error handling
6. Comment code rõ ràng bằng tiếng Việt

Trả lời: mô tả ngắn 2 dòng, rồi toàn bộ code trong \`\`\`jsx\n...\n\`\`\``;
}

/* ─────────────────────────── API CALL ─────────────────────────── */
/**
 * FIX #5 CORS: Gọi qua /api/chat (Vite proxy → localhost:3001)
 * thay vì gọi thẳng https://api.anthropic.com từ browser.
 */
async function callAnthropicAPI(messages, system) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.content?.find(b => b.type === "text")?.text || "Không có phản hồi.";
}

/* ─────────────────────────── UI HELPERS ─────────────────────────── */
function Spinner({ size = 16, color = "white" }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      border: "2px solid rgba(255,255,255,.15)", borderTopColor: color,
      borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block",
    }} />
  );
}

/* FIX #1: added dependency array [onDone] to prevent infinite re-render */
function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]); // ← was missing → caused infinite loop
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 9999,
      background: "linear-gradient(135deg,#059669,#10b981)",
      color: "white", padding: "10px 20px", borderRadius: 10,
      fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(16,185,129,.5)",
      animation: "fadeUp .25s ease",
    }}>✓ {msg}</div>
  );
}

function CodeBlock({ code, lang, onCopy }) {
  return (
    <div style={{ margin: "10px 0", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,.55)", padding: "6px 14px" }}>
        <span style={{ fontSize: 11, color: "#67e8f9", fontFamily: "monospace", fontWeight: 600 }}>{lang || "code"}</span>
        <button onClick={() => onCopy(code)} style={{
          background: "rgba(124,58,237,.3)", border: "1px solid rgba(124,58,237,.4)",
          color: "#c4b5fd", padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11,
        }}>📋 Copy</button>
      </div>
      <pre style={{
        background: "rgba(0,0,0,.55)", padding: "14px 16px", margin: 0, fontSize: 11.5,
        overflowX: "auto", color: "#e2e8f0",
        fontFamily: "'Fira Code','Cascadia Code','Courier New',monospace",
        lineHeight: 1.75, maxHeight: 420, overflowY: "auto",
      }}>{code}</pre>
    </div>
  );
}

function ChatMessage({ msg, onCopy }) {
  const parts = msg.content.split(/(```[\w]*\n[\s\S]*?```)/g);
  return (
    <div style={{
      display: "flex", justifyContent: msg.isUser ? "flex-end" : "flex-start",
      marginBottom: 18, animation: "fadeUp .25s ease",
    }}>
      {!msg.isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
          marginRight: 10, marginTop: 2,
          background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
        }}>🤖</div>
      )}
      <div style={{
        maxWidth: "82%",
        background: msg.isUser ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,.05)",
        border: msg.isUser ? "none" : "1px solid rgba(255,255,255,.08)",
        borderRadius: msg.isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
        padding: "11px 15px",
      }}>
        {msg.isLoading
          ? <div style={{ display: "flex", gap: 5, padding: "4px 2px" }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{
                  width: 7, height: 7, borderRadius: "50%", background: "#a78bfa",
                  animation: `bounce 1.1s ease ${d * .18}s infinite`,
                }} />
              ))}
            </div>
          : parts.map((part, pi) => {
              const cm = part.match(/^```(\w*)\n([\s\S]*)```$/);
              if (cm) return <CodeBlock key={pi} lang={cm[1]} code={cm[2]} onCopy={onCopy} />;
              return part.trim()
                ? <p key={pi} style={{ margin: "0 0 6px", fontSize: 13.5, lineHeight: 1.75, color: "#e2e8f0", whiteSpace: "pre-wrap" }}>{part}</p>
                : null;
            })
        }
      </div>
      {msg.isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
          marginLeft: 10, marginTop: 2,
          background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
        }}>👤</div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 5, display: "block" }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 9, padding: "10px 13px", color: "white", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
    </div>
  );
}

/* ─────────────────────────── MAIN APP ─────────────────────────── */
export default function App() {
  const [page, setPage]                       = useState("home");
  const [selectedModules, setSelectedModules] = useState([]);
  const [companyName, setCompanyName]         = useState("");
  const [industry, setIndustry]               = useState("");
  const [theme, setTheme]                     = useState("modern");
  const [stack, setStack]                     = useState("react");
  const [extra, setExtra]                     = useState("");
  const [messages, setMessages]               = useState([]);
  const [input, setInput]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [activeTab, setActiveTab]             = useState("chat");
  const [codeSnippets, setCodeSnippets]       = useState([]);
  const [moduleStatus, setModuleStatus]       = useState({});
  const [currentGenModule, setCurrentGenModule] = useState(null);
  const [toast, setToast]                     = useState(null);
  const [genQueue, setGenQueue]               = useState([]);
  const chatEndRef  = useRef(null);
  /* FIX #4: use ref for messages to avoid stale closure in callClaude */
  const messagesRef = useRef([]);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800;900&display=swap');
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes glow{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.75;transform:scale(1.04)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}
    @keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
    *{box-sizing:border-box} input,textarea{color-scheme:dark}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:rgba(255,255,255,.04)}
    ::-webkit-scrollbar-thumb{background:rgba(124,58,237,.5);border-radius:2px}
  `;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* FIX #4: keep ref in sync with state */
  const addMessage = useCallback((msg) => {
    setMessages(prev => {
      const next = [...prev, msg];
      messagesRef.current = next;
      return next;
    });
  }, []);

  const replaceLoadingMessage = useCallback((msg) => {
    setMessages(prev => {
      const next = [...prev.filter(m => !m.isLoading), msg];
      messagesRef.current = next;
      return next;
    });
  }, []);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setToast("Đã copy code!");
  }, []);

  const toggleModule = (id) =>
    setSelectedModules(p => p.includes(id) ? p.filter(m => m !== id) : [...p, id]);

  /* ── Chat send (uses ref to avoid stale closure) ── */
  const sendChatMessage = useCallback(async (userText) => {
    if (!userText.trim() || loading) return;
    setLoading(true);
    const userMsg = { role: "user", content: userText, isUser: true };
    addMessage(userMsg);

    // FIX #4: read from ref not from state closure
    const history = messagesRef.current
      .filter(m => !m.isLoading)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const reply = await callAnthropicAPI(history,
        "Bạn là senior software engineer chuyên hệ thống kinh doanh. Trả lời tiếng Việt. Code trong ```jsx. Mock data tiếng Việt.");
      addMessage({ role: "assistant", content: reply, isUser: false });

      // ✅ Tự động lưu code vào tab Code nếu AI trả về code block
      if (reply) {
        const codeMatches = [...reply.matchAll(/```(\w*)\n([\s\S]*?)```/g)];
        if (codeMatches.length > 0) {
          const txt = userText.toLowerCase();
          const moduleGuess =
            txt.includes("kho") ? "inventory" :
            txt.includes("bán") || txt.includes("pos") ? "sales" :
            txt.includes("dashboard") || txt.includes("tổng quan") ? "dashboard" :
            txt.includes("crm") || txt.includes("khách hàng") ? "crm" :
            txt.includes("hóa đơn") || txt.includes("kế toán") ? "invoice" :
            txt.includes("nhân sự") || txt.includes("hrm") ? "hr" :
            txt.includes("dự án") ? "project" :
            txt.includes("báo cáo") || txt.includes("bi") ? "report" :
            txt.includes("thương mại") || txt.includes("ecommerce") ? "ecommerce" :
            txt.includes("cung ứng") ? "supply" :
            txt.includes("tài sản") ? "asset" :
            txt.includes("hỗ trợ") ? "support" :
            "chat_" + Date.now();
          const mod = MODULES.find(m => m.id === moduleGuess) ||
            { id: moduleGuess, label: "Module từ chat", icon: "💬", color: "#6366f1" };
          setCodeSnippets(p => {
            const exists = p.find(s => s.moduleId === mod.id);
            const newSnippet = {
              moduleId: mod.id, moduleName: mod.label,
              lang: codeMatches[0][1] || "jsx",
              code: codeMatches[0][2],
              icon: mod.icon, color: mod.color,
            };
            return exists
              ? p.map(s => s.moduleId === mod.id ? newSnippet : s)
              : [...p, newSnippet];
          });
        }
      }
    } catch {
      addMessage({ role: "assistant", content: "❌ Lỗi kết nối. Vui lòng thử lại.", isUser: false });
    } finally {
      setLoading(false);
    }
  }, [loading, addMessage]);

  /* ── Generate one module ── */
  /* FIX #2: added setLoading(true) at the start; wrapped in try/finally */
  const generateModule = useCallback(async (moduleId) => {
    const mod = MODULES.find(m => m.id === moduleId);
    setCurrentGenModule(moduleId);
    setModuleStatus(p => ({ ...p, [moduleId]: "generating" }));
    setLoading(true); // ← FIX #2: was missing, caused queue to fire multiple times
    addMessage({
      role: "assistant",
      content: `⚡ Đang tạo module **${mod?.label}**...`,
      isUser: false, isLoading: true,
    });

    try {
      const prompt = buildModulePrompt(selectedModules, companyName, theme, stack, extra, moduleId);
      const reply  = await callAnthropicAPI(
        [{ role: "user", content: prompt }],
        "Senior fullstack engineer. Code React hoàn chỉnh trong ```jsx. Mock data tiếng Việt. Comment tiếng Việt."
      );
      replaceLoadingMessage({ role: "assistant", content: reply, isUser: false });

      const cm = [...reply.matchAll(/```(\w*)\n([\s\S]*?)```/g)];
      if (cm.length > 0) {
        setCodeSnippets(p => [...p, {
          moduleId, moduleName: mod?.label,
          lang: cm[0][1] || "jsx", code: cm[0][2],
          icon: mod?.icon, color: mod?.color,
        }]);
      }
      setModuleStatus(p => ({ ...p, [moduleId]: "done" }));
    } catch {
      replaceLoadingMessage({ role: "assistant", content: `❌ Lỗi tạo module ${mod?.label}. Thử lại?`, isUser: false });
      setModuleStatus(p => ({ ...p, [moduleId]: "error" }));
    } finally {
      // FIX #2: always runs, even on error
      setLoading(false);
      setCurrentGenModule(null);
    }
  }, [selectedModules, companyName, theme, stack, extra, addMessage, replaceLoadingMessage]);

  /* FIX #3: added generateModule to deps */
  useEffect(() => {
    if (genQueue.length > 0 && !loading && !currentGenModule) {
      const [next, ...rest] = genQueue;
      setGenQueue(rest);
      generateModule(next);
    }
  }, [genQueue, loading, currentGenModule, generateModule]); // ← FIX #3

  const startProject = async () => {
    if (!selectedModules.length) return;
    const init = {};
    selectedModules.forEach(id => { init[id] = "pending"; });
    setModuleStatus(init);
    setCodeSnippets([]); setMessages([]);
    messagesRef.current = [];
    setPage("chat"); setActiveTab("chat");

    const mLabels = selectedModules.map(id => MODULES.find(m => m.id === id)?.label).join(", ");
    const welcome = {
      role: "assistant",
      content: `🚀 **Khởi động dự án cho ${companyName || "công ty của bạn"}!**\n\nSẽ tạo ${selectedModules.length} module: ${mLabels}\n\n🎨 ${THEMES.find(t => t.id === theme)?.label} · ⚙️ ${STACKS.find(s => s.id === stack)?.label}\n\nĐang tạo module đầu tiên...`,
      isUser: false,
    };
    setMessages([welcome]);
    messagesRef.current = [welcome];

    await generateModule(selectedModules[0]);
    if (selectedModules.length > 1) setGenQueue(selectedModules.slice(1));
  };

  /* FIX #6: revokeObjectURL to prevent memory leak */
  const exportAll = useCallback(() => {
    const content = codeSnippets.map(s =>
      `// ══════════════════════════════════════\n// Module: ${s.moduleName}\n// ══════════════════════════════════════\n\n${s.code}`
    ).join("\n\n\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/javascript" }));
    const a   = document.createElement("a");
    a.href    = url;
    a.download = `${(companyName || "business").replace(/\s+/g, "-")}-system.jsx`;
    a.click();
    URL.revokeObjectURL(url); // ← FIX #6: was missing
    setToast("Export thành công!");
  }, [codeSnippets, companyName]);

  /* ═══════════ HOME ═══════════ */
  if (page === "home") return (
    <div style={{ minHeight: "100vh", background: "#060612", fontFamily: "'Sora','Segoe UI',sans-serif", color: "#e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative", overflow: "hidden" }}>
      <style>{CSS}</style>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "8%", left: "10%", width: 600, height: 600, background: "radial-gradient(circle,rgba(124,58,237,.16) 0%,transparent 70%)", animation: "glow 7s ease infinite" }} />
        <div style={{ position: "absolute", bottom: "5%", right: "8%", width: 700, height: 500, background: "radial-gradient(circle,rgba(6,182,212,.11) 0%,transparent 70%)", animation: "glow 9s ease 3s infinite" }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .05 }} xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0L0 0 0 60" fill="none" stroke="#818cf8" strokeWidth=".6" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 640 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,.12)", border: "1px solid rgba(124,58,237,.3)", borderRadius: 24, padding: "6px 18px", marginBottom: 28, animation: "fadeUp .5s ease" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#a78bfa", animation: "pulse 2s ease infinite" }} />
          <span style={{ fontSize: 12, color: "#c4b5fd", fontWeight: 700, letterSpacing: ".06em" }}>AI-POWERED VIBE CODING</span>
        </div>
        <h1 style={{ margin: "0 0 18px", fontSize: "clamp(34px,7vw,64px)", fontWeight: 900, lineHeight: 1.08, animation: "fadeUp .55s ease .08s both" }}>
          <span style={{ background: "linear-gradient(90deg,#c4b5fd 0%,#60a5fa 45%,#34d399 100%)", backgroundSize: "200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "gradShift 4s ease infinite" }}>
            Business AI Builder
          </span>
        </h1>
        <p style={{ margin: "0 0 44px", fontSize: "clamp(14px,2.2vw,18px)", color: "rgba(255,255,255,.48)", lineHeight: 1.75, animation: "fadeUp .55s ease .15s both" }}>
          Tạo toàn bộ hệ thống kinh doanh với AI chỉ trong vài phút.<br />
          Từ CRM, kế toán đến kho hàng — code sẵn sàng chạy.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 40, animation: "fadeUp .55s ease .22s both", textAlign: "left" }}>
          {[
            { icon: "⚡", title: "Tạo code thực tế", desc: "AI sinh component đầy đủ, mock data tiếng Việt" },
            { icon: "🧩", title: "12 Module ERP", desc: "Dashboard, CRM, Kho, Kế toán, HR, Dự án..." },
            { icon: "💬", title: "Chat tinh chỉnh", desc: "Thêm tính năng, sửa bug bất kỳ lúc nào" },
            { icon: "📤", title: "Export 1 click", desc: "Tải về source code, import vào dự án thật" },
          ].map((f, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 3 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setPage("builder")} style={{
          padding: "16px 52px", background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
          border: "none", borderRadius: 14, color: "white", fontSize: 16, fontWeight: 800,
          cursor: "pointer", boxShadow: "0 12px 40px rgba(124,58,237,.5)",
          animation: "fadeUp .55s ease .3s both", transition: "transform .2s,box-shadow .2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 18px 50px rgba(124,58,237,.65)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(124,58,237,.5)"; }}
        >🚀 Bắt đầu xây dựng</button>
      </div>
    </div>
  );

  /* ═══════════ BUILDER ═══════════ */
  if (page === "builder") return (
    <div style={{ minHeight: "100vh", background: "#060612", fontFamily: "'Sora','Segoe UI',sans-serif", color: "#e2e8f0", padding: "20px 16px 40px" }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button onClick={() => setPage("home")} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "8px 14px", color: "rgba(255,255,255,.6)", cursor: "pointer", fontSize: 12 }}>← Home</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, background: "linear-gradient(90deg,#c4b5fd,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>⚙️ Cấu Hình Dự Án</h1>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.35)" }}>Chọn modules và tùy chỉnh hệ thống của bạn</p>
          </div>
        </div>

        <Section title="🏢 Thông Tin Công Ty">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Tên công ty" value={companyName} onChange={setCompanyName} placeholder="VD: TechViet Solutions JSC" />
            <Field label="Ngành nghề" value={industry} onChange={setIndustry} placeholder="VD: Phân phối hàng tiêu dùng" />
          </div>
        </Section>

        <Section title={`🧩 Chọn Module (${selectedModules.length} đã chọn)`}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(165px,1fr))", gap: 10 }}>
            {MODULES.map(m => {
              const sel = selectedModules.includes(m.id);
              return (
                <button key={m.id} onClick={() => toggleModule(m.id)} style={{
                  background: sel ? `${m.color}18` : "rgba(255,255,255,.03)",
                  border: sel ? `1.5px solid ${m.color}55` : "1px solid rgba(255,255,255,.08)",
                  borderRadius: 12, padding: "12px 10px", cursor: "pointer", textAlign: "left",
                  transition: "all .2s", transform: sel ? "translateY(-2px)" : "none",
                  boxShadow: sel ? `0 6px 20px ${m.color}22` : "none",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 5 }}>{m.icon}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: sel ? m.color : "#e2e8f0", marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", lineHeight: 1.4 }}>{m.desc}</div>
                  {sel && <div style={{ marginTop: 6, fontSize: 11, color: "#10b981", fontWeight: 700 }}>✓ Đã chọn</div>}
                </button>
              );
            })}
          </div>
        </Section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Section title="🎨 Phong Cách Giao Diện">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setTheme(t.id)} style={{
                  padding: "7px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: theme === t.id ? "rgba(124,58,237,.25)" : "rgba(255,255,255,.04)",
                  border: theme === t.id ? "1px solid #a78bfa" : "1px solid rgba(255,255,255,.1)",
                  color: theme === t.id ? "#c4b5fd" : "rgba(255,255,255,.5)",
                }}>{t.icon} {t.label}</button>
              ))}
            </div>
          </Section>
          <Section title="⚙️ Tech Stack">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {STACKS.map(s => (
                <button key={s.id} onClick={() => setStack(s.id)} style={{
                  padding: "7px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: stack === s.id ? "rgba(6,182,212,.2)" : "rgba(255,255,255,.04)",
                  border: stack === s.id ? "1px solid #06b6d4" : "1px solid rgba(255,255,255,.1)",
                  color: stack === s.id ? "#67e8f9" : "rgba(255,255,255,.5)",
                }}>{s.icon} {s.label}</button>
              ))}
            </div>
          </Section>
        </div>

        <Section title="📝 Yêu Cầu Đặc Biệt (tùy chọn)">
          <textarea value={extra} onChange={e => setExtra(e.target.value)}
            placeholder="VD: Tích hợp VNPay, hỗ trợ đa ngôn ngữ VI/EN, dark mode, REST API..."
            rows={3} style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "11px 14px", color: "white", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical" }} />
        </Section>

        {selectedModules.length > 0 && (
          <div style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginBottom: 10 }}>✅ Tóm tắt dự án</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                { l: "🏢 Công ty", v: companyName || "Chưa đặt" },
                { l: "🧩 Modules", v: `${selectedModules.length} module` },
                { l: "🎨 UI", v: THEMES.find(t => t.id === theme)?.label },
                { l: "⚙️ Stack", v: STACKS.find(s => s.id === stack)?.label },
              ].map(({ l, v }) => (
                <div key={l} style={{ background: "rgba(255,255,255,.06)", borderRadius: 8, padding: "5px 12px", fontSize: 12 }}>
                  <span style={{ color: "rgba(255,255,255,.45)" }}>{l}: </span>
                  <strong style={{ color: "white" }}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={startProject} disabled={!selectedModules.length} style={{
          width: "100%", padding: "16px", fontSize: 16, fontWeight: 800,
          cursor: selectedModules.length ? "pointer" : "not-allowed",
          background: selectedModules.length ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,.08)",
          border: "none", borderRadius: 14,
          color: selectedModules.length ? "white" : "rgba(255,255,255,.3)",
          boxShadow: selectedModules.length ? "0 10px 32px rgba(124,58,237,.45)" : "none",
          transition: "all .2s",
        }}>⚡ Tạo Hệ Thống Ngay — {selectedModules.length} Module</button>
      </div>
    </div>
  );

  /* ═══════════ CHAT ═══════════ */
  const doneCount  = Object.values(moduleStatus).filter(s => s === "done").length;
  const pendingIds = selectedModules.filter(id => moduleStatus[id] === "pending");

  return (
    <div style={{ height: "100vh", background: "#060612", fontFamily: "'Sora','Segoe UI',sans-serif", color: "#e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{CSS}</style>
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.35)", backdropFilter: "blur(12px)", flexShrink: 0, flexWrap: "wrap" }}>
        <button onClick={() => setPage("builder")} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 7, padding: "6px 12px", color: "rgba(255,255,255,.6)", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>← Sửa</button>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "white", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>⚡ {companyName || "Hệ thống kinh doanh"}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)" }}>{THEMES.find(t => t.id === theme)?.label} · {STACKS.find(s => s.id === stack)?.label} · {doneCount}/{selectedModules.length} ✓</div>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {selectedModules.slice(0, 6).map(id => {
            const mod = MODULES.find(m => m.id === id);
            const st  = moduleStatus[id];
            return (
              <div key={id} style={{
                fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 10, display: "flex", alignItems: "center", gap: 3,
                background: st === "done" ? `${mod?.color}20` : st === "generating" ? "rgba(251,191,36,.18)" : "rgba(255,255,255,.06)",
                border: st === "done" ? `1px solid ${mod?.color}45` : st === "generating" ? "1px solid rgba(251,191,36,.4)" : "1px solid rgba(255,255,255,.1)",
                color: st === "done" ? mod?.color : st === "generating" ? "#fbbf24" : "rgba(255,255,255,.3)",
              }}>
                {st === "generating" && <Spinner size={8} color="#fbbf24" />}
                {st === "done" && "✓ "}{mod?.icon}
              </div>
            );
          })}
        </div>
        {codeSnippets.length > 0 && (
          <button onClick={exportAll} style={{ background: "rgba(16,185,129,.15)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 8, padding: "6px 12px", color: "#34d399", cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>📤 Export</button>
        )}
      </div>

      {/* BODY */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* SIDEBAR */}
        <div style={{ width: 195, borderRight: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.18)", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
          <div style={{ padding: "10px 10px 4px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.28)", letterSpacing: ".08em" }}>MODULES</div>
          {selectedModules.map(id => {
            const mod     = MODULES.find(m => m.id === id);
            const st      = moduleStatus[id];
            const hasCode = codeSnippets.some(s => s.moduleId === id);
            return (
              <div key={id} onClick={() => { if (hasCode) setActiveTab("code"); }}
                style={{ padding: "9px 10px", cursor: hasCode ? "pointer" : "default", borderRadius: 8, margin: "1px 6px", transition: "background .15s" }}
                onMouseEnter={e => { if (hasCode) e.currentTarget.style.background = "rgba(99,102,241,.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 14 }}>{mod?.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: st === "done" ? mod?.color : st === "generating" ? "#fbbf24" : "rgba(255,255,255,.45)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{mod?.label}</div>
                  </div>
                  <div style={{ flexShrink: 0, fontSize: 11 }}>
                    {st === "done"      && <span style={{ color: "#10b981" }}>✓</span>}
                    {st === "generating" && <Spinner size={9} color="#fbbf24" />}
                    {st === "pending"    && <span style={{ color: "rgba(255,255,255,.2)" }}>○</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {codeSnippets.length > 0 && (
            <>
              <div style={{ padding: "14px 10px 4px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.28)", letterSpacing: ".08em", borderTop: "1px solid rgba(255,255,255,.06)", marginTop: 8 }}>FILES</div>
              {codeSnippets.map(s => (
                <div key={s.moduleId} onClick={() => setActiveTab("code")} style={{ padding: "7px 10px", cursor: "pointer", borderRadius: 6, margin: "1px 6px", transition: "background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.45)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ color: s.color }}>▸</span>
                    <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{s.moduleId}.{s.lang}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.15)", flexShrink: 0 }}>
            {[{ id: "chat", icon: "💬", label: "Chat" }, { id: "code", icon: "</>", label: `Code (${codeSnippets.length})` }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "10px 20px", background: "transparent", border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #7c3aed" : "2px solid transparent",
                color: activeTab === tab.id ? "#c4b5fd" : "rgba(255,255,255,.4)",
                cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
              }}>{tab.icon} {tab.label}</button>
            ))}
          </div>

          {activeTab === "chat" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 8px" }}>
                {messages.map((msg, i) => <ChatMessage key={i} msg={msg} onCopy={copyToClipboard} />)}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding: "6px 20px 8px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,.05)" }}>
                {QUICK_PROMPTS.slice(0, 4).map(q => (
                  <button key={q.text} onClick={() => setInput(q.text)} style={{
                    padding: "5px 11px", background: "rgba(124,58,237,.12)", border: "1px solid rgba(124,58,237,.22)",
                    borderRadius: 16, color: "#c4b5fd", cursor: "pointer", fontSize: 11, fontWeight: 500,
                  }}>{q.icon} {q.text}</button>
                ))}
                {pendingIds.length > 0 && (
                  <button onClick={() => { if (!loading && !currentGenModule) generateModule(pendingIds[0]); }}
                    disabled={loading || !!currentGenModule}
                    style={{ padding: "5px 11px", background: "rgba(251,191,36,.12)", border: "1px solid rgba(251,191,36,.28)", borderRadius: 16, color: "#fbbf24", cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                    {loading && currentGenModule ? <Spinner size={9} color="#fbbf24" /> : "⚡"} Tạo tiếp ({pendingIds.length})
                  </button>
                )}
              </div>
              <div style={{ padding: "8px 20px 14px" }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { sendChatMessage(input); setInput(""); } }}
                    disabled={loading} placeholder="Thêm tính năng, sửa code, hỏi về kiến trúc..."
                    style={{ flex: 1, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "11px 14px", color: "white", fontSize: 13.5, outline: "none", fontFamily: "inherit" }}
                  />
                  <button onClick={() => { sendChatMessage(input); setInput(""); }} disabled={loading || !input.trim()} style={{
                    padding: "11px 20px",
                    background: loading || !input.trim() ? "rgba(255,255,255,.08)" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    border: "none", borderRadius: 12,
                    color: loading || !input.trim() ? "rgba(255,255,255,.3)" : "white",
                    cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                    fontWeight: 700, fontSize: 14, minWidth: 52, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {loading ? <Spinner size={16} /> : "→"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "code" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {codeSnippets.length === 0
                ? <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,.3)" }}>
                    <div style={{ fontSize: 52, marginBottom: 14 }}>📂</div>
                    <div style={{ fontSize: 14, marginBottom: 8 }}>Chưa có code nào được tạo</div>
                    <div style={{ fontSize: 12 }}>Chờ AI generate xong từng module</div>
                  </div>
                : <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#c4b5fd" }}>📦 {codeSnippets.length}/{selectedModules.length} Module</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 2 }}>Click Copy để lấy code từng module</div>
                      </div>
                      <button onClick={exportAll} style={{ background: "linear-gradient(135deg,#059669,#10b981)", border: "none", borderRadius: 9, padding: "8px 18px", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>📤 Export All</button>
                    </div>
                    {codeSnippets.map(s => (
                      <div key={s.moduleId} style={{ marginBottom: 32, animation: "fadeUp .3s ease" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: `${s.color}18`, border: `1px solid ${s.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{s.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.moduleName}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)" }}>src/modules/{s.moduleId}.{s.lang} · {s.code.split("\n").length} lines</div>
                          </div>
                          <button onClick={() => copyToClipboard(s.code)} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 7, padding: "6px 14px", color: "rgba(255,255,255,.6)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📋 Copy</button>
                        </div>
                        <pre style={{ background: "rgba(0,0,0,.5)", border: `1px solid ${s.color}20`, borderRadius: 12, padding: "16px", fontSize: 11.5, overflowX: "auto", color: "#e2e8f0", fontFamily: "'Fira Code','Cascadia Code','Courier New',monospace", lineHeight: 1.7, maxHeight: 460, overflowY: "auto", margin: 0 }}>
                          {s.code}
                        </pre>
                      </div>
                    ))}
                  </>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
