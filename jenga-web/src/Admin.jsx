// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  JENGA ADMIN — Panneau d’administration séparé                          ║
// ║  Déployer sur : admin.jenga.app (domaine séparé de l’app client)         ║
// ║  Accès : protégé par JWT côté backend (mot de passe ici pour le MVP)     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { useState, useCallback, useEffect } from "react";

// ─── Config ─────────────────────────────────────────────────────────────────
const BACKEND_URL = ""; // Ex: "https://api.jenga.app" — à remplir par le dev
const ADMIN_SECRET = "jenga-admin-2026"; // À remplacer par JWT en production

// ─── Palette admin (sombre, distinct de l’app client) ────────────────────────
const A = {
  bg:        "#0E1117",
  surface:   "#161B27",
  surfaceAlt:"#1C2333",
  border:    "#252D3D",
  ink:       "#F0F4FF",
  inkSoft:   "#8893AA",
  inkFaint:  "#4A5568",
  navy:      "#1E2A78",
  gold:      "#CAA546",
  goldSoft:  "#2A2210",
  green:     "#22C55E",
  greenSoft: "#0D2818",
  red:       "#EF4444",
  redSoft:   "#2A0D0D",
  blue:      "#3B82F6",
  blueSoft:  "#0D1A2A",
  purple:    "#A855F7",
};

const FONT = "'Inter','Segoe UI',Arial,sans-serif";
const FONT_MONO = "'JetBrains Mono','Fira Mono',monospace";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n);
const pct = (a, b) => b ? `${Math.round(a / b * 100)}%` : "0%";

function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

// ─── API backend ─────────────────────────────────────────────────────────────
const api = {
  enabled: () => !!BACKEND_URL,
  get: async (path) => {
    if (!BACKEND_URL) throw new Error("Backend non configuré");
    const r = await fetch(`${BACKEND_URL}${path}`, {
      headers: { "x-admin-token": ADMIN_SECRET }
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  post: async (path, body) => {
    if (!BACKEND_URL) throw new Error("Backend non configuré");
    const r = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": ADMIN_SECRET },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
};

// ─── Mock data (actif si backend non configuré) ───────────────────────────────
const MOCK = {
  stats: {
    users: 847,        usersGrowth: "+12%",
    revenue: 2340000,  revenueGrowth: "+23%",
    monthRevenue: 410000,
    appsGenerated: 3284,
    apkBuilt: 142,
    visualsGenerated: 8920,
    activePlans: { free:601, starter:128, pro:89, business:29 },
    apiCostEstimate: 186000,
    avgCostPerGen: 57,
  },
  users: [
    {id:"u1", name:"Kofi Mensah",      email:"kofi@example.com",    plan:"pro",      credits:142, images:38,  joined:"12 Jan 2026", status:"active",   spent:45000,  appsGen:38},
    {id:"u2", name:"Fatou Diallo",     email:"fatou@example.com",   plan:"starter",  credits:31,  images:9,   joined:"03 Fév 2026", status:"active",   spent:15000,  appsGen:21},
    {id:"u3", name:"Jean-Paul Amoah",  email:"jean@example.com",    plan:"business", credits:280, images:95,  joined:"18 Jan 2026", status:"active",   spent:105000, appsGen:112},
    {id:"u4", name:"Amina Traoré",     email:"amina@example.com",   plan:"free",     credits:4,   images:1,   joined:"28 Fév 2026", status:"active",   spent:0,      appsGen:4},
    {id:"u5", name:"Rodrigue Gbéto",   email:"rod@example.com",     plan:"pro",      credits:0,   images:12,  joined:"05 Mar 2026", status:"suspended",spent:30000,  appsGen:29},
    {id:"u6", name:"Marie Kouassi",    email:"marie@example.com",   plan:"starter",  credits:58,  images:14,  joined:"15 Mar 2026", status:"active",   spent:15000,  appsGen:18},
    {id:"u7", name:"Ibrahim Bah",      email:"ibrahim@example.com", plan:"pro",      credits:95,  images:42,  joined:"02 Avr 2026", status:"active",   spent:45000,  appsGen:67},
    {id:"u8", name:"Céleste Kpade",    email:"celeste@example.com", plan:"free",     credits:11,  images:2,   joined:"10 Mai 2026", status:"active",   spent:0,      appsGen:8},
  ],
  payments: [
    {id:"p1", user:"Kofi Mensah",     type:"Plan Pro — Mensuel",     amount:15000, date:"01 Jun 2026", method:"CinetPay",    status:"success"},
    {id:"p2", user:"Jean-Paul Amoah", type:"Plan Business — Mensuel", amount:35000, date:"01 Jun 2026", method:"Flutterwave", status:"success"},
    {id:"p3", user:"Fatou Diallo",    type:"50 crédits apps",         amount:6000,  date:"30 Mai 2026", method:"Wave",        status:"success"},
    {id:"p4", user:"Ibrahim Bah",     type:"Plan Pro — Mensuel",      amount:15000, date:"01 Jun 2026", method:"MTN",         status:"success"},
    {id:"p5", user:"Rodrigue Gbéto",  type:"30 crédits visuels",      amount:2500,  date:"10 Mai 2026", method:"CinetPay",    status:"failed"},
    {id:"p6", user:"Marie Kouassi",   type:"Plan Starter — Mensuel",  amount:5000,  date:"15 Mai 2026", method:"MTN",         status:"success"},
    {id:"p7", user:"Amina Traoré",    type:"15 crédits apps",         amount:2000,  date:"28 Mai 2026", method:"Orange",      status:"success"},
    {id:"p8", user:"Kofi Mensah",     type:"Plan Pro — Mensuel",      amount:15000, date:"01 Mai 2026", method:"CinetPay",    status:"success"},
  ],
  apiKeys: [
    {name:"Anthropic",   key:"ANTHROPIC_API_KEY",   desc:"Génération d’apps (Claude)",    status:"active",  cost:"57 F/gen"},
    {name:"Replicate",   key:"REPLICATE_API_TOKEN", desc:"Images Flux / Ideogram",         status:"missing", cost:"20-60 F/img"},
    {name:"Vercel",      key:"VERCEL_TOKEN",         desc:"Déploiement web",                status:"missing", cost:"Gratuit"},
    {name:"Supabase",    key:"SUPABASE_*",            desc:"Base de données",               status:"missing", cost:"Gratuit"},
    {name:"CinetPay",    key:"CINETPAY_*",            desc:"Paiements Afrique francophone", status:"missing", cost:"% commission"},
    {name:"Flutterwave", key:"FLUTTERWAVE_*",         desc:"Paiements panafricains",        status:"missing", cost:"% commission"},
    {name:"Expo EAS",    key:"EXPO_TOKEN",            desc:"Build APK / AAB / IPA",         status:"missing", cost:"~30$/mois"},
    {name:"Resend",      key:"RESEND_API_KEY",        desc:"Emails & reçus",                status:"missing", cost:"Gratuit → payant"},
  ],
  plans: [
    {id:"free",     name:"Free",    price:0,      credits:15,  users:601, color:"#6B7280"},
    {id:"starter",  name:"Starter", price:5000,   credits:60,  users:128, color:"#16A34A"},
    {id:"pro",      name:"Pro",     price:15000,  credits:180, users:89,  color:"#CAA546"},
    {id:"business", name:"Business",price:35000,  credits:450, users:29,  color:"#1E2A78"},
  ],
  support: [
    {id:"s1", user:"Amina Traoré",  message:"Bonjour, comment je télécharge mon application en APK ?", status:"ouvert",  date:"Aujourd'hui, 09:14"},
    {id:"s2", user:"Rodrigue Gbéto", message:"Mon paiement Mobile Money a échoué mais j'ai été débité.", status:"ouvert",  date:"Aujourd'hui, 08:02"},
    {id:"s3", user:"Marie Kouassi",  message:"Est-ce que je peux changer la langue de mon app après création ?", status:"attente", date:"Hier, 17:45"},
    {id:"s4", user:"Kofi Mensah",    message:"Super outil ! Comment je passe au plan Business ?", status:"resolu",  date:"12 Jun 2026"},
    {id:"s5", user:"Céleste Kpade",  message:"Le studio graphique ne génère pas mon logo en haute définition.", status:"resolu",  date:"11 Jun 2026"},
  ],
};

// ─── Composants UI admin ──────────────────────────────────────────────────────
function Stat({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 14, padding: "20px 22px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: A.inkFaint, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || A.ink, fontFamily: FONT, letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: A.inkSoft, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Badge({ children, color, bg }) {
  return <span style={{ padding: "3px 10px", background: bg || color + "22", color: color, borderRadius: 20, fontSize: 11, fontWeight: 700, display: "inline-block" }}>{children}</span>;
}

function Toast({ msg, color }) {
  return <div style={{ position: "fixed", top: 20, right: 24, background: color, color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>{msg}</div>;
}

// ─── ÉCRAN DE LOGIN ADMIN ─────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!pwd.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    if (pwd === ADMIN_SECRET) { onLogin(); }
    else { setErr(true); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: A.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ width: 400, background: A.surface, borderRadius: 20, padding: 40, border: `1px solid ${A.border}`, boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: `linear-gradient(140deg,${A.navy},#16205C)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="38" height="38" viewBox="0 0 100 100">
              <path d="M50 14 L78 30 L78 70 L50 86 L22 70 L22 30 Z" fill={A.gold} />
              <path d="M46 36 L58 36 L58 58 Q58 67 49.5 67 Q42 67 41 59.5 L47.5 59.5 Q48.5 61 50 61 Q51 61 51 58 L51 42 L46 42 Z" fill={A.navy} />
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: A.ink }}>Jenga Admin</div>
          <div style={{ fontSize: 13, color: A.inkSoft, marginTop: 4 }}>Panneau de contrôle — accès restreint</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: A.inkSoft, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Mot de passe administrateur</div>
          <input type="password" value={pwd} onChange={e => { setPwd(e.target.value); setErr(false); }}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="••••••••••••••"
            style={{ width: "100%", padding: "13px 15px", background: A.surfaceAlt, border: `1.5px solid ${err ? A.red : A.border}`, borderRadius: 11, fontSize: 14, color: A.ink, outline: "none", fontFamily: FONT, boxSizing: "border-box" }} />
          {err && <div style={{ fontSize: 12, color: A.red, marginTop: 6 }}>❌ Mot de passe incorrect.</div>}
        </div>
        <button onClick={submit} disabled={loading || !pwd.trim()} style={{ width: "100%", padding: "14px", background: loading ? A.inkFaint : A.navy, color: "#fff", border: "none", borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: FONT }}>
          {loading ? "Vérification..." : "Accéder au panneau"}
        </button>
        <div style={{ fontSize: 12, color: A.inkFaint, textAlign: "center", marginTop: 20 }}>Attention : cet espace est réservé à l’administrateur Jenga. Tout accès non autorisé est interdit.</div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ADMIN COMPLET ──────────────────────────────────────────────────
const TABS = [
  { id: "overview",  label: "Vue d'ensemble" },
  { id: "users",     label: "Utilisateurs" },
  { id: "revenue",   label: "Revenus" },
  { id: "credits",   label: "Crédits" },
  { id: "plans",     label: "Plans" },
  { id: "support",   label: "Support" },
  { id: "broadcast", label: "Annonces" },
  { id: "system",    label: "Système & API" },
  { id: "logs",      label: "Logs" },
];

function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState(MOCK.users);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [grantUser, setGrantUser] = useState(null);
  const [grantAmt, setGrantAmt] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [sideOpen, setSideOpen] = useState(true);
  const [bcTarget, setBcTarget] = useState("Tous");
  const [bcMsg, setBcMsg] = useState("");
  const w = useWindowWidth();
  const isWide = w >= 960;

  const showToast = (msg, color = A.green) => { setToast({ msg, color }); setTimeout(() => setToast(null), 3000); };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchPlan = planFilter === "all" || u.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const totalRevenue = MOCK.payments.filter(p => p.status === "success").reduce((a, p) => a + p.amount, 0);
  const monthRevenue = MOCK.payments.filter(p => p.status === "success" && p.date.includes("Jun")).reduce((a, p) => a + p.amount, 0);

  const grantCredits = () => {
    const n = parseInt(grantAmt) || 0;
    if (!n || !grantUser) return;
    setUsers(us => us.map(u => u.id === grantUser.id ? { ...u, credits: u.credits + n } : u));
    showToast(`+${n} crédits offerts à ${grantUser.name}`);
    setGrantUser(null); setGrantAmt("");
  };

  const toggleStatus = (u) => {
    const next = u.status === "active" ? "suspended" : "active";
    setUsers(us => us.map(x => x.id === u.id ? { ...x, status: next } : x));
    showToast(`${next === "active" ? "Réactivé" : "Suspendu"} : ${u.name}`, next === "active" ? A.green : A.red);
  };

  const planColor = { free: "#6B7280", starter: "#16A34A", pro: A.gold, business: A.navy };

  const inp = { padding: "10px 14px", background: A.surfaceAlt, border: `1px solid ${A.border}`, borderRadius: 10, fontSize: 13.5, color: A.ink, outline: "none", fontFamily: FONT };

  return (
    <div style={{ minHeight: "100vh", background: A.bg, display: "flex", fontFamily: FONT, color: A.ink }}>

      {/* ── Sidebar ── */}
      <div style={{ width: isWide ? 220 : (sideOpen ? 220 : 0), background: A.surface, borderRight: `1px solid ${A.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden", transition: "width .2s", position: isWide ? "relative" : "fixed", top: 0, left: 0, bottom: 0, zIndex: 100 }}>
        {/* Brand */}
        <div style={{ padding: "24px 20px 16px", borderBottom: `1px solid ${A.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(140deg,${A.navy},#16205C)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 100 100"><path d="M50 14 L78 30 L78 70 L50 86 L22 70 L22 30 Z" fill={A.gold} /><path d="M46 36 L58 36 L58 58 Q58 67 49.5 67 Q42 67 41 59.5 L47.5 59.5 Q48.5 61 50 61 Q51 61 51 58 L51 42 L46 42 Z" fill={A.navy} /></svg>
            </div>
            <div><div style={{ fontSize: 15, fontWeight: 800, color: A.ink }}>Jenga</div><div style={{ fontSize: 10, color: A.gold, fontWeight: 700, letterSpacing: "1px" }}>ADMIN PANEL</div></div>
          </div>
        </div>
        {/* Nav */}
        <div style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {TABS.map(t => <button key={t.id} onClick={() => { setTab(t.id); if (!isWide) setSideOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: tab === t.id ? A.navy + "33" : "transparent", border: tab === t.id ? `1px solid ${A.navy}55` : "1px solid transparent", borderRadius: 10, color: tab === t.id ? A.gold : A.inkSoft, cursor: "pointer", fontSize: 13.5, fontWeight: tab === t.id ? 700 : 400, marginBottom: 3, textAlign: "left" }}>
            {t.label}
          </button>)}
        </div>
        {/* Footer */}
        <div style={{ padding: "12px 8px", borderTop: `1px solid ${A.border}` }}>
          <div style={{ padding: "8px 14px", background: A.surfaceAlt, borderRadius: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: A.inkFaint }}>Connecté en tant qu'</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: A.gold }}>Administrateur</div>
            <div style={{ fontSize: 11, color: A.inkFaint }}>Lionel Eric SAMSON</div>
          </div>
          <button onClick={onLogout} style={{ width: "100%", padding: "10px 14px", background: A.redSoft, border: `1px solid ${A.red}33`, borderRadius: 10, color: A.red, cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left" }}>
            Se déconnecter
          </button>
        </div>
      </div>

      {/* ── Contenu principal ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ background: A.surface, borderBottom: `1px solid ${A.border}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!isWide && <button onClick={() => setSideOpen(s => !s)} style={{ background: "none", border: "none", color: A.inkSoft, cursor: "pointer", fontSize: 20 }}>Menu</button>}
            <div style={{ fontSize: 16, fontWeight: 700, color: A.ink }}>{TABS.find(t => t.id === tab)?.label}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ padding: "6px 14px", background: api.enabled() ? A.greenSoft : A.redSoft, border: `1px solid ${api.enabled() ? A.green : A.red}44`, borderRadius: 20, fontSize: 12, fontWeight: 700, color: api.enabled() ? A.green : A.red }}>
              {api.enabled() ? "Backend connecté" : "Mode démo"}
            </div>
          </div>
        </div>

        {/* Main scroll area */}
        <div style={{ flex: 1, overflow: "auto", padding: isWide ? "28px 32px" : "18px 16px" }}>
          {toast && <Toast {...toast} />}

          {/* ══ VUE D’ENSEMBLE ══ */}
          {tab === "overview" && <>
            <div style={{ display: "grid", gridTemplateColumns: isWide ? "repeat(4,1fr)" : "1fr 1fr", gap: 14, marginBottom: 24 }}>
              <Stat label="Utilisateurs total" value={fmt(MOCK.stats.users)} sub={`${MOCK.stats.usersGrowth} ce mois`} color={A.blue} />
              <Stat label="Revenus ce mois" value={`${fmt(monthRevenue)} F`} sub="Juin 2026" color={A.green} />
              <Stat label="Revenus total" value={`${fmt(totalRevenue)} F`} sub="Depuis le lancement" color={A.gold} />
              <Stat label="Coût API estimé" value={`${fmt(MOCK.stats.apiCostEstimate)} F`} sub={`~${MOCK.stats.avgCostPerGen} F/génération`} color={A.red} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isWide ? "repeat(3,1fr)" : "1fr", gap: 14, marginBottom: 24 }}>
              <Stat label="Apps générées" value={fmt(MOCK.stats.appsGenerated)} sub="Total" />
              <Stat label="APK construits" value={fmt(MOCK.stats.apkBuilt)} sub="Fichiers réels" />
              <Stat label="Visuels créés" value={fmt(MOCK.stats.visualsGenerated)} sub="Flyers, logos, photos" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isWide ? "1fr 1fr" : "1fr", gap: 18 }}>
              {/* Répartition plans */}
              <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 14, padding: "22px 24px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: A.ink, marginBottom: 18 }}>Répartition des plans</div>
                {MOCK.plans.map(p => {
                  const w = pct(p.users, MOCK.stats.users);
                  return <div key={p.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: A.inkSoft }}>{p.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: A.ink }}>{p.users} <span style={{ color: A.inkFaint, fontWeight: 400 }}>({w})</span></span>
                    </div>
                    <div style={{ height: 7, background: A.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: w, height: "100%", background: p.color, borderRadius: 4 }} />
                    </div>
                  </div>;
                })}
              </div>
              {/* Derniers paiements */}
              <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 14, padding: "22px 24px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: A.ink, marginBottom: 16 }}>Derniers paiements</div>
                {MOCK.payments.slice(0, 5).map(p => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: A.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.user}</div>
                    <div style={{ fontSize: 11, color: A.inkFaint }}>{p.type} · {p.date}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: p.status === "success" ? A.green : A.red, flexShrink: 0 }}>
                    {p.status === "success" ? "+" : "-"}{fmt(p.amount)} F
                  </div>
                </div>)}
              </div>
            </div>
          </>}

          {/* ══ UTILISATEURS ══ */}
          {tab === "users" && <>
            <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un utilisateur..." style={{ ...inp, flex: 1, minWidth: 200 }} />
              <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} style={{ ...inp }}>
                <option value="all">Tous les plans</option>
                {MOCK.plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {grantUser && <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 14, padding: 20, marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: A.ink, marginBottom: 12 }}>Offrir des crédits à <span style={{ color: A.gold }}>{grantUser.name}</span></div>
              <div style={{ display: "flex", gap: 10 }}>
                <input type="number" value={grantAmt} onChange={e => setGrantAmt(e.target.value)} placeholder="Nombre de crédits" style={{ ...inp, width: 180 }} />
                <button onClick={grantCredits} style={{ padding: "0 20px", background: A.green, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Offrir</button>
                <button onClick={() => { setGrantUser(null); setGrantAmt(""); }} style={{ padding: "0 14px", background: A.surfaceAlt, border: `1px solid ${A.border}`, borderRadius: 10, color: A.inkSoft, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>}
            <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: `1px solid ${A.border}`, fontSize: 12, fontWeight: 700, color: A.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? "s" : ""}
              </div>
              {filteredUsers.map((u, i) => <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 20px", borderBottom: i < filteredUsers.length - 1 ? `1px solid ${A.border}` : "none", flexWrap: "wrap", background: i % 2 === 0 ? "transparent" : A.surfaceAlt }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: (planColor[u.plan] || "#888") + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 15, fontWeight: 700, color: planColor[u.plan] || "#888" }}>{u.name[0]}</div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: A.ink }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: A.inkFaint }}>{u.email} · Depuis {u.joined}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Badge color={planColor[u.plan] || "#888"}>{u.plan}</Badge>
                  <span style={{ fontSize: 12.5, color: A.inkSoft }}>⚡ {u.credits}</span>
                  <span style={{ fontSize: 12.5, color: A.inkSoft }}>{u.images}</span>
                  <span style={{ fontSize: 12.5, color: A.inkSoft }}>{u.appsGen} apps</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: A.gold }}>{fmt(u.spent)} F dépensé</span>
                  <Badge color={u.status === "active" ? A.green : A.red} bg={u.status === "active" ? A.greenSoft : A.redSoft}>
                    {u.status === "active" ? "Actif" : "Suspendu"}
                  </Badge>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setGrantUser(u)} style={{ padding: "7px 13px", background: A.blueSoft, border: `1px solid ${A.blue}44`, borderRadius: 8, color: A.blue, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Crédits</button>
                  <button onClick={() => toggleStatus(u)} style={{ padding: "7px 13px", background: u.status === "active" ? A.redSoft : A.greenSoft, border: `1px solid ${u.status === "active" ? A.red : A.green}44`, borderRadius: 8, color: u.status === "active" ? A.red : A.green, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    {u.status === "active" ? "Suspendre" : "Réactiver"}
                  </button>
                </div>
              </div>)}
            </div>
          </>}

          {/* ══ REVENUS ══ */}
          {tab === "revenue" && <>
            <div style={{ display: "grid", gridTemplateColumns: isWide ? "repeat(4,1fr)" : "1fr 1fr", gap: 14, marginBottom: 24 }}>
              <Stat label="Total encaissé" value={`${fmt(totalRevenue)} F`} color={A.green} />
              <Stat label="Ce mois (Juin)" value={`${fmt(monthRevenue)} F`} color={A.gold} />
              <Stat label="Paiements réussis" value={MOCK.payments.filter(p => p.status === "success").length} sub={pct(MOCK.payments.filter(p => p.status === "success").length, MOCK.payments.length) + " de succès"} />
              <Stat label="Paiements échoués" value={MOCK.payments.filter(p => p.status === "failed").length} color={A.red} />
            </div>
            <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${A.border}`, display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1fr 0.8fr", gap: 12 }}>
                {["Utilisateur", "Type", "Montant", "Méthode", "Statut"].map(h => <div key={h} style={{ fontSize: 11, fontWeight: 700, color: A.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>)}
              </div>
              {MOCK.payments.map((p, i) => <div key={p.id} style={{ padding: "13px 20px", borderBottom: i < MOCK.payments.length - 1 ? `1px solid ${A.border}` : "none", display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1fr 0.8fr", gap: 12, alignItems: "center", background: i % 2 === 0 ? "transparent" : A.surfaceAlt }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: A.ink }}>{p.user}</div>
                <div style={{ fontSize: 12.5, color: A.inkSoft }}>{p.type}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: p.status === "success" ? A.green : A.red }}>{fmt(p.amount)} F</div>
                <div style={{ fontSize: 12.5, color: A.inkSoft }}>{p.method}</div>
                <Badge color={p.status === "success" ? A.green : A.red} bg={p.status === "success" ? A.greenSoft : A.redSoft}>
                  {p.status === "success" ? "OK" : "Échec"}
                </Badge>
              </div>)}
            </div>
          </>}

          {/* ══ CRÉDITS ══ */}
          {tab === "credits" && <>
            <div style={{ display: "grid", gridTemplateColumns: isWide ? "repeat(5,1fr)" : "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[["Générer app", "1"], ["Modifier app", "1"], ["Visuel/flyer", "1"], ["Déployer web", "2"], ["APK build", "5"]].map(([a, c]) => <div key={a} style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: A.gold, fontFamily: FONT }}>{c}</div>
                <div style={{ fontSize: 11.5, color: A.inkSoft, marginTop: 6 }}>{a}</div>
              </div>)}
            </div>
            {grantUser && <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 14, padding: 20, marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: A.ink, marginBottom: 12 }}>Offrir des crédits à <span style={{ color: A.gold }}>{grantUser.name}</span></div>
              <div style={{ display: "flex", gap: 10 }}>
                <input type="number" value={grantAmt} onChange={e => setGrantAmt(e.target.value)} placeholder="Nombre de crédits" style={{ ...inp, width: 180 }} />
                <button onClick={grantCredits} style={{ padding: "0 20px", background: A.green, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Offrir</button>
                <button onClick={() => { setGrantUser(null); setGrantAmt(""); }} style={{ padding: "0 14px", background: A.surfaceAlt, border: `1px solid ${A.border}`, borderRadius: 10, color: A.inkSoft, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>}
            <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${A.border}`, fontSize: 13, fontWeight: 700, color: A.ink }}>Crédits par utilisateur</div>
              {users.map((u, i) => {
                const maxC = { free: 15, starter: 60, pro: 180, business: 450 }[u.plan] || 60;
                const pctC = Math.min(100, Math.round(u.credits / maxC * 100));
                const barColor = u.credits === 0 ? A.red : u.credits < 10 ? "#F97316" : A.green;
                return <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: i < users.length - 1 ? `1px solid ${A.border}` : "none", background: i % 2 === 0 ? "transparent" : A.surfaceAlt }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: (planColor[u.plan] || "#888") + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700, color: planColor[u.plan] || "#888" }}>{u.name[0]}</div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: A.ink }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: A.inkFaint }}>Plan {u.plan}</div>
                  </div>
                  <div style={{ width: 140, height: 6, background: A.surfaceAlt, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pctC}%`, height: "100%", background: barColor, borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: barColor, width: 70, textAlign: "right" }}>⚡ {u.credits}</div>
                  <div style={{ fontSize: 11, color: A.inkFaint, width: 50 }}>/ {maxC}</div>
                  <button onClick={() => setGrantUser(u)} style={{ padding: "7px 12px", background: A.blueSoft, border: `1px solid ${A.blue}44`, borderRadius: 8, color: A.blue, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Don</button>
                </div>;
              })}
            </div>
          </>}

          {/* ══ PLANS ══ */}
          {tab === "plans" && <>
            <div style={{ marginBottom: 16, padding: "14px 18px", background: A.goldSoft, border: `1px solid ${A.gold}44`, borderRadius: 12, fontSize: 13, color: A.gold }}>
              Pour modifier les prix ou les crédits inclus, mets à jour la constante <code style={{ fontFamily: FONT_MONO, background: A.bg, padding: "2px 7px", borderRadius: 5 }}>PLANS</code> dans le code source de <code style={{ fontFamily: FONT_MONO, background: A.bg, padding: "2px 7px", borderRadius: 5 }}>jenga-app.jsx</code>.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {MOCK.plans.map(p => {
                const revenue = p.price * p.users;
                return <div key={p.id} style={{ background: A.surface, border: `1.5px solid ${p.color}44`, borderRadius: 16, padding: "22px 26px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: p.color, marginTop: 4 }} />
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: A.ink }}>{p.name}</div>
                        <div style={{ fontSize: 13, color: A.inkSoft, marginTop: 2 }}>{p.price === 0 ? "Gratuit" : `${fmt(p.price)} FCFA / mois`}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: p.color }}>{p.users}</div>
                        <div style={{ fontSize: 11, color: A.inkFaint }}>utilisateurs</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: A.gold }}>{p.credits}</div>
                        <div style={{ fontSize: 11, color: A.inkFaint }}>crédits/mois</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: A.green }}>{fmt(revenue)} F</div>
                        <div style={{ fontSize: 11, color: A.inkFaint }}>revenu mensuel</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, height: 6, background: A.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: pct(p.users, MOCK.stats.users), height: "100%", background: p.color, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 12, color: A.inkFaint, marginTop: 6 }}>{pct(p.users, MOCK.stats.users)} des utilisateurs</div>
                </div>;
              })}
            </div>
          </>}

          {/* ══ SUPPORT ══ */}
          {tab === "support" && <>
            <div style={{ display: "grid", gridTemplateColumns: isWide ? "repeat(3,1fr)" : "1fr", gap: 14, marginBottom: 22 }}>
              <Stat label="Messages ouverts" value={MOCK.support.filter(s=>s.status==="ouvert").length} color={A.gold} />
              <Stat label="En attente de réponse" value={MOCK.support.filter(s=>s.status==="attente").length} color={A.blue} />
              <Stat label="Résolus (30j)" value={MOCK.support.filter(s=>s.status==="resolu").length} color={A.green} />
            </div>
            <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "16px 22px", borderBottom: `1px solid ${A.border}`, fontSize: 14, fontWeight: 700, color: A.ink }}>Demandes des utilisateurs</div>
              {MOCK.support.map(s => (
                <div key={s.id} style={{ padding: "16px 22px", borderBottom: `1px solid ${A.border}`, display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: A.ink }}>{s.user}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: s.status==="ouvert"?A.goldSoft:s.status==="attente"?A.blue+"22":A.greenSoft, color: s.status==="ouvert"?A.gold:s.status==="attente"?A.blue:A.green }}>{s.status==="ouvert"?"Ouvert":s.status==="attente"?"En attente":"Résolu"}</span>
                    </div>
                    <div style={{ fontSize: 13, color: A.inkSoft, lineHeight: 1.5 }}>{s.message}</div>
                    <div style={{ fontSize: 11, color: A.inkFaint, marginTop: 4 }}>{s.date}</div>
                  </div>
                  <button onClick={() => setToast("Réponse envoyée à " + s.user)} style={{ padding: "8px 16px", background: A.navy, color: "#fff", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Répondre</button>
                </div>
              ))}
            </div>
          </>}

          {/* ══ ANNONCES (broadcast) ══ */}
          {tab === "broadcast" && <>
            <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 14, padding: "24px 26px", marginBottom: 20, maxWidth: 680 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: A.ink, marginBottom: 6 }}>Envoyer une annonce à tous les utilisateurs</div>
              <div style={{ fontSize: 13, color: A.inkSoft, marginBottom: 18 }}>Notification in-app, ou via le canal choisi. Sera traité par le backend.</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: A.inkFaint, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>Cible</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {["Tous","Plan gratuit","Plans payants","Inactifs 30j"].map(c => (
                  <button key={c} onClick={() => setBcTarget(c)} style={{ padding: "7px 14px", background: bcTarget===c?A.navy:A.surfaceAlt, color: bcTarget===c?"#fff":A.inkSoft, border: `1px solid ${bcTarget===c?A.navy:A.border}`, borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{c}</button>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: A.inkFaint, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>Message</div>
              <textarea value={bcMsg} onChange={e => setBcMsg(e.target.value)} rows={4} placeholder="Ex : Nouvelle fonctionnalité disponible ! Découvrez le nouvel Executive Studio…" style={{ width: "100%", background: A.surfaceAlt, border: `1px solid ${A.border}`, borderRadius: 10, padding: "12px 15px", fontSize: 14, color: A.ink, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
              <button onClick={() => { if(bcMsg.trim()){ setToast(`Annonce envoyée à : ${bcTarget}`); setBcMsg(""); } }} disabled={!bcMsg.trim()} style={{ marginTop: 14, padding: "11px 22px", background: bcMsg.trim()?A.navy:A.border, color: bcMsg.trim()?"#fff":A.inkFaint, border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: bcMsg.trim()?"pointer":"not-allowed" }}>Envoyer l'annonce</button>
            </div>
            <div style={{ fontSize: 12.5, color: A.inkFaint, maxWidth: 680, lineHeight: 1.6 }}>Les annonces envoyées apparaîtront ici une fois le backend connecté (historique des campagnes, taux d'ouverture).</div>
          </>}

          {/* ══ SYSTÈME & API ══ */}
          {tab === "system" && <>
            <div style={{ marginBottom: 20, padding: "14px 18px", background: api.enabled() ? A.greenSoft : A.redSoft, border: `1px solid ${api.enabled() ? A.green : A.red}44`, borderRadius: 12, fontSize: 13.5, fontWeight: 600, color: api.enabled() ? A.green : A.red }}>
              {api.enabled() ? `Backend connecté sur ${BACKEND_URL}` : "Backend non configuré — mode démo. Définis BACKEND_URL dans le code."}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {MOCK.apiKeys.map(k => <div key={k.name} style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: k.status === "active" ? A.green : "#888", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: A.ink }}>{k.name}</div>
                  <div style={{ fontSize: 12, color: A.inkFaint }}>{k.desc}</div>
                  <code style={{ fontSize: 11, color: A.inkSoft, fontFamily: FONT_MONO }}>{k.key}</code>
                </div>
                <div style={{ fontSize: 12, color: A.inkSoft }}>{k.cost}</div>
                <Badge color={k.status === "active" ? A.green : "#888"} bg={k.status === "active" ? A.greenSoft : A.surfaceAlt}>
                  {k.status === "active" ? "Actif" : "À configurer"}
                </Badge>
              </div>)}
            </div>
            <div style={{ background: A.surface, border: `1px solid ${A.gold}44`, borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: A.gold, marginBottom: 10 }}>Sécurité du panneau admin</div>
              <div style={{ fontSize: 13.5, color: A.inkSoft, lineHeight: 1.7 }}>
                Le mot de passe actuel (<code style={{ fontFamily: FONT_MONO, color: A.gold }}>ADMIN_SECRET</code>) est défini dans le code source. Avant la mise en production :<br />
                1. Change le mot de passe dans le code<br />
                2. Demande à ton dev d’implémenter une authentification JWT côté backend<br />
                3. Héberge ce panneau sur <strong>admin.jenga.app</strong> (domaine séparé de l’app client)<br />
                4. Ajoute une restriction d’accès par IP si possible
              </div>
            </div>
          </>}

          {/* ══ LOGS ══ */}
          {tab === "logs" && <>
            <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${A.border}`, fontSize: 13, fontWeight: 700, color: A.ink }}>Journal d’activité (démo)</div>
              {[
                { time: "2026-06-13 14:22", event: "Génération app", user: "Jean-Paul Amoah", detail: "App POS restaurant — 1 crédit", type: "info" },
                { time: "2026-06-13 14:18", event: "Paiement reçu", user: "Ibrahim Bah", detail: "Plan Pro — 15 000 FCFA via CinetPay", type: "success" },
                { time: "2026-06-13 14:05", event: "APK buildé", user: "Kofi Mensah", detail: "Boutique wax — 5 crédits consommés", type: "info" },
                { time: "2026-06-13 13:44", event: "Paiement échoué", user: "Rodrigue Gbéto", detail: "30 crédits visuels — Timeout", type: "error" },
                { time: "2026-06-13 13:20", event: "Nouveau compte", user: "Céleste Kpade", detail: "Inscription plan Free", type: "info" },
                { time: "2026-06-13 12:55", event: "Visuel généré", user: "Marie Kouassi", detail: "Flyer boutique — Ideogram V3", type: "info" },
              ].map((log, i) => <div key={i} style={{ padding: "13px 20px", borderBottom: i < 5 ? `1px solid ${A.border}` : "none", display: "flex", gap: 14, alignItems: "center", background: i % 2 === 0 ? "transparent" : A.surfaceAlt }}>
                <code style={{ fontSize: 11.5, color: A.inkFaint, fontFamily: FONT_MONO, flexShrink: 0 }}>{log.time}</code>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: A.ink }}>{log.event}</span>
                  <span style={{ fontSize: 12, color: A.inkFaint }}> · {log.user} · {log.detail}</span>
                </div>
                <Badge color={log.type === "success" ? A.green : log.type === "error" ? A.red : A.blue} bg={log.type === "success" ? A.greenSoft : log.type === "error" ? A.redSoft : A.blueSoft}>
                  {log.type === "success" ? "OK" : log.type === "error" ? "-" : "ℹ"}
                </Badge>
              </div>)}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: A.inkFaint, textAlign: "center" }}>Les vrais logs s’affichent quand le backend est connecté.</div>
          </>}
        </div>
      </div>
    </div>
  );
}

// ─── APP PRINCIPALE ADMIN ─────────────────────────────────────────────────────
export default function AdminApp() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    document.title = "Jenga Admin";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
  }, []);
  return authed
    ? <AdminDashboard onLogout={() => setAuthed(false)} />
    : <AdminLogin onLogin={() => setAuthed(true)} />;
}
