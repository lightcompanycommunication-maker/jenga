import React, { useCallback, useEffect, useRef, useState } from "react";
/* ═══════════════════════════════════════════════════════════════════════════
   AFRIBUILD AI — v10 (GitHub + Mémoire de projet)
   Plateforme SaaS de génération d'applications pour l'Afrique.
   Design system complet · Responsive PC / tablette / mobile · Déployable.
   ═══════════════════════════════════════════════════════════════════════════ */

const MODEL = "claude-sonnet-4-20250514";

// ─── CONFIG (remplace par tes clés en production) ───────────────────────────
const SUPABASE_URL    = "https://TON_PROJECT.supabase.co";
const SUPABASE_KEY    = "TON_ANON_KEY";
const VERCEL_TOKEN    = "TON_VERCEL_TOKEN";
const CINETPAY_KEY    = "TON_CINETPAY_APIKEY";
const CINETPAY_SITE   = "TON_CINETPAY_SITEID";
const FLUTTERWAVE_KEY = "FLWPUBK-TON_CLE";
const KKIAPAY_KEY     = "TON_KKIAPAY_KEY";

// ─── BACKEND ─────────────────────────────────────────────────────────────────
// URL de ton backend Jenga (déployé sur Railway/Render).
// Laisse vide ("") pour le mode démo (tout marche, mais sans vrai APK ni vrai déploiement).
// Une fois le backend hébergé, mets son URL ici : ex. "https://api.afribuild.app"
const BACKEND_URL = "";

// Client qui parle au backend. Si BACKEND_URL est vide, on bascule en mode démo.
const backend = {
  enabled: () => !!BACKEND_URL,
  token: null,
  async auth(userId, email) {
    if (!BACKEND_URL) return null;
    try {
      const r = await fetch(`${BACKEND_URL}/api/auth/token`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ userId, email }) });
      const d = await r.json(); this.token = d.token; return d.token;
    } catch { return null; }
  },
  headers() { return { "Content-Type":"application/json", ...(this.token?{Authorization:`Bearer ${this.token}`}:{}) }; },
  async post(path, body) {
    const r = await fetch(`${BACKEND_URL}${path}`, { method:"POST", headers:this.headers(), body:JSON.stringify(body) });
    if (!r.ok) throw new Error((await r.json().catch(()=>({}))).error || `Erreur ${r.status}`);
    return r.json();
  },
  async get(path) {
    const r = await fetch(`${BACKEND_URL}${path}`, { headers:this.headers() });
    if (!r.ok) throw new Error((await r.json().catch(()=>({}))).error || `Erreur ${r.status}`);
    return r.json();
  },
  // Suit un build APK jusqu'à la fin
  async waitForBuild(buildId, onProgress) {
    const start = Date.now();
    while (Date.now() - start < 1200000) {
      const s = await this.get(`/api/build/${buildId}`);
      onProgress?.(s);
      if (s.status === "FINISHED") return s;
      if (s.status === "ERRORED" || s.status === "CANCELED") throw new Error(s.error || "Build échoué.");
      await new Promise(r => setTimeout(r, 8000));
    }
    throw new Error("Le build a pris trop de temps.");
  },
  // GitHub
  async githubPush(p){ return this.post("/api/github/push", p); },
  async githubVerify(t){ return this.post("/api/github/verify", { githubToken:t }); },
  async githubHistory(p){ return this.post("/api/github/history", p); },
  // Mémoire de projet
  async getMemory(id){ try{ return await this.get(`/api/memory/${id}`); }catch{ return null; } },
  async saveMemory(id,d){ try{ return await this.post(`/api/memory/${id}`, d); }catch{ return null; } },
};

// ─── DESIGN TOKENS — "Atelier numérique africain" ───────────────────────────
const T = {
  bg:"#0A0F2C", surface:"#FFFFFF", surfaceAlt:"#FAFBFD",
  ink:"#0E1633", inkSoft:"#5A6486", inkFaint:"#9CA3BE",
  line:"#ECEEF4", lineSoft:"#F4F5F9",
  gold:"#CAA546", goldDeep:"#A8842F", goldSoft:"#FAF4E4",
  indigo:"#1C3293", indigoDeep:"#14246E", indigoSoft:"#EDF0FA",
  green:"#15A05A", greenSoft:"#EBFAF1",
  red:"#E0464B", redSoft:"#FDF0F0",
  navBg:"#101A45", navLine:"#222F60", navInk:"#C8D0EC", navInkSoft:"#7A85B4", navActive:"#1C3293",
  // ombres premium (douces, multi-couches comme Stripe/Linear)
  shadowSm:"0 1px 2px rgba(14,22,51,0.04), 0 1px 3px rgba(14,22,51,0.06)",
  shadowMd:"0 2px 4px rgba(14,22,51,0.04), 0 4px 12px rgba(14,22,51,0.07)",
  shadowLg:"0 8px 24px rgba(14,22,51,0.08), 0 2px 6px rgba(14,22,51,0.05)",
  shadowXl:"0 16px 48px rgba(14,22,51,0.12), 0 4px 12px rgba(14,22,51,0.06)",
};
const FONT = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
const FONT_DISPLAY = "'Sora','Inter',-apple-system,sans-serif";
const FONT_MONO = "'JetBrains Mono','Fira Code','SF Mono',Consolas,monospace";
// Transitions premium standardisees
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const TRANS = `all 0.22s ${EASE}`;

// ─── PLANS ───────────────────────────────────────────────────────────────────
// ─── DEVISES (pour les utilisateurs internationaux) ─────────────────────────
const CURRENCIES = {
  XOF: { symbol:"FCFA", rate:1,      label:"FCFA (Afrique de l'Ouest)" },
  XAF: { symbol:"FCFA", rate:1,      label:"FCFA (Afrique centrale)" },
  EUR: { symbol:"€",    rate:0.00152,label:"Euro" },
  USD: { symbol:"$",    rate:0.00166,label:"Dollar US" },
  GBP: { symbol:"£",    rate:0.0013, label:"Livre" },
  NGN: { symbol:"₦",    rate:2.6,    label:"Naira" },
  GHS: { symbol:"GH₵",  rate:0.024,  label:"Cedi" },
  KES: { symbol:"KSh",  rate:0.21,   label:"Shilling" },
};
// Convertit un prix FCFA vers la devise choisie.
const toCurrency = (fcfa, cur="XOF") => {
  const c = CURRENCIES[cur] || CURRENCIES.XOF;
  const v = fcfa * c.rate;
  if (cur==="XOF"||cur==="XAF"||cur==="NGN"||cur==="KES") return `${new Intl.NumberFormat("fr-FR").format(Math.round(v))} ${c.symbol}`;
  return `${c.symbol}${v.toFixed(2)}`;
};

// ─── RÔLES & PERMISSIONS (contrôle d'accès par profil dans l'entreprise) ─────
// NOTE : la vraie application des permissions doit AUSSI etre faite cote serveur.
// Ce filtre frontend ameliore l'experience mais ne remplace pas la securite backend.
const ROLES = {
  owner:      { label:"Propriétaire", access:"all" },
  director:   { label:"Directeur",    access:["home","dashboard","builder","templates","images","marketplace","advisors","business_memory","community_feed","support","payments"] },
  accountant: { label:"Comptable",    access:["home","dashboard","images","business_memory","support","payments"] },
  hr:         { label:"RH",           access:["home","dashboard","advisors","business_memory","images","support"] },
  sales:      { label:"Commercial",   access:["home","dashboard","builder","templates","advisors","images","community_feed","support"] },
};
function navAllowedFor(role){
  const r = ROLES[role]; if(!r||r.access==="all") return null; // null = tout autorisé
  return new Set(r.access);
}

// ─── MODÈLES IA par plan (façon Claude : gratuit = rapide, payant = puissant) ─
const AI_TIERS = {
  fast:     { id:"claude-haiku-4-5-20251001",  label:"Rapide",   desc:"Génération rapide, idéale pour démarrer" },
  balanced: { id:"claude-sonnet-4-20250514",   label:"Avancé",   desc:"Le meilleur équilibre qualité / vitesse" },
  power:    { id:"claude-opus-4-20250514",     label:"Puissant", desc:"Pour les projets les plus complexes" },
};

const PLANS = [
  { id:"free",     name:"Free",       price:0,      priceYear:0,       color:"#5A6478", badge:null,        tagline:"Pour découvrir",
    credits:15,  images:2,   ai:"fast",     imgMaxQ:"720",
    features:["15 crédits pour démarrer","Modèle IA Rapide","Studio graphique · 720p","Logos IA","Idéal pour 1 premier projet"],
    limits:{deploy:0,github:false,custom:false,private:false,team:false} },
  { id:"starter",  name:"Starter",    price:5000,   priceYear:48000,   color:"#15A05A", badge:"Accessible", tagline:"Pour démarrer",
    credits:60,  images:15,  ai:"balanced", imgMaxQ:"1080",
    features:["60 crédits / mois","Modèle IA Avancé","Studio graphique · 1080p","Reçus Mobile Money","Voix en langues africaines"],
    limits:{deploy:2,github:false,custom:false,private:true,team:false} },
  { id:"pro",      name:"Pro",        price:15000,  priceYear:144000,  color:"#CAA546", badge:"Populaire", tagline:"Pour les pros",
    credits:180, images:50,  ai:"balanced", imgMaxQ:"4k",
    features:["180 crédits / mois","Modèle IA Avancé","Studio graphique · 4K","Génération prioritaire","Export GitHub · 20 agents","Déploiement web"],
    limits:{deploy:-1,github:true,custom:false,private:true,team:false} },
  { id:"business", name:"Business",   price:35000,  priceYear:336000,  color:"#1C3293", badge:"Recommandé",tagline:"Pour les équipes",
    credits:450, images:150, ai:"power",    imgMaxQ:"8k",
    features:["450 crédits / mois","Modèle IA Puissant (Opus)","Studio graphique · 8K","Gestion d'équipe & crédits partagés","Génération prioritaire","Tout débloqué"],
    limits:{deploy:-1,github:true,custom:true,private:true,team:true} },
];
// Packs APPS — dégressif : plus tu achètes, moins c'est cher l'unité
const CREDIT_PACKS = [
  {credits:15,  price:2000,  label:"Recharge",   per:133},
  {credits:50,  price:6000,  label:"Builder",    per:120, popular:true},
  {credits:120, price:12000, label:"Studio",     per:100, best:true},
];
// Packs VISUELS — dégressif aussi (chaque visuel a son coût réel)
const VISUAL_PACKS = [
  {visuals:10,  price:1000,  label:"10 visuels",  per:100},
  {visuals:30,  price:2500,  label:"30 visuels",  per:83,  popular:true},
  {visuals:100, price:7000,  label:"100 visuels", per:70,  best:true},
];
// ─── COÛT EN CRÉDITS DE CHAQUE ACTION (protège ton argent) ───────────────────
// Générer du code = pas cher. Sortir un vrai APK = lourd → coûte plus de crédits.
const ACTION_COST = {
  generate:   1,   // générer une application
  modify:     1,   // modifier une app (chat itératif)
  deployWeb:  2,   // déployer sur le web
  buildApk:   5,   // sortir un vrai APK / AAB / IPA (le plus coûteux)
  advisor:    1,   // conseil business (Marketing, Vente, Finance, Productivité, Support)
};
const ACTION_LABEL = {
  generate:  "Générer une application",
  modify:    "Modifier une application",
  deployWeb: "Déployer sur le web",
  buildApk:  "Générer l'APK / AAB / IPA",
};
const AGENTS = [
  {id:"planner",  label:"Architecte", color:"#CAA546"},
  {id:"design",   label:"Designer",   color:"#1C3293"},
  {id:"frontend", label:"Frontend",   color:"#0EA5E9"},
  {id:"backend",  label:"Backend",    color:"#8B5CF6"},
  {id:"qa",       label:"Qualité",    color:"#15A05A"},
];

const TEMPLATES = [
  {icon:"\u25C8", label:"Tontine / Njangi",     accent:"#CAA546", prompt:"Application web complète de gestion de tontine (njangi/likelemba). Dashboard avec solde collectif et prochain tour. Liste 12 membres avec vrais prénoms africains (Amadou Diallo, Fatou Ndiaye, Kofi Mensah, Ngozi Adeyemi, Wanjiru Kamau, Cheikh Ba). Calendrier des tours. Formulaire ajout membre. Historique transactions FCFA. Design fintech sombre avec accents dorés. Min 3 vues avec sidebar."},
  {icon:"\u25C8", label:"Marketplace Agricole", accent:"#15A05A", prompt:"Marketplace agricole B2C Afrique de l'Ouest. Catalogue produits (riz, mil, igname, cacao, café) avec cards propres, prix FCFA, stock, note étoiles. Filtres par région. Page détail produit. Panier slide-in. Design vert forêt et blanc. Vendeurs dans villes africaines. Min 12 produits."},
  {icon:"\u25C8", label:"Point de Vente",       accent:"#1C3293", prompt:"Système POS professionnel pour boutique africaine. Interface split: gauche catalogue produits grille avec search, droite ticket. Paiement Espèces/MTN/Orange/Wave. Modal confirmation avec rendu monnaie. Historique ventes du jour. Design style Square POS. 16 produits."},
  {icon:"\u25C8", label:"Dossiers Médicaux",    accent:"#E5484D", prompt:"Système gestion patients clinique africaine style Doctolib. Sidebar navigation. Table patients avec search. Fiche patient complète. Formulaire consultation. Design médical blanc et bleu. 15 patients noms africains."},
  {icon:"\u25C8", label:"Gestion Scolaire",     accent:"#8B5CF6", prompt:"ERP scolaire style PowerSchool pour école africaine. Sidebar: Dashboard, Élèves, Notes, Emploi du temps, Paiements. Stats. Table élèves avec initiales colorées. Bulletins notes. Design violet et blanc. 20 élèves, 8 matières."},
  {icon:"\u25C8", label:"Réservation Transport",accent:"#EA580C", prompt:"App réservation bus inter-villes africains style OuiBus. Recherche trajet (Dakar, Lagos, Accra, Abidjan, Nairobi). Liste bus avec horaires prix FCFA. Plan sièges interactif. Billet numérique. Design travel orange et blanc. Stepper 4 étapes."},
  {icon:"\u25C8", label:"Restaurant & Livraison",accent:"#E0464B", prompt:"App commande restaurant style Uber Eats pour cuisine africaine. Menu par catégories avec cards plats (thiéboudienne, ndolé, jollof, yassa). Panier slide-in. Checkout Mobile Money. Timeline livraison animée. Design sombre luxe."},
  {icon:"\u25C8", label:"Immobilier",           accent:"#0891B2", prompt:"Plateforme immobilière style Seloger pour l'Afrique. Grille annonces 3 colonnes. Sidebar filtres. Page détail bien. Formulaire visite. Design teal et blanc minimaliste. 14 annonces dans villes africaines."},
];


async function payWithCinetPay({ amount, currency, name, email, phone, description, onSuccess, onError }) {
  try {
    const transId = "AB-" + Date.now() + "-" + Math.random().toString(36).slice(2,6).toUpperCase();
    // En production : appel à l'API CinetPay pour créer le paiement
    const payload = {
      apikey: CINETPAY_KEY,
      site_id: CINETPAY_SITE,
      transaction_id: transId,
      amount,
      currency,
      description,
      customer_name: name,
      customer_email: email,
      customer_phone_number: phone,
      notify_url: "https://ton-backend.com/webhooks/cinetpay",
      return_url: window.location.href,
    };
    // Simulation : en production remplace par fetch("https://api-checkout.cinetpay.com/v2/payment", ...)
    console.log("CinetPay payload:", payload);
    await new Promise(r => setTimeout(r, 2000));
    // Simule une réponse réussie
    onSuccess({ transactionId: transId, gateway: "CinetPay", amount, currency, status: "ACCEPTED" });
  } catch(e) { onError(e.message); }
}

// Initialise Flutterwave (pan-africain)
function payWithFlutterwave({ amount, currency, name, email, phone, description, onSuccess, onError }) {
  try {
    const txRef = "AFRIB-FLW-" + Date.now();
    // En production : charger le script Flutterwave et appeler FlutterwaveCheckout()
    // window.FlutterwaveCheckout({ public_key: FLUTTERWAVE_KEY, tx_ref: txRef, amount, currency, ... })
    console.log("Flutterwave:", { txRef, amount, currency, name, email });
    setTimeout(() => {
      onSuccess({ transactionId: txRef, gateway: "Flutterwave", amount, currency, status: "successful" });
    }, 2000);
  } catch(e) { onError(e.message); }
}

// Initialise Kkiapay (Bénin / Togo / Afrique de l'Ouest)
function payWithKkiapay({ amount, phone, onSuccess, onError }) {
  try {
    const txRef = "AFRIB-KKP-" + Date.now();
    // En production : charger le widget Kkiapay
    // openKkiapayWidget({ amount, phone, key: KKIAPAY_KEY, sandbox: false })
    console.log("Kkiapay:", { txRef, amount, phone });
    setTimeout(() => {
      onSuccess({ transactionId: txRef, gateway: "Kkiapay", amount, currency: "XOF", status: "SUCCESS" });
    }, 2000);
  } catch(e) { onError(e.message); }
}

// Dispatcher universel
async function processPayment({ gateway, amount, currency, name, email, phone, description, onSuccess, onError }) {
  const methods = { cinetpay: payWithCinetPay, flutterwave: payWithFlutterwave, kkiapay: payWithKkiapay };
  const fn = methods[gateway];
  if (!fn) { onError("Passerelle inconnue : " + gateway); return; }
  await fn({ amount, currency, name, email, phone, description, onSuccess, onError });
}



// ─── AFRIDATA ────────────────────────────────────────────────
const AFRIDATA = {
  countries: {
    "Sénégal":       { code:"SN", currency:"XOF", capital:"Dakar",        operators:["Orange Money","Wave","Free Money","Expresso"],    gateway:"cinetpay",    banks:["CBAO","Ecobank","BHS","BOA","UBA"] },
    "Côte d'Ivoire": { code:"CI", currency:"XOF", capital:"Abidjan",      operators:["MTN MoMo","Orange Money","Wave","Moov Money"],    gateway:"cinetpay",    banks:["BICICI","SGBCI","Ecobank","BOA","UBA"] },
    "Mali":          { code:"ML", currency:"XOF", capital:"Bamako",       operators:["Orange Money","Moov Money","Wave"],               gateway:"cinetpay",    banks:["BDM","BNDA","BOA","Ecobank"] },
    "Burkina Faso":  { code:"BF", currency:"XOF", capital:"Ouagadougou",  operators:["Orange Money","Moov Money"],                     gateway:"cinetpay",    banks:["BOA","BICIA-B","Ecobank"] },
    "Guinée":        { code:"GN", currency:"GNF", capital:"Conakry",      operators:["Orange Money","MTN MoMo","Cellcom Money"],        gateway:"cinetpay",    banks:["BIG","BICIGUI","Ecobank"] },
    "Cameroun":      { code:"CM", currency:"XAF", capital:"Yaoundé",      operators:["MTN MoMo","Orange Money"],                       gateway:"cinetpay",    banks:["Afriland","SCB","BICEC","Ecobank"] },
    "Congo RDC":     { code:"CD", currency:"CDF", capital:"Kinshasa",     operators:["Airtel Money","Orange Money","M-Pesa"],           gateway:"flutterwave", banks:["RawBank","Equity","TMB","UBA"] },
    "Nigeria":       { code:"NG", currency:"NGN", capital:"Abuja",        operators:["Opay","Palmpay","GTBank","MTN MoMo"],            gateway:"flutterwave", banks:["GTBank","Zenith","Access","UBA","First Bank"] },
    "Ghana":         { code:"GH", currency:"GHS", capital:"Accra",        operators:["MTN MoMo","Vodafone Cash","AirtelTigo Money"],    gateway:"flutterwave", banks:["GCB","Stanbic","Ecobank","Absa"] },
    "Kenya":         { code:"KE", currency:"KES", capital:"Nairobi",      operators:["M-Pesa","Airtel Money","T-Kash"],                gateway:"flutterwave", banks:["Equity","KCB","Co-op","NCBA","Absa"] },
    "Afrique du Sud":{ code:"ZA", currency:"ZAR", capital:"Pretoria",     operators:["MTN MoMo","Vodacom M-Pesa"],                     gateway:"flutterwave", banks:["FNB","Standard","Nedbank","Absa","Capitec"] },
    "Ouganda":       { code:"UG", currency:"UGX", capital:"Kampala",      operators:["MTN MoMo","Airtel Money"],                       gateway:"flutterwave", banks:["Stanbic","dfcu","Equity","Centenary"] },
    "Tanzanie":      { code:"TZ", currency:"TZS", capital:"Dodoma",       operators:["M-Pesa","Tigo Pesa","Airtel Money"],             gateway:"flutterwave", banks:["CRDB","NMB","Exim","Standard Chartered"] },
    "Rwanda":        { code:"RW", currency:"RWF", capital:"Kigali",       operators:["MTN MoMo","Airtel Money"],                       gateway:"flutterwave", banks:["BK","Equity","I&M","Cogebanque"] },
    "Bénin":         { code:"BJ", currency:"XOF", capital:"Cotonou",      operators:["MTN MoMo","Moov Money","Wave","Kkiapay"],        gateway:"kkiapay",     banks:["BOA","BIBE","Ecobank","UBA"] },
    "Togo":          { code:"TG", currency:"XOF", capital:"Lomé",         operators:["TMoney","Flooz","Wave"],                         gateway:"kkiapay",     banks:["BTCI","BOA","Ecobank","UTB"] },
    "Ethiopie":      { code:"ET", currency:"ETB", capital:"Addis-Abeba",  operators:["Telebirr","CBE Birr"],                           gateway:"flutterwave", banks:["CBE","Dashen","Awash","Abyssinia"] },
    "Egypte":        { code:"EG", currency:"EGP", capital:"Le Caire",     operators:["Vodafone Cash","Etisalat Cash","Orange Money"],  gateway:"flutterwave", banks:["CIB","NBE","QNB","HSBC Egypt"] },
    "Maroc":         { code:"MA", currency:"MAD", capital:"Rabat",        operators:["Maroc Telecom","Inwi Money"],                    gateway:"stripe",      banks:["Attijariwafa","BMCE","CIH","BMCI"] },
  },
  cities: ["Dakar","Abidjan","Lagos","Nairobi","Accra","Kinshasa","Douala","Bamako","Ouagadougou","Lomé","Cotonou","Kampala","Dar es Salaam","Addis-Abeba","Kigali","Libreville","Yaoundé","Conakry","Freetown","Monrovia","Niamey","Ndjamena","Bangui","Brazzaville"],
  firstNames: ["Amadou","Fatou","Kofi","Ngozi","Wanjiru","Cheikh","Mariama","Ibrahim","Ama","Oluwaseun","Kemi","Yaw","Aissatou","Moussa","Adjoa","Chioma","Kwame","Bineta","Emeka","Adama","Fanta","Seun","Akosua","Ibrahima"],
  lastNames:  ["Diallo","Ndiaye","Mensah","Okonkwo","Kamau","Ba","Touré","Sow","Asante","Adeyemi","Traoré","Coulibaly","Koné","Cissé","Ouédraogo","Mbaye","Gueye","Sarr","Bah","Konaté"],
};


const AfriPay = {
  detectGateway(country) {
    const data = AFRIDATA.countries[country];
    if (data) return data.gateway;
    // Fallback par timezone/langue navigateur
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes("Africa/Dakar") || tz.includes("Africa/Abidjan") || tz.includes("Africa/Bamako")) return "cinetpay";
    if (tz.includes("Africa/Lagos") || tz.includes("Africa/Nairobi") || tz.includes("Africa/Accra")) return "flutterwave";
    if (tz.includes("Africa/Porto-Novo") || tz.includes("Africa/Lome")) return "kkiapay";
    return "flutterwave"; // fallback universel
  },
  async pay({ amount, currency, country, name, email, phone, description, onSuccess, onError }) {
    const gateway = this.detectGateway(country);
    console.log(`AfriPay: routing ${amount} ${currency} via ${gateway} for ${country}`);
    await processPayment({ gateway, amount, currency, name, email, phone, description, onSuccess, onError });
  },
  formatAmount(amount, currency) {
    const symbols = { XOF:"FCFA", XAF:"FCFA", NGN:"₦", GHS:"GH₵", KES:"KSh", ZAR:"R", USD:"$", EUR:"€" };
    return `${new Intl.NumberFormat("fr-FR").format(amount)} ${symbols[currency] || currency}`;
  }
};



const AFRICAN_LANGUAGES = [
  { code:"fr",    name:"Français",       flag:"", hint:"Parlez en français",              bcp47:"fr-FR",  region:"Afrique francophone" },
  { code:"wo",    name:"Wolof",          flag:"", hint:"Waxal ci wolof",                  bcp47:"fr-SN",  region:"Sénégal, Gambie" },
  { code:"dyu",   name:"Dioula",         flag:"", hint:"A fo dioula kan",                 bcp47:"fr-CI",  region:"Côte d'Ivoire, Mali, Burkina" },
  { code:"ha",    name:"Hausa",          flag:"", hint:"Ku yi magana da Hausa",           bcp47:"ha",     region:"Nigeria, Niger, Ghana" },
  { code:"sw",    name:"Swahili",        flag:"", hint:"Sema kwa Kiswahili",              bcp47:"sw",     region:"Kenya, Tanzanie, Ouganda" },
  { code:"pcm",   name:"Pidgin English", flag:"", hint:"Tok Pidgin",                      bcp47:"en-NG",  region:"Nigeria, Cameroun, Ghana" },
  { code:"am",    name:"Amharique",      flag:"", hint:"በአማርኛ ይናገሩ",                    bcp47:"am-ET",  region:"Éthiopie, Érythrée" },
  { code:"yo",    name:"Yoruba",         flag:"", hint:"Sọ ede Yorùbá",                  bcp47:"yo",     region:"Nigeria, Bénin, Togo" },
  { code:"tw",    name:"Twi",            flag:"", hint:"Kasa Twi so",                     bcp47:"ak-GH",  region:"Ghana, Côte d'Ivoire" },
  { code:"en",    name:"English",        flag:"", hint:"Speak in English",                bcp47:"en-GB",  region:"Pan-African" },
];

// Exemples de prompts par langue pour l'aide contextuelle
const VOICE_EXAMPLES = {
  fr:  "Crée une application de gestion de boutique avec paiement Mobile Money",
  wo:  "Dëkk sa app bi ci suukër bi ak Mobile Money",
  dyu: "Ka app dɔ ka sènè dugu kɔnɔ",
  ha:  "Ƙirƙiri app don sarrafa kantin da Mobile Money",
  sw:  "Unda programu ya duka na malipo ya Mobile Money",
  pcm: "Make app for shop wey go take Mobile Money payment",
  am:  "ሱቅ ለማስተዳደር አፕ ፍጠር",
  yo:  "Ṣẹda app fun ile-itaja pẹlu Mobile Money",
  tw:  "Yɛ app wɔ adetɔ ɛdan ho a Mobile Money wɔ mu",
  en:  "Create a shop management app with Mobile Money payment",
};


// Traduction du prompt vocal vers français via Claude
async function translateVoicePrompt(text, sourceLang) {
  if (sourceLang === "fr" || sourceLang === "en") return text;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Traduis ce texte en français. Langue source: ${sourceLang}. Texte: "${text}"
Réponds UNIQUEMENT avec la traduction en français, rien d'autre.`
        }]
      })
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || text;
  } catch { return text; }
}

// Hook : reconnaissance vocale Web Speech API
function useVoiceRecognition({ onResult, onError, lang }) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { onError?.("Ton navigateur ne supporte pas la reconnaissance vocale. Utilise Chrome."); return; }
    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.onstart = () => setListening(true);
    rec.onend = () => { setListening(false); setInterim(""); };
    rec.onerror = e => { setListening(false); onError?.(e.error); };
    rec.onresult = e => {
      let final = "", inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else inter += e.results[i][0].transcript;
      }
      setInterim(inter);
      if (final) { onResult?.(final.trim()); setInterim(""); }
    };
    recRef.current = rec;
    rec.start();
  }, [lang, onResult, onError]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, interim, start, stop };
}

// Synthèse vocale (TTS) — lit le résultat à voix haute
function speak(text, lang = "fr-FR") {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.rate = 0.9;
  utt.pitch = 1;
  window.speechSynthesis.speak(utt);
}



const AI_MODELS = [
  { id:"fast",     name:"Rapide",   model:"claude-haiku-4-5-20251001", icon:"*", desc:"Génération rapide",        minPlan:"free" },
  { id:"balanced", name:"Avancé",   model:"claude-sonnet-4-20250514",  icon:"", desc:"Le meilleur équilibre",   minPlan:"starter" },
  { id:"power",    name:"Puissant", model:"claude-opus-4-20250514",    icon:"", desc:"Pour les projets complexes", minPlan:"business" },
];
// Ordre des plans pour savoir si un modèle est débloqué
const PLAN_RANK = { free:0, starter:1, pro:2, business:3 };

async function callAI(model, systemPrompt, userPrompt, maxTokens = 7000, onChunk) {
  // Multi-fournisseurs : Claude (Anthropic) et GPT (OpenAI). Le backend route selon le prefixe.
  const isClaude = typeof model === "string" && model.startsWith("claude-");
  const isGPT = typeof model === "string" && model.startsWith("gpt-");
  const chosenModel = (isClaude || isGPT) ? model : MODEL;
  // Quand un backend est branche, il choisit le bon fournisseur (Anthropic ou OpenAI) selon le modele.
  if (backend.enabled()) {
    const parsed = await backend.post("/api/generate", { prompt: userPrompt, systemPrompt, maxTokens, model: chosenModel });
    return JSON.stringify(parsed);
  }
  // En mode demo (sans backend), seul l'appel direct Anthropic est disponible.
  // Les modeles GPT passent par le backend uniquement ; on retombe sur Claude en demo.
  const directModel = isGPT ? MODEL : chosenModel;
  // Streaming SSE — texte au fur et à mesure, comme ChatGPT
  if (onChunk) {
    const resStream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: directModel, max_tokens: maxTokens, stream: true,
        system: systemPrompt, messages: [{ role: "user", content: userPrompt }] })
    });
    if (!resStream.ok) { const e = await resStream.json(); throw new Error(e.error?.message||"Erreur API"); }
    const reader = resStream.body.getReader();
    const dec = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value).split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const d = line.slice(6).trim();
        if (d === "[DONE]") continue;
        try { const p = JSON.parse(d); const t = p.delta?.text||""; if(t){full+=t;onChunk(full,t);} } catch{}
      }
    }
    return full;
  }
  // Sans streaming (appels utilitaires internes)
  const resSync = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: directModel, max_tokens: maxTokens, system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }] })
  });
  const data = await resSync.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.map(b => b.text||"").join("")||"";
}

// ═══════════════════════════════════════════════════════════════════════════
// MODE EXPERT — Jenga analyse le projet AVANT de generer (conseil strategique)
// Retourne : scores, risques, opportunites, version amelioree de l'idee.
// ═══════════════════════════════════════════════════════════════════════════
async function analyzeProject(model, idea) {
  const sys = "Tu es un comite de consultants experts (strategie, marche, finance, marketing) specialise dans l'entrepreneuriat africain. On te donne une idee de projet/app. Tu l'analyses avec lucidite et bienveillance, dans le contexte africain (FCFA, Mobile Money, marche local, contraintes reelles). Tu reponds UNIQUEMENT en JSON valide, sans texte avant ou apres, avec cette structure exacte : {\"scores\":{\"marche\":<0-100>,\"rentabilite\":<0-100>,\"croissance\":<0-100>,\"global\":<0-100>},\"risques\":[\"risque 1 concret\",\"risque 2\",\"risque 3\"],\"opportunites\":[\"opportunite 1 concrete\",\"opportunite 2\",\"opportunite 3\"],\"ameliorations\":[\"amelioration 1 actionnable\",\"amelioration 2\",\"amelioration 3\"],\"versionAmelioree\":\"une description amelioree et enrichie du projet, prete a etre generee, qui integre les meilleures pratiques et corrige les faiblesses\"}. Sois concret, chiffre, adapte a l'Afrique. Pas de generalites.";
  const raw = await callAI(model, sys, "Analyse ce projet et propose une version amelioree. Sois lucide, concret et personnalise selon ce que tu comprends du profil — pas de risques ni d'opportunites generiques, parle de CE projet precis :\n\n" + idea, 2000);
  const clean = raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
  return JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || clean);
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CLIENT — Assistant de support IA. Repond aux questions et plaintes.
// Si le robot ne suffit pas, l'utilisateur peut contacter un humain (appel/WhatsApp).
// ═══════════════════════════════════════════════════════════════════════════
const SUPPORT_FAQ = `
[BASE DE CONNAISSANCES JENGA — pour repondre aux clients]
- Qu'est-ce que Jenga ? Une plateforme qui transforme une idee decrite en francais en application web/mobile complete, avec paiements Mobile Money, et qui conseille l'entrepreneur (Directeurs IA, Aaron).
- Comment creer une app ? Aller dans Studio, decrire son besoin en une phrase, cliquer Generer. En Mode Expert, Jenga analyse avant de generer.
- Les credits : chaque generation ou conseil consomme des credits. Plans : Free (15 credits), Starter (5 000 F, 60), Pro (15 000 F, 180), Business (35 000 F, 450). Quand les credits sont a zero, on recharge ou on change de plan.
- Paiement : Mobile Money (MTN, Orange, Wave, Moov) et cartes. Un recu est fourni.
- Mes donnees : chiffrees, jamais vendues, conformes RGPD. Exportables.
- Probleme de generation : reessayer, reformuler en une phrase claire, verifier sa connexion. Le mode hors-ligne reprend les taches automatiquement.
- Remboursement / probleme de paiement / plainte : transmettre au support humain via WhatsApp ou appel.
- Contact humain : WhatsApp +229 61 31 28 45, Tel +229 21 37 51 24, Email contact@lightco.group.
`;

async function supportReply(model, history, question) {
  const sys = "Tu es l'Assistant Support de Jenga, le service client officiel. Tu es poli, chaleureux, patient et tres clair. Tu aides les clients avec leurs questions, problemes et plaintes. Tu reponds en francais simple (l'utilisateur peut etre debutant). Reponses COURTES et utiles. Tu t'appuies UNIQUEMENT sur la base de connaissances fournie. Si tu ne sais pas, ou si c'est une plainte serieuse, un probleme de paiement, un remboursement ou une demande qui depasse tes infos : tu t'excuses brievement et tu invites clairement a contacter l'equipe humaine par WhatsApp ou appel (donne les numeros). Ne JAMAIS inventer d'information." + SUPPORT_FAQ;
  const convo = (history||[]).map(m=>`${m.role==="user"?"Client":"Support"}: ${m.text}`).join("\n");
  const prompt = (convo? convo+"\n" : "") + "Client: " + question;
  return await callAI(model, sys, prompt, 1000);
}

// ═══════════════════════════════════════════════════════════════════════════
// JENGA BUSINESS STUDIO — generation de documents pro (contrats, devis,
// rapports, business plans, courriers...). Sortie prete a copier/exporter.
// ═══════════════════════════════════════════════════════════════════════════
async function generateBusinessDoc(model, docType, brief, memCtx) {
  const sys = "Tu es l'equipe documentaire de Jenga Executive Studio : un redacteur professionnel, un juriste et une assistante de direction reunis. Tu produis des documents d'entreprise prets a etre envoyes a une banque, un investisseur, une administration ou un partenaire — SANS aucune retouche. Contexte africain (FCFA, droit OHADA, realites locales). Tu ecris en francais professionnel impeccable. Tu structures parfaitement (titres, sections, numerotation). Tu ne mets aucun commentaire ni meta-texte : uniquement le document final, propre, complet et utilisable tel quel. Si des informations manquent, tu utilises des champs entre crochets [comme ceci] que l'utilisateur completera." + (memCtx||"");
  const prompt = "Type de document : " + docType + "\n\nDemande de l'utilisateur :\n" + brief + "\n\nProduis le document complet, professionnel et pret a l'emploi.";
  return await callAI(model, sys, prompt, 4000);
}

async function executiveAssistant(model, history, request, memCtx) {
  const sys = "Tu es l'Executive Assistant de Jenga : une assistante de direction d'elite, experimentee, fiable et chaleureuse. Tu aides l'entrepreneur a rediger, organiser, preparer, structurer et corriger tout ce dont il a besoin : courriers, convocations, rapports, comptes rendus, notes de service, documents administratifs, modeles professionnels. Tu travailles en francais professionnel impeccable, contexte africain. Tu es proactive : si une demande est vague, tu proposes une version complete et tu signales gentiment ce qu'il faudrait preciser. Tes livrables sont prets a l'emploi, professionnels, sans meta-commentaire inutile." + (memCtx||"");
  const convo = (history||[]).map(m=>`${m.role==="user"?"Patron":"Assistante"}: ${m.text}`).join("\n");
  const prompt = (convo? convo+"\n" : "") + "Patron: " + request;
  return await callAI(model, sys, prompt, 3000);
}


async function generateBrand(appTitle, description) {
  try {
    const raw = await callAI(
      "claude",
      `Tu génères des identités visuelles professionnelles pour des startups africaines.
Réponds UNIQUEMENT avec du JSON valide:
{
  "primaryColor": "#hexcode",
  "secondaryColor": "#hexcode",
  "accentColor": "#hexcode",
  "bgColor": "#hexcode",
  "fontFamily": "nom de police",
  "slogan": "slogan court et percutant",
  "logoSvg": "...SVG complet en une ligne...",
  "faviconEmoji": "emoji représentatif"
}
Règles: couleurs harmonieuses professionnelles, logo SVG simple et mémorable, slogan en français africain.`,
      `App: ${appTitle}. Description: ${description}`
    );
    const clean = raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
    return JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || clean);
  } catch { return null; }
}


const FULLSTACK_SYSTEM_PROMPT = `Tu es un architecte full-stack senior. Tu génères des applications complètes.

RÈGLE ABSOLUE: JSON uniquement. Zéro texte. Zéro backtick.

FORMAT:
{
  "title": "Nom de l'app",
  "description": "Description",
  "tagline": "Slogan",
  "features": ["f1","f2","f3","f4","f5"],
  "stack": ["React","Node.js","PostgreSQL","Supabase"],
  "africanContext": "Impact africain",
  "agentLogs": {"planner":"...","architect":"...","frontend":"...","backend":"...","qa":"..."},
  "frontend": "...CODE JSX REACT COMPLET... export default App",
  "backend": "// backend/server.js\nconst express = require('express');\n...CODE NODE.JS COMPLET...",
  "schema": "-- schema.sql\nCREATE TABLE...\n...",
  "envExample": "SUPABASE_URL=\nSUPABASE_KEY=\nJWT_SECRET=\nPORT=3001",
  "apiDocs": "# API Documentation\n## Endpoints:\n..."
}

RÈGLES FRONTEND: JSX valide, export default App, styles inline, min 3 vues, données africaines denses.
RÈGLES BACKEND: Express.js complet avec routes CRUD, auth JWT, middleware CORS, gestion erreurs.
RÈGLES SCHEMA: PostgreSQL valide avec UUID, timestamps, Row Level Security, indexes.
RÈGLES DONNÉES: Prénoms africains, villes africaines, monnaies locales (FCFA, ₦, KSh).`;


const MOBILE_SYSTEM_PROMPT = `Tu génères des applications React Native / Expo complètes pour l'Afrique.

RÈGLE ABSOLUE: JSON uniquement. Zéro texte. Zéro backtick.

FORMAT:
{
  "title": "Nom de l'app",
  "description": "Description",
  "tagline": "Slogan",
  "features": ["f1","f2","f3"],
  "stack": ["React Native","Expo","AsyncStorage"],
  "africanContext": "Impact africain",
  "agentLogs": {"planner":"...","architect":"...","frontend":"...","backend":"...","qa":"..."},
  "code": "...CODE REACT NATIVE EXPO COMPLET...",
  "appJson": {"name":"...","slug":"...","version":"1.0.0","platforms":["ios","android"]},
  "packageJson": {"dependencies":{"expo":"~49.0.0","react-native":"0.72.0"}}
}

RÈGLES CODE RN: StyleSheet API, FlatList, TouchableOpacity, AsyncStorage, SafeAreaView.
Design mobile-first: padding safe areas, tailles tactiles min 44px.
Données africaines réalistes. Min 3 écrans avec navigation Stack.`;


const MARKETPLACE_AGENTS = [
  { id:"pos",         icon:"", name:"Agent POS",           category:"Commerce",  price:0,      description:"Système de caisse complet avec inventaire, Mobile Money, rapports", creator:"Jenga", downloads:1240, rating:4.9, color:"#2563eb",
    systemPrompt:"Tu génères des systèmes POS professionnels pour l'Afrique: catalogue produits, caisse, paiement Mobile Money (MTN/Orange/Wave), tickets, rapports. Design style Square POS." },
  { id:"school",      icon:"", name:"Agent École",          category:"Éducation", price:0,      description:"ERP scolaire: élèves, notes, emploi du temps, paiements scolarité", creator:"Jenga", downloads:892,  rating:4.8, color:"#7C3AED",
    systemPrompt:"Tu génères des ERP scolaires pour l'Afrique: gestion élèves, bulletins notes, emploi du temps, paiements FCFA, communication parents. Style PowerSchool." },
  { id:"hospital",    icon:"", name:"Agent Hôpital",        category:"Santé",     price:0,      description:"Dossiers médicaux, consultations, prescriptions, statistiques santé", creator:"Jenga", downloads:654,  rating:4.7, color:"#ef4444",
    systemPrompt:"Tu génères des systèmes de gestion hospitalière: patients, consultations, prescriptions, facturation, stats. Style Doctolib. Noms africains dans les données." },
  { id:"tontine",     icon:"", name:"Agent Tontine",        category:"Fintech",   price:0,      description:"Gestion tontine/njangi: membres, tours, paiements FCFA, historique", creator:"Jenga", downloads:2103, rating:5.0, color:"#F59E0B",
    systemPrompt:"Tu génères des apps de tontine (njangi/likelemba): membres africains, calendrier tours, paiements FCFA, historique, dashboard. Design fintech sombre style Cash App." },
  { id:"microfinance",icon:"", name:"Agent Microfinance",   category:"Fintech",   price:5000,   description:"Gestion prêts, remboursements, épargne, clients, portefeuille", creator:"Jenga", downloads:445,  rating:4.6, color:"#10b981",
    systemPrompt:"Tu génères des systèmes de microfinance africaine: clients, demandes prêts, remboursements, épargne, tableau de bord portefeuille. Montants FCFA." },
  { id:"ecommerce",   icon:"", name:"Agent E-commerce",     category:"Commerce",  price:0,      description:"Marketplace africaine: produits, panier, commandes, Mobile Money", creator:"Jenga", downloads:1567, rating:4.8, color:"#EA580C",
    systemPrompt:"Tu génères des plateformes e-commerce africaines style Jumia: catalogue, panier, commandes, paiement Mobile Money, vendeurs, livraison. Design professionnel." },
  { id:"immo",        icon:"", name:"Agent Immobilier",     category:"Services",  price:0,      description:"Annonces immobilières africaines: location, vente, agents, recherche", creator:"Jenga", downloads:789,  rating:4.7, color:"#0891b2",
    systemPrompt:"Tu génères des plateformes immobilières pour l'Afrique: annonces location/vente, filtres, page détail, contact agent. Style Seloger. Villes africaines." },
  { id:"transport",   icon:"", name:"Agent Transport",      category:"Mobilité",  price:0,      description:"Réservation bus inter-villes: trajets, sièges, Mobile Money, billet", creator:"Jenga", downloads:934,  rating:4.9, color:"#ea580c",
    systemPrompt:"Tu génères des apps de réservation transport inter-villes africaines: trajets (Dakar-Lagos etc.), sièges, prix FCFA, paiement Mobile Money, billet numérique." },
  { id:"restaurant",  icon:"", name:"Agent Restaurant",    category:"Food",      price:0,      description:"Menu, commandes, livraison, cuisine en temps réel, paiement Mobile Money", creator:"Jenga", downloads:1102, rating:4.8, color:"#E0464B",
    systemPrompt:"Tu génères des apps restaurant style Uber Eats pour cuisine africaine: menu (thiéboudienne, ndolé, jollof), commandes, livraison, Mobile Money." },
  { id:"agri",        icon:"", name:"Agent Agriculture",    category:"Agriculture",price:0,     description:"Marketplace agricole: produits, prix marché, vendeurs, acheteurs", creator:"Jenga", downloads:678,  rating:4.6, color:"#16a34a",
    systemPrompt:"Tu génères des marketplaces agricoles pour l'Afrique: produits (mil, igname, cacao), prix FCFA, vendeurs par région, commandes. Style Jumia Agriculture." },
  { id:"hotel",       icon:"", name:"Agent Hôtel",          category:"Tourisme",  price:5000,   description:"Réservation chambres, check-in/out, services, paiement Mobile Money", creator:"Jenga", downloads:312,  rating:4.5, color:"#0ea5e9",
    systemPrompt:"Tu génères des systèmes hôteliers pour l'Afrique: réservation chambres, check-in/out, services, paiement Mobile Money. Design élégant." },
  { id:"rh",          icon:"", name:"Agent RH",             category:"Entreprise",price:5000,   description:"Gestion employés, paie, congés, évaluations, organigramme", creator:"Jenga", downloads:445,  rating:4.7, color:"#6366f1",
    systemPrompt:"Tu génères des systèmes RH pour entreprises africaines: employés, paie FCFA, congés, évaluations, organigramme. Design professionnel." },
  { id:"pharma",      icon:"", name:"Agent Pharmacie",      category:"Santé",     price:5000,   description:"Gestion médicaments, ordonnances, stock, ventes, alertes rupture", creator:"Jenga", downloads:267,  rating:4.6, color:"#10b981",
    systemPrompt:"Tu génères des systèmes de gestion pharmacie: stock médicaments, ordonnances, ventes, alertes rupture, historique. Design médical propre." },
  { id:"election",    icon:"", name:"Agent Vote/Sondage",  category:"Civic",     price:0,      description:"Sondages, votes communautaires, résultats en temps réel", creator:"Jenga", downloads:156,  rating:4.4, color:"#F59E0B",
    systemPrompt:"Tu génères des apps de vote et sondages communautaires: questions, options, résultats temps réel, graphiques. Design civique neutre." },
  { id:"event",       icon:"", name:"Agent Événements",     category:"Loisirs",   price:0,      description:"Billetterie, programme, speakers, inscription, QR tickets", creator:"Jenga", downloads:523,  rating:4.7, color:"#e879f9",
    systemPrompt:"Tu génères des apps de gestion d'événements africains: billetterie, programme, speakers, inscriptions, QR codes. Design moderne et coloré." },
  { id:"crm",         icon:"", name:"Agent CRM",            category:"Entreprise",price:10000,  description:"Clients, prospects, pipeline ventes, factures, historique", creator:"Jenga", downloads:389,  rating:4.8, color:"#2563eb",
    systemPrompt:"Tu génères des CRM pour PME africaines: clients, prospects, pipeline, factures FCFA, historique interactions. Style Pipedrive adapté Afrique." },
  { id:"delivery",    icon:"", name:"Agent Livraison",      category:"Logistique",price:5000,   description:"Suivi colis, livreurs, zones, status, notification client", creator:"Jenga", downloads:612,  rating:4.6, color:"#EA580C",
    systemPrompt:"Tu génères des apps de livraison urbaine africaine: commandes, livreurs, zones, statuts en temps réel, notifications. Style Glovo Afrique." },
  { id:"church",      icon:"", name:"Agent Église/Mosquée", category:"Religion",  price:0,      description:"Membres, événements, offrandes, annonces, planning", creator:"Jenga", downloads:834,  rating:4.8, color:"#7C3AED",
    systemPrompt:"Tu génères des apps de gestion pour lieux de culte africains: membres, événements, offrandes, annonces, planning. Design sobre et respectueux." },
  { id:"parking",     icon:"P", name:"Agent Parking",        category:"Mobilité",  price:5000,   description:"Gestion places, réservations, paiement Mobile Money, accès", creator:"Jenga", downloads:178,  rating:4.5, color:"#475569",
    systemPrompt:"Tu génères des systèmes de gestion parking: places disponibles, réservations, paiement Mobile Money, historique. Design clair et fonctionnel." },
  { id:"water",       icon:"", name:"Agent Eau/Électricité", category:"Utilities", price:0,      description:"Relevé compteurs, facturation, paiement Mobile Money, réclamations", creator:"Jenga", downloads:445,  rating:4.7, color:"#0ea5e9",
    systemPrompt:"Tu génères des apps de gestion utilities pour l'Afrique: relevés compteurs, facturation FCFA, paiement Mobile Money, réclamations. Design utilitaire." },
];

// ═══════════════════════════════════════════════════════════════════════════
// AGENTS BUSINESS — conseillers IA qui résolvent les vrais problèmes des PME
// africaines. Chacun produit un LIVRABLE concret (pas une app). 1 crédit.
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// PERSONNALITE VIVANTE — injectee dans CHAQUE prompt IA de Jenga.
// Objectif : que Jenga ne sonne JAMAIS robotique. Deux clients = deux experiences.
// ═══════════════════════════════════════════════════════════════════════════
const PERSONNALITE = "\\n\\n[TA PERSONNALITE — REGLE ABSOLUE]\\nTu es un associe humain, pas un robot. Tu ne dois JAMAIS sonner mecanique, repetitif ou genere automatiquement. Deux utilisateurs differents ne doivent jamais avoir l'impression de parler a la meme IA.\\n- Adapte ton ton, ton vocabulaire, ton energie et ta facon d'expliquer au profil de la personne. Un debutant timide ne recoit pas la meme reponse qu'un PDG presse. Un restaurateur ne recoit pas la meme reponse qu'un promoteur immobilier.\\n- Varie ta structure : parfois une reponse courte et directe, parfois une question d'abord, parfois un exemple ou une analogie, parfois un avertissement. JAMAIS le meme moule.\\n- Comporte-toi comme un conseiller humain de haut niveau : ose poser une question pertinente avant de repondre si c'est utile, challenge une mauvaise idee avec tact, raconte un exemple concret du terrain africain, signale un risque oublie, felicite une bonne decision.\\n- Sois chaleureux, vivant, spontane. Parle comme un vrai associe qui s'implique, pas comme un manuel. Evite les formules toutes faites et les listes a puces systematiques quand une conversation naturelle conviendrait mieux.\\n- Reste toujours concret, honnete et oriente resultats. Tu peux etre direct quand il le faut : un vrai associe dit la verite, il ne flatte pas.";

const BUSINESS_AGENTS = [
  { id:"commercial", name:"Directeur Commercial IA", tag:"+ de ventes", color:"#15A05A", letter:"C",
    desc:"Strategie commerciale, prospection, offres, negociation, plan de relance.",
    placeholder:"Ex: Comment vendre mes paniers bio aux restaurants de Cotonou ?",
    system:"Tu es un Directeur Commercial senior expert du marche africain (Benin, Senegal, Cote d'Ivoire, Nigeria, Cameroun). Tu produis des livrables commerciaux CONCRETS : strategie de prospection, scripts WhatsApp/telephone, offres chiffrees en FCFA, arguments de vente, plan de relance, objectifs de vente. Tu connais Mobile Money, la negociation locale, les circuits informels. Reponds en francais, structure, immediatement actionnable, avec des exemples concrets." },
  { id:"marketing", name:"Directeur Marketing IA", tag:"+ de visibilite", color:"#E5484D", letter:"M",
    desc:"Campagnes, contenu reseaux sociaux, publicites, acquisition, image de marque.",
    placeholder:"Ex: Cree une campagne de lancement pour ma boutique de wax",
    system:"Tu es un Directeur Marketing expert du digital africain. Tu maitrises WhatsApp Business, Facebook, Instagram, TikTok, radio locale. Tu produis : strategie marketing, calendrier de contenu, textes de posts prets a publier, scripts de pub, messages WhatsApp Broadcast, slogans, plan d'acquisition. Adapte au contexte africain (langues locales, mobile-first, faible data). Reponds en francais avec des exemples prets a copier-coller." },
  { id:"financier", name:"Directeur Financier IA", tag:"+ de rentabilite", color:"#1C3293", letter:"F",
    desc:"Marges, prix, tresorerie, rentabilite, budget, reduction des couts.",
    placeholder:"Ex: J'achete un sac de riz a 18000 FCFA, quel prix de revente ?",
    system:"Tu es un Directeur Financier expert des PME africaines. Tu raisonnes en FCFA. Tu produis : calculs de marge, prix de vente conseille, seuil de rentabilite, previsions de tresorerie, budget previsionnel, analyse de couts. Tu expliques simplement, sans jargon. Tu donnes des chiffres precis et des tableaux clairs. Reponds en francais, actionnable." },
  { id:"operations", name:"Directeur Operations IA", tag:"+ d'efficacite", color:"#CAA546", letter:"O",
    desc:"Process, automatisation, organisation, productivite, qualite.",
    placeholder:"Ex: Aide-moi a organiser le travail de mes 3 employes",
    system:"Tu es un Directeur des Operations expert des petites entreprises africaines. Tu produis : process etape par etape, organisation d'equipe, repartition des taches, modeles de documents, checklists, optimisation des flux de travail. Tu prends en compte les realites locales (electricite, connexion, formation). Reponds en francais, concret, immediatement applicable." },
  { id:"rh", name:"Directeur RH IA", tag:"+ de talents", color:"#8B5CF6", letter:"R",
    desc:"Recrutement, fiches de poste, contrats, evaluation, gestion d'equipe.",
    placeholder:"Ex: Redige une offre d'emploi pour un vendeur experimente",
    system:"Tu es un Directeur des Ressources Humaines expert du contexte africain. Tu produis : offres d'emploi, fiches de poste, grilles d'entretien, modeles de contrat (CDD/CDI adaptes au droit local OHADA), grilles d'evaluation, plans de formation. Tu connais les realites du marche du travail africain. Reponds en francais, professionnel, pret a utiliser." },
  { id:"digital", name:"Conseiller Transformation Digitale IA", tag:"+ de modernite", color:"#0891B2", letter:"D",
    desc:"Digitalisation des process, choix d'outils, automatisation, presence en ligne.",
    placeholder:"Ex: Comment digitaliser la gestion de ma quincaillerie ?",
    system:"Tu es un Conseiller en Transformation Digitale expert des PME africaines. Tu produis : diagnostic digital, feuille de route de digitalisation, recommandations d'outils adaptes (gratuits/abordables), plan d'automatisation, strategie de presence en ligne. Tu es pragmatique : tu proposes des solutions realistes pour le contexte africain (budget limite, connexion variable). Tu recommandes Jenga quand pertinent pour creer les apps. Reponds en francais, concret." },
];;


// ─── UTILS ───────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat("fr-FR").format(n);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);
const ls = {
  get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}},
  del:k=>{try{localStorage.removeItem(k)}catch{}}
};

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTANCE DES PROJETS — garantit que l'apercu genere reste INTACT.
// Les apps generees sont volumineuses ; localStorage peut saturer. On sauve
// de maniere robuste : si l'espace manque, on retire les plus ANCIENS projets
// (jamais le code du projet courant), sans jamais perdre silencieusement un apercu.
// ═══════════════════════════════════════════════════════════════════════════
const PROJECTS_KEY = "ab7_projects";
const projectStore = {
  load: () => ls.get(PROJECTS_KEY, []),
  // Sauvegarde en preservant l'integralite de l'apercu (result + code).
  // Retourne true si tout est sauve, false si une eviction a eu lieu.
  save: (projects) => {
    // Tentative directe
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
      return true;
    } catch (e) {
      // Quota depasse : on reduit le nombre de projets en gardant les plus recents
      // (le projet courant est toujours en tete de liste, donc protege).
      const trimmed = [...projects];
      while (trimmed.length > 1) {
        trimmed.pop(); // retire le plus ancien
        try {
          localStorage.setItem(PROJECTS_KEY, JSON.stringify(trimmed));
          return false; // sauve, mais des anciens ont ete evinces
        } catch (e2) { /* continue a reduire */ }
      }
      // En dernier recours : ne garder que le projet courant, apercu intact
      try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(0,1))); } catch(e3){}
      return false;
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// JOBS PERSISTANTS — comme Vercel / GitHub Actions / Expo
// La génération continue même onglet fermé. Reprise automatique au retour.
// ═══════════════════════════════════════════════════════════════════════════
const JOBS_KEY = "jenga_jobs_v1";
const JOB_STATUS = { QUEUED:"queued", RUNNING:"running", DONE:"done", FAILED:"failed" };

const jobStore = {
  all:   ()       => ls.get(JOBS_KEY, []),
  save:  (jobs)   => ls.set(JOBS_KEY, jobs),
  add:   (job)    => { const jobs = ls.get(JOBS_KEY,[]); jobs.unshift({...job, createdAt:Date.now(), updatedAt:Date.now()}); ls.set(JOBS_KEY, jobs.slice(0,50)); return job; },
  update:(id,pat) => { const jobs = ls.get(JOBS_KEY,[]).map(j=>j.id===id?{...j,...pat,updatedAt:Date.now()}:j); ls.set(JOBS_KEY, jobs); },
  get:   (id)     => ls.get(JOBS_KEY,[]).find(j=>j.id===id),
  recent:(n=10)   => ls.get(JOBS_KEY,[]).slice(0,n),
};

const notify = (title, body) => {
  if("Notification" in window && Notification.permission==="granted"){
    try{ new Notification(title, { body, tag:"jenga-job" }); }catch{}
  }
};
const askNotifPermission = () => {
  if("Notification" in window && Notification.permission==="default") Notification.requestPermission();
};

function useJobs() {
  const [jobs, setJobs] = useState(() => jobStore.recent());
  useEffect(() => {
    const refresh = () => setJobs(jobStore.recent());
    const onStorage = (e) => { if(e.key===JOBS_KEY) refresh(); };
    window.addEventListener("storage", onStorage);
    const t = setInterval(refresh, 1000);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(t); };
  }, []);
  return jobs;
}

// ═══════════════════════════════════════════════════════════════════════════
// REPRISE APRÈS COUPURE — relance les jobs interrompus (comme Vercel/CI)
// ═══════════════════════════════════════════════════════════════════════════
function resumeInterruptedJobs() {
  const jobs = jobStore.all();
  let restored = 0;
  jobs.forEach(j => {
    if (j.status === JOB_STATUS.RUNNING) {
      jobStore.update(j.id, { status: JOB_STATUS.QUEUED, log: [...(j.log||[]), "Reprise apres interruption..."] });
      restored++;
    }
  });
  return restored;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODE HORS LIGNE & FAIBLE BANDE PASSANTE — détection réseau temps réel
// ═══════════════════════════════════════════════════════════════════════════
function useNetwork() {
  const [online, setOnline] = useState(typeof navigator!=="undefined"?navigator.onLine:true);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    // Détection connexion lente (Network Information API)
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      const check = () => setSlow(["slow-2g","2g","3g"].includes(conn.effectiveType));
      check();
      conn.addEventListener?.("change", check);
    }
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return { online, slow };
}

// Bannière réseau — affichée quand hors ligne ou connexion lente
function NetworkBanner({ online, slow }) {
  if (online && !slow) return null;
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,padding:"8px 16px",
      background:online?"#92400E":"#7F1D1D",color:"#fff",fontSize:13,fontWeight:600,
      textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      <span style={{width:8,height:8,borderRadius:"50%",background:online?"#FCD34D":"#FCA5A5",display:"inline-block"}}/>
      {online ? "Connexion lente detectee - mode economie de donnees actif" : "Hors ligne - tes projets sont sauvegardes localement, la generation reprendra au retour du reseau"}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTÈME DE PARRAINAGE — code de référence + récompenses (comme Dropbox)
// ═══════════════════════════════════════════════════════════════════════════
const REFERRAL_KEY = "jenga_referral_v1";
function getReferralCode(user) {
  let r = ls.get(REFERRAL_KEY, null);
  if (!r) {
    const base = (user?.email || user?.id || "jenga").split("@")[0].replace(/[^a-zA-Z0-9]/g,"").slice(0,6).toUpperCase();
    r = { code: base + Math.random().toString(36).slice(2,5).toUpperCase(), invited: 0, creditsEarned: 0 };
    ls.set(REFERRAL_KEY, r);
  }
  return r;
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMOIRE BUSINESS — Jenga se souvient de TON entreprise d'une session a l'autre.
// Objectif : chaque conseil, chaque generation devient personnalise et pertinent.
// C'est ce qui transforme Jenga d'un outil en associe qui connait ton activite.
// ═══════════════════════════════════════════════════════════════════════════
const MEMORY_KEY = "jenga_business_memory_v1";

const businessMemory = {
  get: () => ls.get(MEMORY_KEY, {
    activite:"", ville:"", objectif:"", budget:"", cible:"",
    projets:[], faits:[], updatedAt:null
  }),
  save: (mem) => ls.set(MEMORY_KEY, { ...mem, updatedAt: Date.now() }),
  // Met a jour un champ du profil business
  setField: (field, value) => {
    const m = businessMemory.get();
    m[field] = value;
    businessMemory.save(m);
  },
  // Ajoute un projet genere a l'historique memoire (max 20)
  addProject: (title, prompt) => {
    const m = businessMemory.get();
    m.projets = [{ title, prompt: (prompt||"").slice(0,160), at: Date.now() }, ...(m.projets||[])].slice(0, 20);
    businessMemory.save(m);
  },
  // Ajoute un fait appris sur l'entreprise (max 15)
  addFact: (fact) => {
    const m = businessMemory.get();
    if (!fact || (m.faits||[]).some(f => f.toLowerCase() === fact.toLowerCase())) return;
    m.faits = [fact, ...(m.faits||[])].slice(0, 15);
    businessMemory.save(m);
  },
  // Construit le contexte a injecter dans les prompts IA (personnalisation)
  context: () => {
    const m = businessMemory.get();
    const parts = [];
    if (m.activite) parts.push("Activite : " + m.activite);
    if (m.ville) parts.push("Ville/Pays : " + m.ville);
    if (m.cible) parts.push("Clients cibles : " + m.cible);
    if (m.objectif) parts.push("Objectif principal : " + m.objectif);
    if (m.budget) parts.push("Budget : " + m.budget);
    if ((m.faits||[]).length) parts.push("A retenir : " + m.faits.slice(0,6).join(" ; "));
    if ((m.projets||[]).length) parts.push("Projets deja crees : " + m.projets.slice(0,4).map(p=>p.title).join(", "));
    if (!parts.length) return "";
    return "\n\n[MEMOIRE BUSINESS DE L'UTILISATEUR — personnalise ta reponse en fonction de ce contexte reel, ne donne jamais de conseil generique]\n" + parts.join("\n");
  },
  isEmpty: () => {
    const m = businessMemory.get();
    return !m.activite && !m.ville && !m.objectif && !(m.faits||[]).length;
  }
};

// Hook reactif sur la memoire
function useBusinessMemory() {
  const [mem, setMem] = useState(() => businessMemory.get());
  const refresh = useCallback(() => setMem(businessMemory.get()), []);
  useEffect(() => {
    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [refresh]);
  return [mem, refresh];
}

// ═══════════════════════════════════════════════════════════════════════════
// AARON — Directeur Succès Client IA. Ne fait PAS de spam.
// Transforme la memoire business en plan d'action quotidien + opportunites.
// Objectif : faire revenir l'utilisateur en lui apportant de la valeur reelle.
// ═══════════════════════════════════════════════════════════════════════════
const AARON_KEY = "jenga_aaron_v1";

const aaron = {
  get: () => ls.get(AARON_KEY, { plan:null, opportunites:null, date:null, dismissed:[] }),
  save: (d) => ls.set(AARON_KEY, d),
  // Verifie si le plan du jour doit etre regenere (1 fois par jour)
  isStale: () => {
    const d = aaron.get();
    if (!d.date) return true;
    return new Date(d.date).toDateString() !== new Date().toDateString();
  },
  // Genere le plan d'action quotidien personnalise (Aaron analyse ton activite)
  generate: async (model) => {
    const mem = businessMemory.get();
    const ctx = businessMemory.context();
    const sys = "Tu es Aaron, Directeur Succes Client de Jenga. Tu aides un entrepreneur africain a reussir son business. A partir de son profil et de ses projets, tu produis un plan d'action concret pour AUJOURD'HUI et tu detectes des opportunites reelles. Tu n'es jamais generique : tu parles de SON activite precise, avec un ton humain, chaleureux et vivant qui varie d'un jour a l'autre (jamais deux saluts identiques, jamais le meme moule). Tu es motivant mais pragmatique, oriente resultats (argent, clients, temps). Contexte africain (FCFA, Mobile Money, WhatsApp). Reponds UNIQUEMENT en JSON valide : {\"salut\":\"un message court, humain et motivant, different a chaque fois (1 phrase)\",\"actions\":[{\"titre\":\"action concrete\",\"pourquoi\":\"benefice precis\"},{...3 actions max}],\"opportunites\":[\"opportunite concrete liee a son activite\",\"...2-3 max\"]}. Sois specifique, vivant et actionnable.";
    const profil = mem.activite ? ctx : "L'utilisateur n'a pas encore rempli son profil business. Encourage-le a le faire et donne des conseils de demarrage generaux mais utiles.";
    const raw = await callAI(model, sys, "Genere mon plan d'action du jour et mes opportunites.\n" + profil, 1500);
    const clean = raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
    const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || clean);
    aaron.save({ plan: parsed, opportunites: parsed.opportunites, date: new Date().toISOString(), dismissed: aaron.get().dismissed||[] });
    return parsed;
  }
};

// Bannière flottante — style Vercel/GitHub Actions
function JobBanner({ jobs, onOpen }) {
  const active = jobs.filter(j => j.status===JOB_STATUS.RUNNING || j.status===JOB_STATUS.QUEUED);
  const lastDone = jobs.find(j => j.status===JOB_STATUS.DONE && Date.now()-j.updatedAt < 7000);
  const lastFail = jobs.find(j => j.status===JOB_STATUS.FAILED && Date.now()-j.updatedAt < 7000);
  const job = active[0] || lastDone || lastFail;
  if (!job) return null;
  const running = job.status===JOB_STATUS.RUNNING || job.status===JOB_STATUS.QUEUED;
  const done    = job.status===JOB_STATUS.DONE;
  const color   = running?T.indigo:done?T.green:T.red;
  return (
    <div onClick={()=>onOpen?.()} style={{
      position:"fixed",bottom:22,left:"50%",transform:"translateX(-50%)",
      background:"#fff",border:"1.5px solid "+color+"33",borderRadius:16,
      padding:"11px 18px",boxShadow:"0 8px 28px rgba(0,0,0,0.13)",
      display:"flex",alignItems:"center",gap:12,cursor:"pointer",zIndex:900,
      maxWidth:400,width:"92vw"
    }}>
      {running
        ? <div style={{width:17,height:17,border:"2.5px solid "+T.indigo+"44",borderTop:"2.5px solid "+T.indigo,borderRadius:"50%",flexShrink:0,animation:"spin 0.8s linear infinite"}}/>
        : <span style={{fontSize:16}}>{done?"OK":"X"}</span>}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:700,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.title||"Job en cours"}</div>
        <div style={{fontSize:11,color:T.inkSoft,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(job.log||[]).at(-1)||""}</div>
      </div>
      {running && job.progress>0 && (
        <div style={{width:40,height:40,position:"relative",flexShrink:0}}>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke={T.line} strokeWidth="4"/>
            <circle cx="20" cy="20" r="16" fill="none" stroke={T.indigo} strokeWidth="4"
              strokeDasharray={String(2*Math.PI*16)}
              strokeDashoffset={String(2*Math.PI*16*(1-(job.progress||0)/100))}
              strokeLinecap="round" style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset .4s"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:T.indigo}}>{job.progress||0}%</div>
        </div>
      )}
      {active.length>1 && <div style={{background:T.indigo,color:"#fff",borderRadius:20,fontSize:11,fontWeight:700,padding:"2px 8px",flexShrink:0}}>+{active.length-1}</div>}
    </div>
  );
}

// Panneau Jobs — style GitHub Actions / Vercel Deployments
function JobsPanel({ onClose, onOpenResult }) {
  const jobs = useJobs();
  const SC = { queued:"#888", running:T.indigo, done:T.green, failed:T.red };
  const SL = { queued:"En attente", running:"En cours", done:"Termine", failed:"Echoue" };
  const SI = { queued:"", running:"", done:"OK", failed:"X" };
  const elapsed = ts => { const s=Math.round((Date.now()-ts)/1000); return s<60?s+"s":s<3600?Math.floor(s/60)+"m":Math.floor(s/3600)+"h"; };
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.52)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:540,maxWidth:"94vw",maxHeight:"78vh",background:"#fff",borderRadius:16,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.2)"}}>
        <div style={{padding:"18px 22px 14px",borderBottom:"1px solid "+T.line,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>Jobs & Builds</div>
            <div style={{fontSize:12,color:T.inkSoft,marginTop:2}}>Continue en arriere-plan, meme onglet ferme.</div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,background:T.surfaceAlt,border:"1px solid "+T.line,borderRadius:"50%",cursor:"pointer",color:T.inkSoft,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="x" size={15}/></button>
        </div>
        <div style={{overflow:"auto",flex:1}}>
          {!jobs.length && <div style={{padding:40,textAlign:"center",color:T.inkFaint,fontSize:14}}>Aucun job pour l instant.<br/>Lance une generation pour la voir ici.</div>}
          {jobs.map((j,idx) => (
            <div key={j.id} onClick={()=>{ if(j.status===JOB_STATUS.DONE&&j.result) onOpenResult?.(j); }}
              style={{padding:"15px 22px",borderBottom:"1px solid "+T.line,display:"flex",gap:13,alignItems:"flex-start",cursor:j.status===JOB_STATUS.DONE?"pointer":"default",background:idx%2===0?"transparent":T.surfaceAlt+"80"}}>
              <div style={{width:30,height:30,borderRadius:8,background:SC[j.status]+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
                {j.status===JOB_STATUS.RUNNING
                  ? <div style={{width:13,height:13,border:"2px solid "+T.indigo+"44",borderTop:"2px solid "+T.indigo,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                  : SI[j.status]}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.title||j.prompt?.slice(0,55)||"Job"}</div>
                <div style={{fontSize:12,color:T.inkSoft,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(j.log||[]).at(-1)||""}</div>
                {j.status===JOB_STATUS.RUNNING && j.progress>0 && (
                  <div style={{marginTop:7,height:3,background:T.line,borderRadius:2,overflow:"hidden"}}>
                    <div style={{width:j.progress+"%",height:"100%",background:T.indigo,borderRadius:2,transition:"width .4s"}}/>
                  </div>
                )}
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                <span style={{padding:"3px 10px",background:SC[j.status]+"18",color:SC[j.status],borderRadius:20,fontSize:11,fontWeight:700}}>{SL[j.status]}</span>
                <span style={{fontSize:11,color:T.inkFaint}}>{elapsed(j.createdAt)} ago</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── SUPABASE (léger) ────────────────────────────────────────────────────────
const sb = {
  async signUp(email,password){try{const r=await fetch(`${SUPABASE_URL}/auth/v1/signup`,{method:"POST",headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})});return await r.json()}catch{return{error:{message:"Erreur réseau"}}}},
  async signIn(email,password){try{const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})});return await r.json()}catch{return{error:{message:"Erreur réseau"}}}},
};

// ─── VERCEL DEPLOY ───────────────────────────────────────────────────────────
async function deployToVercel(title, code){
  // Si backend configuré : déploiement réel via le serveur
  if (backend.enabled()) {
    const r = await backend.post("/api/infra/deploy", { title, code });
    return { url: r.url, id: r.id };
  }
  const appName = title.toLowerCase().replace(/[^a-z0-9]/g,"-").slice(0,28)+"-"+uid();
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title>`+
    `<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></scr`+`ipt>`+
    `<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></scr`+`ipt>`+
    `<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"></scr`+`ipt>`+
    `<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}</style></head><body><div id="root"></div>`+
    `<script type="text/babel">const {useState,useEffect,useRef,useCallback,useMemo}=React;${code.replace(/export\s+default\s+App\s*;?/g,"").replace(/import\s+.*?from\s+['"][^'"]*['"]\s*;?/g,"")}\nReactDOM.render(React.createElement(App),document.getElementById('root'));</scr`+`ipt></body></html>`;
  try{
    const res=await fetch("https://api.vercel.com/v13/deployments",{method:"POST",headers:{"Authorization":`Bearer ${VERCEL_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({name:appName,files:[{file:"index.html",data:html}],projectSettings:{framework:null},target:"production"})});
    const data=await res.json();
    if(data.url) return {url:`https://${data.url}`,id:data.id};
    throw new Error(data.error?.message||"Déploiement échoué");
  }catch(e){throw new Error(e.message)}
}

// ─── SYSTEM PROMPT (frontend) ────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es un développeur React senior de classe mondiale (niveau Stripe, Linear, Vercel).
Tu génères des applications web indistinguables d'une vraie équipe design+dev senior.

AFRIDATA disponible: Pays ${Object.keys(AFRIDATA.countries).join(", ")}. Prénoms ${AFRIDATA.firstNames.slice(0,10).join(", ")}. Noms ${AFRIDATA.lastNames.slice(0,8).join(", ")}.

LOI: JSON uniquement, zéro texte, zéro backtick.
FORMAT: {"title","description","tagline","features":["..."],"stack":["..."],"africanContext","agentLogs":{"planner","design","frontend","backend","qa"},"code":"...JSX export default App"}

INTERDITS (signes d'IA): emojis dans titres, dégradés criards, border-radius>14px sur boutons, ombres énormes, données "Item 1", paddings aléatoires, +4 couleurs.
OBLIGATOIRES (dev senior): sidebar navigation réelle, typo -apple-system hiérarchisée (28/20/15/13px), espacement multiples de 4px, données denses (10-15 entrées, vrais noms africains), palette limitée (1 primaire + grays), tables zebra + hover, formulaires avec focus states, monnaie formatée (1 450 000 FCFA), min 3 vues navigables.
PALETTES: Fintech #0F172A+#22C55E | Santé #FFF+#0EA5E9 | Éducation #FFF+#7C3AED | Transport #FFF+#EA580C | Restaurant #1C1917+#EF4444 | Immobilier #FFF+#0891B2.`;


// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════
function Icon({ name, size=18, color="currentColor", stroke=1.8 }) {
  const p = {
    spark:"M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z",
    folder:"M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    card:"M2 7h20M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z M6 15h4",
    mic:"M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3",
    grid:"M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
    rocket:"M5 13l-2 4 4-2m9-13s4 0 6 2-2 6-2 6l-5 5-6-6 5-5z M9 15l-3 3",
    code:"M8 8l-4 4 4 4 M16 8l4 4-4 4 M14 4l-4 16",
    download:"M12 3v12m0 0l-4-4m4 4l4-4 M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
    wand:"M15 4V2m0 8v-2m-4 0H9m12 0h-2M3 21l9-9m0 0l2-2 4 4-2 2m-4-4l4 4",
    pen:"M12 19l7-7 3 3-7 7-3-3z M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z M2 2l7.586 7.586",
    arrow:"M5 12h14 M13 6l6 6-6 6",
    share:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v14",
    chat:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    check:"M20 6L9 17l-5-5",
    chevron:"M9 18l6-6-6-6",
    x:"M18 6L6 18M6 6l12 12",
    plus:"M12 5v14m-7-7h14",
    search:"M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
    logout:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
    layers:"M12 2l9 5-9 5-9-5 9-5z M3 12l9 5 9-5 M3 17l9 5 9-5",
    bolt:"M13 2L4.5 12.5h6L9 22l8.5-10.5h-6z",
    globe:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z",
    comments:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    phone:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
    mail:"M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 6l-10 7L2 6",
  }[name] || "";
  const fill = ["spark","bolt"].includes(name);
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill?color:"none"} stroke={fill?"none":color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{p.split(" M").map((d,i)=><path key={i} d={i===0?d:"M"+d}/>)}</svg>;
}

function Avatar({ name, size=32 }) {
  const init = (name||"?")[0].toUpperCase();
  const colors = ["#1C3293","#CAA546","#15A05A","#0EA5E9","#8B5CF6","#E0464B"];
  const c = colors[(name||"").charCodeAt(0) % colors.length] || colors[0];
  return <div style={{width:size,height:size,borderRadius:size*0.32,background:`linear-gradient(135deg,${c},${c}CC)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:size*0.42,flexShrink:0,fontFamily:FONT_DISPLAY}}>{init}</div>;
}

function Badge({ children, color=T.indigo, soft }) {
  return <span style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,letterSpacing:"0.01em",background:soft||color+"15",color,border:`1px solid ${color}28`}}>{children}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH SCREEN — premium split hero
// ═══════════════════════════════════════════════════════════════════════════
function AuthScreen({ onAuth }) {
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState("");
  const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const isWide = useWide();

  const inp = {width:"100%",padding:"12px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:14,color:T.ink,outline:"none",fontFamily:FONT,transition:TRANS};
  const focusOn = e=>{e.target.style.borderColor=T.indigo;e.target.style.boxShadow=`0 0 0 4px ${T.indigoSoft}`};
  const focusOff = e=>{e.target.style.borderColor=T.line;e.target.style.boxShadow="none"};

  const submit = async () => {
    if(!email||!password){setError("Renseigne ton email et ton mot de passe.");return;}
    setLoading(true);setError("");
    const fn = mode==="register"?sb.signUp:sb.signIn;
    const res = await fn(email,password);
    if(res.error){setError(res.error.message||"Identifiants incorrects.");setLoading(false);return;}
    onAuth({id:res.user?.id||uid(),email,name:name||email.split("@")[0],token:res.access_token,plan:"free",credits:5,projects:[]});
    setLoading(false);
  };
  const demo = () => onAuth({id:"demo-"+uid(),email:"demo@afribuild.ai",name:"Invité",token:null,plan:"pro",credits:50,projects:[],isDemo:true});

  return (
    <div style={{minHeight:"100vh",display:"flex",fontFamily:FONT,background:T.surface}}>
      {/* Hero */}
      {isWide && (
        <div style={{flex:1,position:"relative",background:T.bg,overflow:"hidden",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"56px 56px 48px"}}>
          {/* ambient grid */}
          <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(${T.gold}22 1px, transparent 1px)`,backgroundSize:"32px 32px",opacity:0.4}}/>
          <div style={{position:"absolute",top:"-15%",right:"-10%",width:480,height:480,borderRadius:"50%",background:`radial-gradient(circle,${T.indigo}40,transparent 70%)`,filter:"blur(20px)"}}/>
          <div style={{position:"absolute",bottom:"-20%",left:"-5%",width:420,height:420,borderRadius:"50%",background:`radial-gradient(circle,${T.gold}28,transparent 70%)`,filter:"blur(20px)"}}/>
          <div style={{position:"relative",display:"flex",alignItems:"center",gap:12}}>
            <Logo size={44}/>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:"#fff",fontFamily:FONT_DISPLAY,letterSpacing:"-0.02em"}}>Jenga</div>
              <div style={{fontSize:11,color:T.navInkSoft,letterSpacing:"0.18em",textTransform:"uppercase"}}>AI App Studio</div>
            </div>
          </div>
          <div style={{position:"relative",maxWidth:480}}>
            <div className="ab-rise" style={{fontSize:46,fontWeight:800,color:"#fff",lineHeight:1.08,letterSpacing:"-0.035em",fontFamily:FONT_DISPLAY,marginBottom:22}}>
              Des applications<br/>africaines, <span style={{color:T.gold}}>conçues</span><br/>en quelques secondes.
            </div>
            <div style={{fontSize:16,color:T.navInk,lineHeight:1.7,marginBottom:36,maxWidth:420}}>
              Décris ton idée. Jenga la conçoit, la construit et te conseille — frontend, backend, paiement Mobile Money et déploiement en un clic.
            </div>
            <div className="ab-stagger" style={{display:"flex",flexDirection:"column",gap:16}}>
              {[["Génération en 30 secondes","Du prompt à l'app fonctionnelle"],["Paiement panafricain","CinetPay · Flutterwave · MTN · Orange · Wave"],["Déploiement instantané","URL publique en un clic"]].map(([t,d],i)=>(
                <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{width:34,height:34,borderRadius:10,background:T.navActive,border:`1px solid ${T.navLine}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:T.gold}}><Icon name={["bolt","card","rocket"][i]} size={16}/></div>
                  <div><div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{t}</div><div style={{fontSize:13,color:T.navInkSoft,marginTop:1}}>{d}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{position:"relative",fontSize:12,color:T.navInkSoft}}>Propulsé par Jenga Intelligence · Conçu en Afrique</div>
        </div>
      )}
      {/* Form */}
      <div style={{width:isWide?500:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:isWide?"48px 56px":"32px 24px",background:T.surface}}>
        <div style={{width:"100%",maxWidth:380,margin:"0 auto"}}>
          {!isWide && <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:32}}><Logo size={38} dark/><span style={{fontSize:18,fontWeight:800,fontFamily:FONT_DISPLAY,color:T.ink}}>Jenga</span></div>}
          <div style={{fontSize:28,fontWeight:800,color:T.ink,letterSpacing:"-0.03em",fontFamily:FONT_DISPLAY,marginBottom:6}}>{mode==="login"?"Content de te revoir":"Crée ton compte"}</div>
          <div style={{fontSize:14,color:T.inkSoft,marginBottom:28}}>{mode==="login"?"Connecte-toi pour continuer à construire.":"Commence gratuitement, sans carte bancaire."}</div>
          <button onClick={demo} style={{width:"100%",padding:"12px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:14,fontWeight:600,color:T.ink,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:18,transition:TRANS}} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background=T.surface}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"/></svg>
            Continuer avec Google
          </button>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}><div style={{flex:1,height:1,background:T.line}}/><span style={{fontSize:12,color:T.inkFaint}}>ou</span><div style={{flex:1,height:1,background:T.line}}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:13,marginBottom:18}}>
            {mode==="register" && <div><label style={{fontSize:13,fontWeight:600,color:T.inkSoft,display:"block",marginBottom:6}}>Nom complet</label><input placeholder="Amadou Diallo" value={name} onChange={e=>setName(e.target.value)} style={inp} onFocus={focusOn} onBlur={focusOff}/></div>}
            <div><label style={{fontSize:13,fontWeight:600,color:T.inkSoft,display:"block",marginBottom:6}}>Email</label><input type="email" placeholder="amadou@exemple.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={inp} onFocus={focusOn} onBlur={focusOff}/></div>
            <div><label style={{fontSize:13,fontWeight:600,color:T.inkSoft,display:"block",marginBottom:6}}>Mot de passe</label><input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} style={inp} onFocus={focusOn} onBlur={focusOff}/></div>
          </div>
          {error && <div style={{padding:"10px 13px",background:T.redSoft,border:`1px solid ${T.red}33`,borderRadius:10,fontSize:13,color:T.red,marginBottom:14}}>{error}</div>}
          <button onClick={submit} disabled={loading} style={{width:"100%",padding:"13px",background:loading?T.inkFaint:T.ink,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",transition:"transform .1s, background .15s",marginBottom:18,fontFamily:FONT_DISPLAY}} onMouseDown={e=>!loading&&(e.currentTarget.style.transform="scale(0.985)")} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
            {loading?"Connexion…":mode==="login"?"Se connecter":"Créer mon compte"}
          </button>
          <div style={{textAlign:"center",fontSize:13,color:T.inkSoft}}>{mode==="login"?"Pas encore de compte ?":"Déjà inscrit ?"}{" "}<button onClick={()=>{setMode(mode==="login"?"register":"login");setError("")}} style={{background:"none",border:"none",color:T.indigo,cursor:"pointer",fontSize:13,fontWeight:700}}>{mode==="login"?"Créer un compte":"Se connecter"}</button></div>
          <div style={{textAlign:"center",marginTop:14}}><button onClick={demo} style={{background:"none",border:"none",color:T.inkFaint,cursor:"pointer",fontSize:13,textDecoration:"underline",textUnderlineOffset:3}}>Continuer en mode démo</button></div>
        </div>
      </div>
    </div>
  );
}

function Logo({ size=40, dark }) {
  // Logo officiel Jenga — hexagone bleu #1C3293 avec le "J" en negatif blanc.
  // Reproduction fidele du logo fourni. Ne pas modifier les proportions.
  return (
    <div style={{width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{display:"block"}}>
        <defs>
          <clipPath id={"jhex"+size}>
            <path d="M50 5 L87 27 L87 73 L50 95 L13 73 L13 27 Z"/>
          </clipPath>
        </defs>
        {/* Hexagone bleu officiel */}
        <path d="M50 5 L87 27 L87 73 L50 95 L13 73 L13 27 Z" fill={dark?"#FFFFFF":"#1C3293"}/>
        {/* "J" en negatif blanc, fidele au logo officiel */}
        <g clipPath={`url(#jhex${size})`}>
          <path d="M44 24 L52 24 L52 56 Q52 70 38 70 Q25 70 23 57 L31 57 Q32 63 38 63 Q44 63 44 55 Z" fill={dark?"#1C3293":"#FFFFFF"}/>
        </g>
      </svg>
    </div>
  );
}

// Logo complet avec mot-symbole "JENGA" (pour ecrans d'accueil / connexion)
function LogoFull({ height=32, dark }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:height*0.34}}>
      <Logo size={height*1.15} dark={dark}/>
      <span style={{fontSize:height*0.92,fontWeight:800,letterSpacing:"-0.01em",color:dark?"#FFFFFF":"#1C3293",fontFamily:FONT_DISPLAY,lineHeight:1}}>JENGA</span>
    </div>
  );
}

// responsive hook
function useWide(bp=900){
  const [w,setW]=useState(typeof window!=="undefined"?window.innerWidth>=bp:true);
  useEffect(()=>{const f=()=>setW(window.innerWidth>=bp);window.addEventListener("resize",f);return()=>window.removeEventListener("resize",f)},[bp]);
  return w;
}


// ═══════════════════════════════════════════════════════════════════════════
// LIVE PREVIEW
// ═══════════════════════════════════════════════════════════════════════════
function LivePreview({ code, onError, plan="free" }) {
  const ref = useRef(null);
  const [ready,setReady] = useState(false);
  useEffect(()=>{
    if(!code||!ref.current) return;
    setReady(false);
    const c = code.replace(/export\s+default\s+App\s*;?/g,"").replace(/import\s+.*?from\s+['"][^'"]*['"]\s*;?/g,"");
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>`+
    `<scr`+`ipt src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.development.js"></scr`+`ipt>`+
    `<scr`+`ipt src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.development.js"></scr`+`ipt>`+
    `<scr`+`ipt src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"></scr`+`ipt>`+
    `<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html,body{height:100%}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff}::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}</style>`+
    `<scr`+`ipt>window.onerror=function(m){window.parent.postMessage({type:'PREVIEW_ERROR',message:m},'*');return true}</scr`+`ipt>`+
    `</head><body><div id="root" style="height:100%"></div>`+
    `<scr`+`ipt type="text/babel">const {useState,useEffect,useRef,useCallback,useMemo,useReducer}=React;${c}\ntry{ReactDOM.render(React.createElement(App),document.getElementById('root'))}catch(e){window.parent.postMessage({type:'PREVIEW_ERROR',message:e.message},'*');document.getElementById('root').innerHTML='<div style=\"padding:24px;color:#E0464B;font-family:monospace;font-size:13px;white-space:pre-wrap\">'+e.message+'</div>'}</scr`+`ipt>`+
    ((plan||"free")==="free"?`<a href="https://jenga.app" target="_blank" style="position:fixed;bottom:14px;right:14px;z-index:99999;display:flex;align-items:center;gap:6px;padding:7px 13px;background:#14246E;color:#fff;border-radius:30px;font-family:-apple-system,sans-serif;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 4px 16px rgba(0,0,0,0.2)"><span style="display:inline-block;width:14px;height:14px;background:#CAA546;border-radius:3px"></span>Fait avec Jenga</a>`:``)+
    `</body></html>`;
    const blob=new Blob([html],{type:"text/html"}); const url=URL.createObjectURL(blob);
    ref.current.onload=()=>setReady(true); ref.current.src=url;
    return ()=>URL.revokeObjectURL(url);
  },[code,plan]);
  useEffect(()=>{const h=e=>{if(e.data?.type==="PREVIEW_ERROR")onError?.(e.data.message)};window.addEventListener("message",h);return ()=>window.removeEventListener("message",h)},[onError]);
  return (
    <div style={{position:"relative",width:"100%",height:"100%"}}>
      {!ready && <div style={{position:"absolute",inset:0,background:T.surfaceAlt,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,zIndex:5}}>
        <div style={{width:38,height:38,border:`2.5px solid ${T.line}`,borderTopColor:T.indigo,borderRadius:"50%",animation:"abspin .8s linear infinite"}}/>
        <div style={{color:T.inkFaint,fontSize:13,fontWeight:500}}>Rendu de l'application…</div>
      </div>}
      <iframe ref={ref} title="preview" sandbox="allow-scripts allow-same-origin allow-forms" style={{width:"100%",height:"100%",border:"none",opacity:ready?1:0,transition:"opacity .35s"}}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CODE VIEWER
// ═══════════════════════════════════════════════════════════════════════════
function CodeViewer({ code, fileName }) {
  const [copied,setCopied]=useState(false);
  const copy=()=>{navigator.clipboard.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),1800)};
  const lines = code.split("\n");
  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0C0F1A"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 16px",background:"#11151F",borderBottom:"1px solid #1C2233",flexShrink:0}}>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          {["#FF5F57","#FEBC2E","#28C840"].map(c=><div key={c} style={{width:11,height:11,borderRadius:"50%",background:c}}/>)}
          <span style={{marginLeft:10,color:"#6B7488",fontSize:12,fontFamily:FONT_MONO}}>{fileName} · {lines.length} lignes</span>
        </div>
        <button onClick={copy} style={{background:copied?T.green:"#1C2233",color:copied?"#fff":"#9AA3B8",border:`1px solid ${copied?T.green:"#2A3147"}`,borderRadius:8,padding:"5px 14px",cursor:"pointer",fontSize:12,fontWeight:600,transition:TRANS,display:"flex",alignItems:"center",gap:6}}>
          {copied?<><Icon name="check" size={13}/>Copié</>:"Copier"}
        </button>
      </div>
      <div style={{flex:1,overflow:"auto",display:"flex"}}>
        <div style={{padding:"16px 0",background:"#0C0F1A",borderRight:"1px solid #1C2233",userSelect:"none",flexShrink:0}}>
          {lines.map((_,i)=><div key={i} style={{padding:"0 16px 0 14px",fontSize:13,lineHeight:"22px",color:"#3A4254",fontFamily:FONT_MONO,textAlign:"right",minWidth:50}}>{i+1}</div>)}
        </div>
        <pre style={{flex:1,margin:0,padding:"16px 20px",color:"#D8DEE9",fontSize:13,fontFamily:FONT_MONO,lineHeight:"22px",overflow:"auto",tabSize:2}}>{code}</pre>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT PIPELINE
// ═══════════════════════════════════════════════════════════════════════════
function AgentPanel({ logs, active }) {
  return (
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:9,overflow:"auto",height:"100%"}}>
      <div style={{fontSize:11,fontWeight:700,color:T.inkFaint,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Pipeline de génération</div>
      {AGENTS.map((a,idx)=>{
        const isActive=active.includes(a.id); const isDone=logs?.[a.id];
        return (
          <div key={a.id} style={{background:isDone?T.greenSoft:isActive?T.indigoSoft:T.surfaceAlt,border:`1px solid ${isDone?T.green+"33":isActive?T.indigo+"33":T.line}`,borderRadius:12,padding:"13px 15px",transition:"all .35s"}}>
            <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:isDone?9:0}}>
              <div style={{width:30,height:30,borderRadius:10,background:isDone?T.green+"1F":isActive?T.indigo+"1F":T.line,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",flexShrink:0,fontFamily:FONT_DISPLAY,fontWeight:800,fontSize:13,color:isDone?T.green:isActive?T.indigo:T.inkFaint}}>
                {idx+1}
                {isActive&&<div style={{position:"absolute",inset:-3,borderRadius:10,border:`2px solid ${a.color}`,borderTopColor:"transparent",animation:"abspin 1s linear infinite"}}/>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:isDone?T.green:isActive?T.ink:T.inkFaint}}>{a.label}</div>
                <div style={{fontSize:11,color:isDone?T.green:isActive?T.inkSoft:T.inkFaint}}>{isDone?"Terminé":isActive?"En cours…":"En attente"}</div>
              </div>
              {isDone&&<div style={{color:T.green}}><Icon name="check" size={17}/></div>}
            </div>
            {isDone&&logs[a.id]&&<div style={{fontSize:12,color:T.green,background:"#fff",borderRadius:8,padding:"9px 11px",lineHeight:1.6,border:`1px solid ${T.green}22`}}>{logs[a.id]}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VOICE BUTTON
// ═══════════════════════════════════════════════════════════════════════════
function VoiceButton({ onTranscript, onTranslating, currentLang, onLangChange, compact }) {
  const [showPicker,setShowPicker]=useState(false);
  const [translating,setTranslating]=useState(false);
  const [voiceError,setVoiceError]=useState("");
  const lang = AFRICAN_LANGUAGES.find(l=>l.code===currentLang)||AFRICAN_LANGUAGES[0];
  const { listening, interim, start, stop } = useVoiceRecognition({
    lang:lang.bcp47,
    onResult: async (text)=>{
      if(currentLang!=="fr"&&currentLang!=="en"){setTranslating(true);onTranslating?.(true);const tr=await translateVoicePrompt(text,currentLang);setTranslating(false);onTranslating?.(false);onTranscript?.(tr,text,currentLang);}
      else onTranscript?.(text,text,currentLang);
    },
    onError:(e)=>{setVoiceError(e==="not-allowed"?"Micro refusé — autorise l'accès.":e==="no-speech"?"Aucune voix détectée.":"Erreur micro");setTimeout(()=>setVoiceError(""),3000);}
  });
  return (
    <div style={{position:"relative",flexShrink:0}}>
      {showPicker && <>
        <div onClick={()=>setShowPicker(false)} style={{position:"fixed",inset:0,zIndex:90}}/>
        <div style={{position:"absolute",bottom:"calc(100% + 10px)",right:0,background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,boxShadow:"0 16px 48px rgba(11,14,24,0.18)",width:264,zIndex:100,overflow:"hidden"}}>
          <div style={{padding:"11px 15px",borderBottom:`1px solid ${T.lineSoft}`,fontSize:11,fontWeight:700,color:T.inkFaint,textTransform:"uppercase",letterSpacing:"0.08em"}}>Langue de dictée</div>
          <div style={{maxHeight:300,overflow:"auto",padding:6}}>
            {AFRICAN_LANGUAGES.map(l=>(
              <button key={l.code} onClick={()=>{onLangChange?.(l.code);setShowPicker(false)}} style={{width:"100%",padding:"10px 11px",background:currentLang===l.code?T.indigoSoft:"transparent",border:"none",borderRadius:10,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:11,transition:TRANS}} onMouseEnter={e=>{if(currentLang!==l.code)e.currentTarget.style.background=T.surfaceAlt}} onMouseLeave={e=>{if(currentLang!==l.code)e.currentTarget.style.background="transparent"}}>
                <span style={{fontSize:20}}>{l.flag}</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:currentLang===l.code?700:500,color:currentLang===l.code?T.indigo:T.ink}}>{l.name}</div><div style={{fontSize:11,color:T.inkFaint}}>{l.region}</div></div>
                {currentLang===l.code&&<div style={{color:T.indigo}}><Icon name="check" size={15}/></div>}
              </button>
            ))}
          </div>
        </div>
      </>}
      {voiceError && <div style={{position:"absolute",bottom:"calc(100% + 10px)",right:0,background:T.redSoft,border:`1px solid ${T.red}33`,borderRadius:10,padding:"8px 12px",fontSize:12,color:T.red,whiteSpace:"nowrap",zIndex:100}}>{voiceError}</div>}
      {(interim||translating) && <div style={{position:"absolute",bottom:"calc(100% + 10px)",right:0,background:T.ink,color:"#fff",borderRadius:10,padding:"9px 13px",fontSize:13,maxWidth:240,zIndex:100,lineHeight:1.5}}>{translating?"Traduction…":<>{lang.flag} {interim}</>}</div>}
      <div style={{display:"flex",gap:7}}>
        <button onClick={()=>setShowPicker(s=>!s)} style={{height:46,padding:"0 11px",background:showPicker?T.indigoSoft:T.surfaceAlt,border:`1.5px solid ${showPicker?T.indigo+"44":T.line}`,borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:TRANS}} title="Choisir la langue">
          <span style={{fontSize:18}}>{lang.flag}</span>{!compact&&<span style={{fontSize:11,color:T.inkSoft,fontWeight:600}}>{lang.name}</span>}<Icon name="chevron" size={13} color={T.inkFaint}/>
        </button>
        <button onClick={listening?stop:start} disabled={translating} title={listening?"Arrêter":`Dicter en ${lang.name}`} style={{width:46,height:46,background:listening?T.red:translating?T.inkFaint:T.surfaceAlt,border:`1.5px solid ${listening?T.red:T.line}`,borderRadius:12,cursor:translating?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:TRANS,animation:listening?"abmic 1.5s infinite":"none"}}>
          {translating?<div style={{width:15,height:15,border:"2px solid #fff",borderTopColor:"transparent",borderRadius:"50%",animation:"abspin .8s linear infinite"}}/>:<Icon name="mic" size={17} color={listening?"#fff":T.inkSoft}/>}
        </button>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// PRICING MODAL
// ═══════════════════════════════════════════════════════════════════════════
function PricingModal({ currentPlan, onClose, onSelectPlan }) {
  const [billing,setBilling]=useState("monthly");
  const [currency,setCurrency]=useState("XOF");
  const [step,setStep]=useState(null);
  const [method,setMethod]=useState("cinetpay");
  const [card,setCard]=useState({number:"",expiry:"",cvv:"",name:"",email:""});
  const [mmo,setMmo]=useState({phone:"",op:"MTN"});
  const [processing,setProcessing]=useState(false);
  const [success,setSuccess]=useState(false);
  const plan = PLANS.find(p=>p.id===step);
  const isWide = useWide(720);
  const inp={width:"100%",padding:"12px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:14,color:T.ink,outline:"none",fontFamily:FONT,transition:TRANS};
  const fOn=e=>e.target.style.borderColor=T.indigo; const fOff=e=>e.target.style.borderColor=T.line;
  const pay=async()=>{setProcessing(true);await sleep(2200);setProcessing(false);setSuccess(true);await sleep(1500);onSelectPlan(step);onClose();};

  // BuyCreditsModal défini séparément ci-dessous

  if(step&&plan){
    const amt = billing==="monthly"?plan.price:plan.priceYear;
    const periodLabel = billing==="monthly"?"/ mois":"/ an";
    return (
      <Overlay onClose={onClose}>
        <div style={{background:T.surface,borderRadius:20,padding:32,width:480,maxWidth:"94vw"}}>
          {success?(
            <div style={{textAlign:"center",padding:"28px 0"}}>
              <div style={{width:68,height:68,borderRadius:"50%",background:T.greenSoft,border:`2px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",color:T.green}}><Icon name="check" size={30}/></div>
              <div style={{fontSize:20,fontWeight:800,color:T.ink,marginBottom:6,fontFamily:FONT_DISPLAY}}>Paiement confirmé</div>
              <div style={{fontSize:14,color:T.inkSoft}}>Bienvenue dans le plan <strong>{plan.name}</strong></div>
            </div>
          ):(
            <>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22}}>
                <div><div style={{fontSize:20,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>Plan {plan.name}</div><div style={{fontSize:14,color:T.gold,fontWeight:600,marginTop:2}}>{fmt(amt)} FCFA {periodLabel}</div></div>
                <button onClick={()=>setStep(null)} style={{background:T.surfaceAlt,border:`1px solid ${T.line}`,color:T.inkSoft,borderRadius:10,padding:"7px 13px",cursor:"pointer",fontSize:13,fontWeight:600}}>Retour</button>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:T.inkFaint,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:10}}>Moyen de paiement</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                {[{id:"cinetpay",n:"CinetPay",s:"Afrique francophone",f:""},{id:"flutterwave",n:"Flutterwave",s:"Panafricain",f:""},{id:"kkiapay",n:"Kkiapay",s:"Bénin · Togo",f:""},{id:"mobile",n:"Mobile Money",s:"MTN · Orange · Wave",f:""}].map(g=>(
                  <button key={g.id} onClick={()=>setMethod(g.id)} style={{padding:"11px 13px",background:method===g.id?T.indigoSoft:T.surfaceAlt,border:`1.5px solid ${method===g.id?T.indigo:T.line}`,borderRadius:10,cursor:"pointer",textAlign:"left",transition:TRANS}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}><span style={{fontSize:16}}>{g.f}</span><span style={{fontSize:13,fontWeight:700,color:method===g.id?T.indigo:T.ink}}>{g.n}</span></div>
                    <div style={{fontSize:10,color:T.inkFaint}}>{g.s}</div>
                  </button>
                ))}
              </div>
              <button onClick={()=>setMethod("card")} style={{width:"100%",padding:"11px 14px",background:method==="card"?T.indigoSoft:T.surfaceAlt,border:`1.5px solid ${method==="card"?T.indigo:T.line}`,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",gap:11,marginBottom:18,transition:TRANS}}>
                <Icon name="card" size={18} color={method==="card"?T.indigo:T.inkSoft}/>
                <div style={{textAlign:"left"}}><div style={{fontSize:13,fontWeight:700,color:method==="card"?T.indigo:T.ink}}>Carte internationale</div><div style={{fontSize:10,color:T.inkFaint}}>Visa · Mastercard · Amex</div></div>
              </button>
              {(method==="cinetpay"||method==="flutterwave")&&(
                <div style={{display:"flex",flexDirection:"column",gap:11,marginBottom:18}}>
                  <input placeholder="Nom complet" value={card.name} onChange={e=>setCard({...card,name:e.target.value})} style={inp} onFocus={fOn} onBlur={fOff}/>
                  <input type="email" placeholder="Email" value={card.email} onChange={e=>setCard({...card,email:e.target.value})} style={inp} onFocus={fOn} onBlur={fOff}/>
                  <input placeholder="Téléphone (+221 …)" value={mmo.phone} onChange={e=>setMmo({...mmo,phone:e.target.value})} style={inp} onFocus={fOn} onBlur={fOff}/>
                </div>
              )}
              {method==="kkiapay"&&<div style={{marginBottom:18}}><input placeholder="Numéro Mobile Money (+229 …)" value={mmo.phone} onChange={e=>setMmo({...mmo,phone:e.target.value})} style={inp} onFocus={fOn} onBlur={fOff}/></div>}
              {method==="mobile"&&(
                <div style={{display:"flex",flexDirection:"column",gap:11,marginBottom:18}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["MTN","Orange","Wave","M-Pesa","Airtel"].map(o=><button key={o} onClick={()=>setMmo({...mmo,op:o})} style={{padding:"7px 13px",background:mmo.op===o?T.indigoSoft:T.surfaceAlt,border:`1.5px solid ${mmo.op===o?T.indigo:T.line}`,borderRadius:8,color:mmo.op===o?T.indigo:T.inkSoft,cursor:"pointer",fontSize:13,fontWeight:mmo.op===o?700:500}}>{o}</button>)}</div>
                  <input placeholder="Numéro de téléphone" value={mmo.phone} onChange={e=>setMmo({...mmo,phone:e.target.value})} style={inp} onFocus={fOn} onBlur={fOff}/>
                </div>
              )}
              {method==="card"&&(
                <div style={{display:"flex",flexDirection:"column",gap:11,marginBottom:18}}>
                  <input placeholder="Nom sur la carte" value={card.name} onChange={e=>setCard({...card,name:e.target.value})} style={inp} onFocus={fOn} onBlur={fOff}/>
                  <input placeholder="0000 0000 0000 0000" value={card.number} onChange={e=>setCard({...card,number:e.target.value.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim().slice(0,19)})} style={{...inp,fontFamily:FONT_MONO,letterSpacing:1.5}} onFocus={fOn} onBlur={fOff}/>
                  <div style={{display:"flex",gap:10}}>
                    <input placeholder="MM / AA" value={card.expiry} onChange={e=>{let v=e.target.value.replace(/\D/g,"");if(v.length>2)v=v.slice(0,2)+" / "+v.slice(2,4);setCard({...card,expiry:v})}} style={inp} onFocus={fOn} onBlur={fOff}/>
                    <input placeholder="CVV" type="password" value={card.cvv} onChange={e=>setCard({...card,cvv:e.target.value.slice(0,4)})} style={inp} onFocus={fOn} onBlur={fOff}/>
                  </div>
                </div>
              )}
              <button onClick={pay} disabled={processing} style={{width:"100%",padding:"14px",background:processing?T.inkFaint:T.ink,color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:processing?"not-allowed":"pointer",fontFamily:FONT_DISPLAY}}>{processing?"Traitement…":`Payer ${fmt(amt)} FCFA`}</button>
            </>
          )}
        </div>
      </Overlay>
    );
  }
  return (
    <Overlay onClose={onClose} scroll>
      <div style={{background:T.surface,borderRadius:20,padding:isWide?"36px 34px":"26px 20px",width:"100%",maxWidth:960}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:12}}>
          <div><div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.03em"}}>Choisis ton plan</div><div style={{fontSize:14,color:T.inkSoft,marginTop:4,lineHeight:1.55}}>Paiement en FCFA, Visa ou Mobile Money. Annule quand tu veux.</div></div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{display:"flex",background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,overflow:"hidden"}}>{[["monthly","Mensuel"],["yearly","Annuel · 2 mois offerts"]].map(([id,l])=><button key={id} onClick={()=>setBilling(id)} style={{padding:"8px 15px",background:billing===id?T.ink:"transparent",color:billing===id?"#fff":T.inkSoft,border:"none",cursor:"pointer",fontSize:13,fontWeight:billing===id?700:500}}>{l}</button>)}</div>
            <select value={currency} onChange={e=>setCurrency(e.target.value)} style={{padding:"8px 12px",background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,fontSize:13,color:T.ink,outline:"none",fontFamily:FONT,cursor:"pointer",fontWeight:600}}>{Object.entries(CURRENCIES).map(([code,c])=><option key={code} value={code}>{c.symbol} {code}</option>)}</select>
            <button onClick={onClose} style={{width:38,height:38,background:T.surfaceAlt,border:`1px solid ${T.line}`,color:T.inkSoft,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="x" size={17}/></button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isWide?"repeat(5,1fr)":"1fr 1fr",gap:10}}>
          {PLANS.map(plan=>{
            const price=billing==="monthly"?plan.price:Math.round(plan.priceYear/12);
            const cur=currentPlan===plan.id; const hl=plan.id==="pro";
            return (
              <div key={plan.id} style={{background:hl?T.ink:T.surface,border:`1.5px solid ${hl?T.ink:cur?T.indigo:T.line}`,borderRadius:16,padding:24,display:"flex",flexDirection:"column",position:"relative"}}>
                {plan.badge&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:plan.color,color:plan.id==="pro"?T.ink:"#fff",fontSize:10,fontWeight:800,padding:"4px 11px",borderRadius:20,whiteSpace:"nowrap",letterSpacing:"0.02em"}}>{plan.badge}</div>}
                <div style={{fontSize:16,fontWeight:800,color:hl?"#fff":T.ink,fontFamily:FONT_DISPLAY}}>{plan.name}</div>
                <div style={{fontSize:12,color:hl?T.navInkSoft:T.inkFaint,marginBottom:14}}>{plan.tagline}</div>
                <div style={{marginBottom:14}}>{price===0?<span style={{fontSize:24,fontWeight:800,color:hl?"#fff":T.ink,fontFamily:FONT_DISPLAY}}>Gratuit</span>:<><span style={{fontSize:24,fontWeight:800,color:hl?"#fff":T.ink,fontFamily:FONT_DISPLAY}}>{toCurrency(price,currency)}</span><span style={{fontSize:12,color:hl?T.navInkSoft:T.inkFaint}}> /mois</span></>}
                {billing==="yearly"&&plan.price>0&&<div style={{fontSize:11,color:hl?"#86EFAC":T.green,fontWeight:600,marginTop:4}}>Soit {toCurrency(plan.priceYear,currency)}/an · économise {toCurrency(plan.price*12-plan.priceYear,currency)}</div>}</div>
                <div style={{fontSize:12,color:plan.color,fontWeight:700,marginBottom:14}}>{plan.price===0?"10 crédits pour tester":`${fmt(plan.credits)} crédits inclus / mois`}</div>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>{plan.features.map((f,i)=><div key={i} style={{fontSize:13,color:hl?T.navInk:T.inkSoft,display:"flex",gap:8,alignItems:"flex-start"}}><span style={{color:plan.color,flexShrink:0,marginTop:1}}><Icon name="check" size={14}/></span>{f}</div>)}</div>
                <button onClick={()=>plan.id!=="free"?setStep(plan.id):(onSelectPlan("free"),onClose())} style={{padding:"11px",background:cur?(hl?T.navActive:T.indigoSoft):hl?T.gold:plan.price===0?T.surfaceAlt:T.ink,color:cur?(hl?"#fff":T.indigo):hl?T.ink:plan.price===0?T.inkSoft:"#fff",border:"none",borderRadius:10,cursor:cur?"default":"pointer",fontSize:13,fontWeight:700,fontFamily:FONT_DISPLAY}}>{cur?"Plan actuel":plan.price===0?"Commencer":"Choisir"}</button>
              </div>
            );
          })}
        </div>
        <div style={{marginTop:20,padding:"16px 18px",background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:16}}>
          <div style={{fontSize:12,fontWeight:700,color:T.ink,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.05em"}}>À quoi servent les crédits</div>
          <div style={{display:"flex",gap:18,flexWrap:"wrap"}}>
            {[["Générer une app","1 crédit"],["Modifier une app","1 crédit"],["Un visuel / flyer","1 crédit"],["Déployer sur le web","2 crédits"],["Sortir un APK","5 crédits"]].map(([a,c])=>(
              <div key={a} style={{fontSize:13,color:T.inkSoft}}><span style={{color:T.ink,fontWeight:600}}>{c}</span> · {a}</div>
            ))}
          </div>
          <div style={{fontSize:12,color:T.inkFaint,marginTop:10}}>Les crédits se rechargent chaque mois. Tu peux aussi en acheter à tout moment — ils n'expirent jamais.</div>
        </div>
      </div>
    </Overlay>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPLOY MODAL
// ═══════════════════════════════════════════════════════════════════════════
function DeployModal({ title, code, onClose, onDeployed }) {
  const [step,setStep]=useState("confirm");
  const [url,setUrl]=useState(""); const [err,setErr]=useState(""); const [copied,setCopied]=useState(false);
  const slug = (title||"app").toLowerCase().replace(/[^a-z0-9]/g,"-").slice(0,18);
  const deploy=async()=>{setStep("deploying");try{const r=await deployToVercel(title,code);setUrl(r.url);setStep("done");onDeployed?.(r.url);}catch(e){setErr(e.message);setStep("error");}};
  return (
    <Overlay onClose={onClose}>
      <div style={{background:T.surface,borderRadius:20,padding:32,width:460,maxWidth:"94vw"}}>
        {step==="confirm"&&<>
          <div style={{width:48,height:48,borderRadius:12,background:T.indigoSoft,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16,color:T.indigo}}><Icon name="rocket" size={22}/></div>
          <div style={{fontSize:20,fontWeight:800,color:T.ink,marginBottom:6,fontFamily:FONT_DISPLAY}}>Déployer en ligne</div>
          <div style={{fontSize:14,color:T.inkSoft,marginBottom:22,lineHeight:1.65}}>Ton application <strong>{title}</strong> sera publiée et accessible partout dans le monde en moins d'une minute.</div>
          <div style={{padding:"16px 18px",background:T.surfaceAlt,borderRadius:12,border:`1px solid ${T.line}`,marginBottom:22}}>{[["Hébergeur","Vercel · CDN mondial"],["Adresse",`${slug}.afribuild.app`],["HTTPS","Activé automatiquement"]].map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}><span style={{color:T.inkFaint}}>{k}</span><span style={{color:T.ink,fontWeight:600,fontFamily:k==="Adresse"?FONT_MONO:FONT,fontSize:k==="Adresse"?12:13}}>{v}</span></div>)}</div>
          <div style={{display:"flex",gap:10}}><button onClick={onClose} style={{flex:1,padding:"12px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,color:T.inkSoft,cursor:"pointer",fontSize:14,fontWeight:600}}>Annuler</button><button onClick={deploy} style={{flex:2,padding:"12px",background:T.ink,border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:FONT_DISPLAY}}>Déployer maintenant</button></div>
        </>}
        {step==="deploying"&&<div style={{textAlign:"center",padding:"24px 0"}}>
          <div style={{position:"relative",width:72,height:72,margin:"0 auto 20px"}}><div style={{position:"absolute",inset:0,border:`3px solid ${T.line}`,borderTopColor:T.indigo,borderRadius:"50%",animation:"abspin .8s linear infinite"}}/><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:T.indigo}}><Icon name="rocket" size={26}/></div></div>
          <div style={{fontSize:18,fontWeight:700,color:T.ink,marginBottom:6,fontFamily:FONT_DISPLAY}}>Déploiement en cours…</div>
          <div style={{fontSize:13,color:T.inkSoft}}>Build · Upload CDN · Activation HTTPS</div>
        </div>}
        {step==="done"&&<div style={{textAlign:"center"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:T.greenSoft,border:`2px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:T.green}}><Icon name="check" size={28}/></div>
          <div style={{fontSize:20,fontWeight:800,color:T.ink,marginBottom:6,fontFamily:FONT_DISPLAY}}>En ligne !</div>
          <div style={{fontSize:14,color:T.inkSoft,marginBottom:20}}>Ton application est accessible partout dans le monde.</div>
          <div style={{display:"flex",gap:8,background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,padding:"11px 14px",marginBottom:20,alignItems:"center"}}><div style={{flex:1,fontSize:13,color:T.indigo,fontFamily:FONT_MONO,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{url}</div><button onClick={()=>{navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800)}} style={{background:copied?T.greenSoft:T.surface,border:`1px solid ${T.line}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,color:copied?T.green:T.inkSoft,fontWeight:600,flexShrink:0}}>{copied?"Copié":"Copier"}</button></div>
          <div style={{display:"flex",gap:10}}><button onClick={()=>window.open(url,"_blank")} style={{flex:1,padding:"12px",background:T.ink,border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:FONT_DISPLAY}}>Ouvrir l'app</button><button onClick={onClose} style={{flex:1,padding:"12px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,color:T.inkSoft,cursor:"pointer",fontSize:14,fontWeight:600}}>Fermer</button></div>
        </div>}
        {step==="error"&&<div style={{textAlign:"center"}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:T.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",color:T.red,fontSize:24,fontWeight:800}}>!</div>
          <div style={{fontSize:18,fontWeight:700,color:T.ink,marginBottom:6,fontFamily:FONT_DISPLAY}}>Échec du déploiement</div>
          <div style={{fontSize:13,color:T.inkSoft,marginBottom:8,lineHeight:1.6}}>{err}</div>
          <div style={{fontSize:12,color:T.inkFaint,marginBottom:20}}>Vérifie ton token Vercel dans la configuration.</div>
          <div style={{display:"flex",gap:10}}><button onClick={()=>setStep("confirm")} style={{flex:1,padding:"12px",background:T.ink,border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700}}>Réessayer</button><button onClick={onClose} style={{flex:1,padding:"12px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,color:T.inkSoft,cursor:"pointer",fontSize:14,fontWeight:600}}>Fermer</button></div>
        </div>}
      </div>
    </Overlay>
  );
}

// Brand modal
function BrandModal({ brand, title, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{background:T.surface,borderRadius:20,padding:32,width:480,maxWidth:"94vw"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontSize:20,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>Identité de marque</div>
          <button onClick={onClose} style={{width:36,height:36,background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.inkSoft}}><Icon name="x" size={16}/></button>
        </div>
        {brand?(
          <>
            <div style={{padding:22,background:T.surfaceAlt,borderRadius:16,marginBottom:16,border:`1px solid ${T.line}`}}>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:18}}>
                <div style={{width:58,height:58,borderRadius:16,background:brand.primaryColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{brand.faviconEmoji}</div>
                <div><div style={{fontSize:20,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>{title}</div><div style={{fontSize:13,color:T.inkSoft,fontStyle:"italic"}}>"{brand.slogan}"</div></div>
              </div>
              <div style={{display:"flex",gap:9,marginBottom:14}}>{[brand.primaryColor,brand.secondaryColor,brand.accentColor,brand.bgColor].filter(Boolean).map((c,i)=><div key={i} style={{flex:1,height:44,background:c,borderRadius:10,display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:5}}><span style={{fontSize:9,fontFamily:FONT_MONO,color:"#fff",textShadow:"0 1px 3px rgba(0,0,0,0.6)"}}>{c}</span></div>)}</div>
              <div style={{fontSize:13,color:T.inkSoft}}>Police · <strong>{brand.fontFamily}</strong></div>
            </div>
            <div style={{display:"flex",gap:10}}><button onClick={()=>{navigator.clipboard.writeText(JSON.stringify(brand,null,2))}} style={{flex:1,padding:"12px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,color:T.inkSoft,cursor:"pointer",fontSize:13,fontWeight:600}}>Copier le JSON</button><button onClick={onClose} style={{flex:1,padding:"11px",background:T.ink,border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>Appliquer</button></div>
          </>
        ):<div style={{textAlign:"center",padding:"28px 0"}}><div style={{width:38,height:38,border:`2.5px solid ${T.line}`,borderTopColor:T.indigo,borderRadius:"50%",animation:"abspin .8s linear infinite",margin:"0 auto 14px"}}/><div style={{fontSize:14,color:T.inkSoft}}>Génération de l'identité…</div></div>}
      </div>
    </Overlay>
  );
}

// Iterative chat
function IterativeChat({ code, title, onUpdate, onClose }) {
  const [msgs,setMsgs]=useState([{role:"ai",text:`Prêt à modifier ${title}. Que veux-tu changer ?`}]);
  const [input,setInput]=useState(""); const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"})},[msgs]);
  const send=async()=>{
    if(!input.trim()||loading)return; const msg=input.trim(); setInput(""); setLoading(true);
    setMsgs(m=>[...m,{role:"user",text:msg}]);
    try{
      const raw=await callAI("claude",`Dev React senior. Modifie l'app. JSON: {"message":"…","code":"…JSX complet…"}. Garde export default App, styles inline, design pro.`,`App "${title}":\n${code.slice(0,8000)}\nModification: ${msg}`,6000);
      const m=raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim().match(/\{[\s\S]*\}/);
      const parsed=JSON.parse(m?m[0]:raw);
      setMsgs(x=>[...x,{role:"ai",text:parsed.message||"Modification appliquée."}]);
      if(parsed.code)onUpdate(parsed.code);
    }catch{setMsgs(x=>[...x,{role:"ai",text:"Erreur. Reformule ta demande."}])}
    setLoading(false);
  };
  return (
    <div style={{position:"fixed",bottom:20,right:20,width:370,maxWidth:"calc(100vw - 32px)",height:500,maxHeight:"calc(100vh - 100px)",background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,display:"flex",flexDirection:"column",zIndex:600,boxShadow:"0 24px 70px rgba(11,14,24,0.22)",animation:"abslide .25s ease"}}>
      <div style={{padding:"15px 17px",borderBottom:`1px solid ${T.lineSoft}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}><div style={{color:T.indigo}}><Icon name="chat" size={18}/></div><div><div style={{fontSize:14,fontWeight:700,color:T.ink}}>Modifier l'app</div><div style={{fontSize:11,color:T.inkFaint}}>{title}</div></div></div>
        <button onClick={onClose} style={{width:32,height:32,background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.inkSoft}}><Icon name="x" size={15}/></button>
      </div>
      <div style={{flex:1,overflow:"auto",padding:15,display:"flex",flexDirection:"column",gap:11}}>
        {msgs.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={{maxWidth:"84%",padding:"10px 13px",borderRadius:m.role==="user"?"16px 16px 5px 16px":"16px 16px 16px 5px",background:m.role==="user"?T.ink:T.surfaceAlt,border:m.role==="user"?"none":`1px solid ${T.line}`,fontSize:13,color:m.role==="user"?"#fff":T.ink,lineHeight:1.6}}>{m.text}</div></div>)}
        {loading&&<div style={{display:"flex",gap:5,padding:"4px 2px"}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:T.inkFaint,animation:`abpulse 1s ${i*0.15}s infinite`}}/>)}</div>}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:13,borderTop:`1px solid ${T.lineSoft}`,display:"flex",gap:9}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ex : ajoute un graphique des ventes…" style={{flex:1,background:T.surfaceAlt,border:`1.5px solid ${T.line}`,borderRadius:10,padding:"10px 13px",fontSize:13,color:T.ink,outline:"none",fontFamily:FONT}} onFocus={e=>{e.target.style.borderColor=T.indigo;e.target.style.boxShadow=`0 0 0 3px ${T.indigoSoft}`;}} onBlur={e=>{e.target.style.borderColor=T.line;e.target.style.boxShadow="none";}}/>
        <button onClick={send} disabled={loading||!input.trim()} style={{width:40,height:40,background:loading?T.inkFaint:T.ink,color:"#fff",border:"none",borderRadius:10,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="chevron" size={17} stroke={2.4}/></button>
      </div>
    </div>
  );
}

// Overlay wrapper
function Overlay({ children, onClose, scroll }) {
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose?.()} style={{position:"fixed",inset:0,background:"rgba(11,14,24,0.55)",display:"flex",alignItems:scroll?"flex-start":"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",overflowY:scroll?"auto":"hidden",padding:scroll?"40px 20px":20,animation:"abfade .2s ease"}}>
      {children}
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════════════════
// v8 — TEMPLATES PRÊTS À L'EMPLOI (apps pré-remplies en 1 clic)
// ═══════════════════════════════════════════════════════════════════════════
const STARTER_TEMPLATES = [
  { id:"pos-pro",    icon:"\u25C8", name:"POS Boutique Pro",   cat:"Commerce",   color:"#1C3293", desc:"Caisse complète : inventaire, ventes, Mobile Money, rapports journaliers", popular:true,
    prompt:"Système POS professionnel complet pour boutique africaine. Interface caisse split-screen, catalogue 16 produits avec catégories, panier temps réel, paiement Espèces/MTN/Orange/Wave avec rendu monnaie, ticket imprimable, dashboard ventes du jour avec graphique, gestion stock avec alertes rupture. Design Square POS bleu/blanc. Données africaines." },
  { id:"shop-mkt",   icon:"\u25C8", name:"Marketplace E-commerce", cat:"Commerce", color:"#EA580C", desc:"Boutique en ligne : catalogue, panier, commandes, paiement, suivi livraison",
    prompt:"Marketplace e-commerce africaine style Jumia. Hero, catalogue 14 produits avec cards (photo, prix FCFA, note, badge promo), filtres catégorie/prix, page détail, panier slide-in, checkout Mobile Money, suivi commande. Design pro orange/blanc. Vendeurs villes africaines." },
  { id:"school-erp", icon:"\u25C8", name:"École Numérique",    cat:"Éducation",  color:"#8B5CF6", desc:"ERP scolaire : élèves, notes, bulletins, paiements scolarité, emploi du temps", popular:true,
    prompt:"ERP scolaire complet style PowerSchool. Sidebar (Dashboard, Élèves, Notes, Emploi du temps, Paiements). Dashboard avec stats animées. Table 20 élèves avec photos initiales. Bulletins avec moyennes calculées. Emploi du temps grille 5j. Statuts paiements colorés. Design violet/blanc pro." },
  { id:"clinic",     icon:"\u25C8", name:"Clinique Santé",     cat:"Santé",      color:"#E5484D", desc:"Dossiers patients, consultations, ordonnances, rendez-vous, statistiques",
    prompt:"Système clinique style Doctolib. Sidebar (Dashboard, Patients, Consultations, Ordonnances, Stats). Table 15 patients avec recherche/filtres. Fiche patient complète (antécédents, consultations). Formulaire consultation avec diagnostic+prescription. Dashboard KPI santé. Design médical blanc/bleu." },
  { id:"crm-pro",    icon:"\u25C8", name:"CRM Commercial",     cat:"Entreprise", color:"#0EA5E9", desc:"Clients, prospects, pipeline ventes, factures, suivi des interactions",
    prompt:"CRM pour PME africaine style Pipedrive. Sidebar (Dashboard, Contacts, Pipeline, Factures). Pipeline kanban drag-feel avec deals FCFA. Table contacts. Dashboard avec funnel de ventes et chiffre d'affaires. Factures listées. Design pro bleu/blanc. Données africaines." },
  { id:"realestate",icon:"\u25C8", name:"Immobilier",         cat:"Services",   color:"#0891B2", desc:"Annonces location/vente, filtres, fiches détaillées, demandes de visite",
    prompt:"Plateforme immobilière style Seloger. Barre recherche, grille 14 annonces (photo, prix FCFA/mois, quartier, surface, badges), sidebar filtres, page détail avec galerie et contact agent, formulaire visite, favoris. Design teal/blanc minimaliste. Villes africaines." },
  { id:"hotel",      icon:"\u25C8", name:"Hôtel & Réservation",cat:"Tourisme",   color:"#15A05A", desc:"Chambres, réservations, check-in/out, services, paiement Mobile Money",
    prompt:"Système hôtelier africain. Dashboard occupation, grille chambres avec statuts (libre/occupée/nettoyage), formulaire réservation avec dates, check-in/out, services additionnels, paiement Mobile Money, facture. Design élégant vert/blanc." },
  { id:"resto",      icon:"\u25C8", name:"Restaurant",         cat:"Food",       color:"#E0464B", desc:"Menu, commandes tables, cuisine temps réel, livraison, paiement",
    prompt:"App restaurant cuisine africaine style Uber Eats. Menu catégorisé (thiéboudienne, ndolé, jollof, yassa) avec cards, panier slide-in, commande table ou livraison, timeline cuisine→livraison animée, paiement Mobile Money, rapport ventes. Design sombre chaleureux." },
];

// ═══════════════════════════════════════════════════════════════════════════
// SOLUTIONS BUSINESS — Jenga résout des PROBLÈMES, pas des "secteurs".
// Chaque solution génère une app complète : workflows, dashboards, KPI, rapports.
// Classées par impact économique (coût du problème pour l'entreprise).
// ═══════════════════════════════════════════════════════════════════════════
const SOLUTIONS = [
  { id:"clients", problem:"Trouver plus de clients", gain:"+30% de ventes", color:"#15A05A", letter:"C", impact:5,
    desc:"CRM + pipeline de prospection : capture les leads, relance automatique, suivi des deals.",
    prompt:"Genere un CRM commercial complet pour PME africaine style Pipedrive. Sidebar (Dashboard, Prospects, Pipeline, Relances, Factures). Pipeline kanban avec deals en FCFA et probabilite. Capture de leads avec formulaire. Systeme de relance automatique avec rappels. Dashboard funnel de ventes + chiffre d'affaires + taux de conversion. KPI : leads, deals gagnes, CA mensuel. Rapports exportables. Donnees africaines realistes." },
  { id:"impayes", problem:"Reduire les impayes", gain:"-50% de retards", color:"#E5484D", letter:"I", impact:5,
    desc:"Suivi des factures impayees, relances automatiques, echeancier, alertes.",
    prompt:"Genere une application de gestion des impayes et recouvrement pour PME africaine. Tableau de bord des creances (total du, en retard, recouvre). Liste factures avec statut (payee, en attente, en retard) et anciennete. Systeme de relance automatique par paliers (J+7, J+15, J+30) avec modeles de messages WhatsApp/SMS. Echeancier de paiement. Alertes visuelles. KPI : DSO, taux de recouvrement, montant a risque. Montants FCFA. Design pro." },
  { id:"factures", problem:"Creer devis et factures", gain:"Gagne 5h/semaine", color:"#1C3293", letter:"F", impact:5,
    desc:"Generateur de devis et factures pro, numerotation auto, suivi des paiements.",
    prompt:"Genere une application de facturation professionnelle pour PME africaine. Creation de devis et factures avec numerotation automatique, logo, lignes d'articles, calcul TVA, total en FCFA. Conversion devis -> facture. Suivi des statuts (envoye, paye, en retard). Liste clients. Tableau de bord (CA, factures impayees, devis en cours). Export PDF. Modeles personnalisables. Design pro bleu/blanc." },
  { id:"ventes", problem:"Automatiser les ventes", gain:"+40% productivite", color:"#EA580C", letter:"V", impact:4,
    desc:"Caisse POS + suivi des ventes + stock + paiement Mobile Money.",
    prompt:"Genere un systeme POS professionnel complet pour commerce africain. Interface caisse, catalogue produits avec categories, panier temps reel, paiement Especes/MTN/Orange/Wave avec rendu monnaie, ticket imprimable, dashboard ventes du jour avec graphique, gestion stock avec alertes rupture, rapports journaliers/mensuels. KPI : CA, panier moyen, top produits. Design Square POS." },
  { id:"stocks", problem:"Gerer les stocks", gain:"-30% de pertes", color:"#0EA5E9", letter:"S", impact:4,
    desc:"Inventaire temps reel, alertes rupture, mouvements, valorisation du stock.",
    prompt:"Genere une application de gestion de stock pour PME africaine. Inventaire avec categories, niveau de stock temps reel, alertes rupture et surstock, mouvements (entrees/sorties), valorisation du stock en FCFA, historique. Tableau de bord (valeur stock, ruptures, rotation). KPI : taux de rotation, valeur immobilisee, produits dormants. Scan/recherche rapide. Rapports. Design pro." },
  { id:"equipes", problem:"Gerer les equipes", gain:"Gagne 8h/semaine", color:"#8B5CF6", letter:"E", impact:4,
    desc:"Presences, planning, taches, performance — gestion d'equipe complete.",
    prompt:"Genere une application de gestion d'equipe pour PME africaine. Liste employes avec fiches, gestion des presences (pointage entree/sortie), planning hebdomadaire, attribution de taches avec suivi, evaluation de performance. Tableau de bord RH (effectif, presences du jour, taches en cours). KPI : taux de presence, taches terminees, productivite. Calcul d'heures. Design pro violet/blanc. Noms africains." },
  { id:"tresorerie", problem:"Prevoir la tresorerie", gain:"Evite les ruptures", color:"#0891B2", letter:"T", impact:5,
    desc:"Suivi des entrees/sorties, previsions, solde projete, alertes de tension.",
    prompt:"Genere une application de gestion de tresorerie pour PME africaine. Suivi des entrees et sorties d'argent en FCFA, solde temps reel, previsions sur 3 mois, detection des tensions de tresorerie avec alertes, categorisation des depenses. Graphiques d'evolution. Tableau de bord (solde, entrees du mois, sorties, solde projete). KPI : burn rate, runway, marge. Design fintech pro." },
  { id:"service-client", problem:"Automatiser le service client", gain:"+25% fidelisation", color:"#CAA546", letter:"A", impact:4,
    desc:"Tickets clients, base de reponses, suivi des demandes, satisfaction.",
    prompt:"Genere une application de service client pour PME africaine. Gestion des tickets (ouvert, en cours, resolu), base de reponses pre-redigees, suivi des demandes par client, mesure de satisfaction, integration WhatsApp. Tableau de bord support (tickets ouverts, temps de reponse moyen, satisfaction). KPI : delai de resolution, taux de satisfaction, tickets resolus. Design pro." },
  { id:"projets", problem:"Suivre les projets", gain:"Livre a temps", color:"#7C3AED", letter:"P", impact:3,
    desc:"Tableau kanban, taches, echeances, progression, equipe.",
    prompt:"Genere une application de gestion de projet style Linear/Trello pour PME africaine. Tableau kanban (A faire, En cours, Termine), taches avec assignation, echeances, priorites, progression en pourcentage, vue calendrier. Tableau de bord (projets actifs, taches en retard, charge par personne). KPI : taux de completion, respect des delais. Design pro epure." },
  { id:"boutique", problem:"Creer une boutique en ligne", gain:"Vends 24h/24", color:"#E0464B", letter:"B", impact:4,
    desc:"E-commerce complet : catalogue, panier, paiement Mobile Money, commandes.",
    prompt:"Genere une boutique e-commerce africaine complete style Jumia. Hero, catalogue produits avec cards (photo, prix FCFA, note, badge promo), filtres categorie/prix, page detail produit, panier slide-in, checkout avec paiement Mobile Money, suivi de commande, espace vendeur. Tableau de bord ventes. Design pro. Vendeurs et villes africaines." },
];

// ─── PROMPTS SPÉCIALISÉS v8 ──────────────────────────────────────────────────
// Admin panel auto-généré
const ADMIN_PANEL_DIRECTIVE = `
GÉNÈRE AUSSI un panneau d'administration complet intégré : tableau de bord avec KPIs et graphiques CSS, gestion des utilisateurs (table CRUD), rôles & permissions (Admin/Manager/Employé), journal d'activité (logs horodatés), statistiques visuelles. Navigation entre la vue publique et l'admin.`;

// Mode Business (factures, devis, QR, etc.)
const BUSINESS_DIRECTIVE = `
INTÈGRE un module business africain : génération de factures et devis (mise en page pro imprimable, numéro, TVA, total FCFA), QR code de paiement (carré stylisé avec motif), bouton "Imprimer" (format ticket thermique 80mm pour le POS), zone de signature électronique (canvas). Tout en FCFA avec coordonnées d'entreprise africaine réalistes.`;

// Reçu Mobile Money infalsifiable (AfriReçu)
const RECEIPT_DIRECTIVE = `
Si l'app gère des paiements (POS, commerce, tontine, école, restaurant...) : après chaque paiement Mobile Money confirmé, génère un REÇU INFALSIFIABLE affiché à l'écran avec : numéro de reçu unique (format AFR-AAAAMMJJ-XXXXXX), montant en FCFA, opérateur (MTN/Orange/Wave...), date et heure, nom du payeur, un QR code de vérification (carré stylisé), un code court de vérification à 8 caractères, et un badge vert "v PAIEMENT CONFIRMÉ". Ajoute deux boutons : "Imprimer le reçu" et "Envoyer par email". Mentionne que le reçu est vérifiable en ligne. Design propre, professionnel, façon ticket.`;

// Documentation auto
const DOC_DIRECTIVE = `
Ajoute dans agentLogs un champ "documentation" décrivant : cahier des charges résumé, endpoints API si backend, structure des données, guide utilisateur en 3 étapes.`;

// Visuels intégrés — l'app demande automatiquement ses images au studio
const VISUAL_DIRECTIVE = `
VISUELS DE L'APP : ajoute dans le JSON un champ "visualNeeds" qui liste les images dont l'app a besoin (logo + 2 à 6 images selon le secteur). Format :
"visualNeeds": [
  {"slot":"logo","type":"logo","brief":"description du logo selon le business"},
  {"slot":"hero","type":"photo","brief":"image principale / bannière"},
  {"slot":"product1","type":"product","brief":"photo produit réaliste"}
]
Dans le CODE de l'app, utilise des balises <img src={VISUALS.logo}/>, <img src={VISUALS.hero}/> etc. aux bons endroits, et déclare en haut une constante VISUALS (objet) qui sera remplie automatiquement par les images générées. Si une image n'est pas encore prête, affiche un joli placeholder (fond dégradé + icône). Ainsi l'app a son identité visuelle complète, prête à l'emploi.`;

// Agent Expert Afrique — enrichit le contexte selon le pays détecté
function buildAfricaExpertContext(text) {
  const country = Object.keys(AFRIDATA.countries).find(c => text.toLowerCase().includes(c.toLowerCase()));
  if (!country) return "";
  const d = AFRIDATA.countries[country];
  return `
EXPERT AFRIQUE — Contexte ${country} détecté :
- Devise : ${d.currency} (affiche les montants dans cette devise)
- Opérateurs Mobile Money locaux : ${d.operators.join(", ")}
- Passerelle de paiement recommandée : ${d.gateway}
- Banques principales : ${d.banks.join(", ")}
- Capitale : ${d.capital}
Adapte l'app à ces réalités locales (paiement, devise, fiscalité, langue).`;
}

// ─── GÉNÉRATION D'IMAGES IA ───────────────────────────────────────────────────
// Génère un logo/bannière SVG via Claude (vectoriel, déployable, zéro coût API image)
async function generateImageSVG(kind, subject) {
  try {
    const sys = `Tu es un directeur artistique. Génère une image vectorielle SVG complète et belle.
Réponds UNIQUEMENT avec un objet JSON : {"svg":"<svg viewBox='0 0 400 400'>...</svg>","palette":["#hex","#hex"],"label":"description"}
Le SVG doit être moderne, professionnel, sans texte parasite, optimisé. Type demandé : ${kind}.`;
    const raw = await callAI("claude", sys, `Crée un ${kind} pour : ${subject}. Style africain moderne, couleurs riches.`, 2000);
    const clean = raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
    return JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || clean);
  } catch { return null; }
}

// ─── EXPORT EXCEL / CSV / PDF (côté client, sans dépendance) ──────────────────
function exportCSV(rows, filename) {
  const esc = c => '"' + String(c).split('"').join('""') + '"';
  const csv = rows.map(r => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download=filename+".csv"; a.click(); URL.revokeObjectURL(url);
}
function printPDF(htmlContent, title) {
  const w = window.open("", "_blank");
  if(!w) return;
  w.document.write(`<html><head><title>${title}</title><style>body{font-family:-apple-system,sans-serif;padding:40px;color:#0B0E18}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ECEEF4;padding:10px 12px;text-align:left;font-size:13px}th{background:#F7F8FC}</style></head><body>${htmlContent}</body></html>`);
  w.document.close(); setTimeout(()=>w.print(), 300);
}

// ─── BUILD MOBILE (APK/AAB/IPA) — workflow EAS ────────────────────────────────
// Le build natif réel nécessite EAS Build (serveur Expo). Ici : workflow complet + simulation.
async function requestNativeBuild({ platform, format, title, code, onProgress, onDone, onError }) {
  // Si le backend est configuré : VRAI build APK/AAB/IPA via Expo EAS.
  if (backend.enabled()) {
    try {
      onProgress?.(8, "Validation du code React Native…");
      const { buildId, autoFixed } = await backend.post("/api/apk/build", { title, code, format });
      if (autoFixed) onProgress?.(20, "Code converti en React Native natif…");
      const map = { NEW:30, IN_QUEUE:45, IN_PROGRESS:75, FINISHED:100 };
      const done = await backend.waitForBuild(buildId, (s) => onProgress?.(map[s.status] || 60, `Compilation ${platform}… (${s.status})`));
      const ext = format === "aab" ? "aab" : format === "ipa" ? "ipa" : "apk";
      onDone?.({ url: done.artifactUrl, size: "—", format: ext });
    } catch (e) { onError?.(e.message); }
    return;
  }
  // Mode démo : simulation (pas de vrai fichier)
  const steps = ["Préparation du projet Expo…","Installation des dépendances…",`Compilation ${platform}…`,"Signature du package…","Optimisation et upload…"];
  try {
    for (let i=0;i<steps.length;i++){ onProgress?.(Math.round(((i+1)/steps.length)*92), steps[i]); await sleep(1400); }
    onProgress?.(100, "Build terminé (démo)");
    const ext = format==="aab"?"aab":format==="ipa"?"ipa":"apk";
    const slug = (title||"app").toLowerCase().replace(/[^a-z0-9]/g,"-").slice(0,20);
    onDone?.({ url:`https://build.afribuild.app/${slug}-${uid()}.${ext}`, size:`${(8+Math.random()*14).toFixed(1)} Mo`, format:ext, demo:true });
  } catch(e){ onError?.(e.message); }
}


// ═══════════════════════════════════════════════════════════════════════════
// v8 — NATIVE BUILD MODAL (APK / AAB / IPA)
// ═══════════════════════════════════════════════════════════════════════════
function BuildModal({ title, code, onClose }) {
  const [platform,setPlatform]=useState("android");
  const [format,setFormat]=useState("apk");
  const [step,setStep]=useState("config");
  const [prog,setProg]=useState(0); const [stepMsg,setStepMsg]=useState("");
  const [result,setResult]=useState(null); const [err,setErr]=useState("");
  const formats = platform==="android"?[["apk","APK","Installation directe"],["aab","AAB","Google Play Store"]]:[["ipa","IPA","Apple App Store"]];
  const start=async()=>{setStep("building");await requestNativeBuild({platform,format,title,code,onProgress:(p,m)=>{setProg(p);setStepMsg(m)},onDone:r=>{setResult(r);setStep("done")},onError:e=>{setErr(e);setStep("error")}});};
  return (
    <Overlay onClose={onClose}>
      <div style={{background:T.surface,borderRadius:20,padding:32,width:480,maxWidth:"94vw"}}>
        {step==="config"&&<>
          <div style={{width:48,height:48,borderRadius:12,background:T.greenSoft,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16,color:T.green}}><Icon name="rocket" size={22}/></div>
          <div style={{fontSize:20,fontWeight:800,color:T.ink,marginBottom:6,fontFamily:FONT_DISPLAY}}>Générer l'application native</div>
          <div style={{fontSize:14,color:T.inkSoft,marginBottom:22,lineHeight:1.6}}>Compile <strong>{title}</strong> en application installable, signée et prête à publier.</div>
          <div style={{fontSize:11,fontWeight:700,color:T.inkFaint,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:9}}>Plateforme</div>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            {[["android","Android"],["ios","iOS"]].map(([id,l])=><button key={id} onClick={()=>{setPlatform(id);setFormat(id==="android"?"apk":"ipa")}} style={{flex:1,padding:"12px",background:platform===id?T.indigoSoft:T.surfaceAlt,border:`1.5px solid ${platform===id?T.indigo:T.line}`,borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:platform===id?700:500,color:platform===id?T.indigo:T.ink}}>{l}</button>)}
          </div>
          <div style={{fontSize:11,fontWeight:700,color:T.inkFaint,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:9}}>Format</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:22}}>
            {formats.map(([id,l,d])=><button key={id} onClick={()=>setFormat(id)} style={{padding:"12px 14px",background:format===id?T.indigoSoft:T.surfaceAlt,border:`1.5px solid ${format===id?T.indigo:T.line}`,borderRadius:10,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><div style={{fontSize:14,fontWeight:700,color:format===id?T.indigo:T.ink}}>{l}</div><div style={{fontSize:12,color:T.inkFaint}}>{d}</div></div>{format===id&&<div style={{color:T.indigo}}><Icon name="check" size={18}/></div>}</button>)}
          </div>
          <div style={{padding:"11px 14px",background:T.goldSoft,border:`1px solid ${T.gold}33`,borderRadius:10,fontSize:13,color:T.goldDeep,marginBottom:20,lineHeight:1.6}}>La signature et le build natif sont effectués via le service de compilation. Première compilation : 2–5 min.</div>
          <div style={{display:"flex",gap:10}}><button onClick={onClose} style={{flex:1,padding:"12px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,color:T.inkSoft,cursor:"pointer",fontSize:14,fontWeight:600}}>Annuler</button><button onClick={start} style={{flex:2,padding:"12px",background:T.ink,border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:FONT_DISPLAY}}>Compiler le {format.toUpperCase()}</button></div>
        </>}
        {step==="building"&&<div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{position:"relative",width:72,height:72,margin:"0 auto 20px"}}><div style={{position:"absolute",inset:0,border:`3px solid ${T.line}`,borderTopColor:T.green,borderRadius:"50%",animation:"abspin .8s linear infinite"}}/><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:T.green,fontSize:13,fontWeight:800,fontFamily:FONT_DISPLAY}}>{prog}%</div></div>
          <div style={{fontSize:18,fontWeight:700,color:T.ink,marginBottom:8,fontFamily:FONT_DISPLAY}}>Compilation en cours…</div>
          <div style={{fontSize:13,color:T.inkSoft,marginBottom:16}}>{stepMsg}</div>
          <div style={{height:5,background:T.line,borderRadius:3,overflow:"hidden",maxWidth:280,margin:"0 auto"}}><div style={{height:"100%",background:`linear-gradient(90deg,${T.green},${T.indigo})`,width:`${prog}%`,transition:"width .5s ease",borderRadius:3}}/></div>
        </div>}
        {step==="done"&&result&&<div style={{textAlign:"center"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:T.greenSoft,border:`2px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:T.green}}><Icon name="check" size={28}/></div>
          <div style={{fontSize:20,fontWeight:800,color:T.ink,marginBottom:6,fontFamily:FONT_DISPLAY}}>{result.format.toUpperCase()} prêt !</div>
          <div style={{fontSize:14,color:T.inkSoft,marginBottom:20}}>Ton application native est signée et prête à installer · {result.size}</div>
          <div style={{display:"flex",gap:8,background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,padding:"11px 14px",marginBottom:18,alignItems:"center"}}><Icon name="download" size={16} color={T.green}/><div style={{flex:1,fontSize:13,color:T.indigo,fontFamily:FONT_MONO,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"left"}}>{result.url}</div></div>
          <div style={{display:"flex",gap:10}}><button onClick={()=>window.open(result.url,"_blank")} style={{flex:1,padding:"12px",background:T.ink,border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontFamily:FONT_DISPLAY}}><Icon name="download" size={16}/>Télécharger</button><button onClick={onClose} style={{flex:1,padding:"12px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,color:T.inkSoft,cursor:"pointer",fontSize:14,fontWeight:600}}>Fermer</button></div>
        </div>}
        {step==="error"&&<div style={{textAlign:"center"}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:T.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",color:T.red,fontSize:24,fontWeight:800}}>!</div>
          <div style={{fontSize:18,fontWeight:700,color:T.ink,marginBottom:6,fontFamily:FONT_DISPLAY}}>Échec de la compilation</div>
          <div style={{fontSize:13,color:T.inkSoft,marginBottom:20}}>{err}</div>
          <button onClick={()=>setStep("config")} style={{padding:"12px 28px",background:T.ink,border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700}}>Réessayer</button>
        </div>}
      </div>
    </Overlay>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// v8 — DATABASE DESIGNER (visuel)
// ═══════════════════════════════════════════════════════════════════════════
function DBDesigner() {
  const [tables,setTables]=useState([
    {id:"t1",name:"utilisateurs",x:40,y:40,fields:[{n:"id",t:"uuid",pk:true},{n:"nom",t:"text"},{n:"email",t:"text"},{n:"téléphone",t:"text"},{n:"créé_le",t:"timestamp"}]},
    {id:"t2",name:"commandes",x:380,y:120,fields:[{n:"id",t:"uuid",pk:true},{n:"utilisateur_id",t:"uuid",fk:"utilisateurs"},{n:"montant",t:"numeric"},{n:"statut",t:"text"},{n:"créé_le",t:"timestamp"}]},
  ]);
  const [sel,setSel]=useState(null);
  const isWide=useWide(720);
  const TYPES=["uuid","text","numeric","integer","boolean","timestamp","date","jsonb"];
  const genSQL=()=>tables.map(t=>`CREATE TABLE ${t.name} (\n${t.fields.map(f=>`  ${f.n} ${f.t.toUpperCase()}${f.pk?" PRIMARY KEY DEFAULT gen_random_uuid()":""}${f.fk?` REFERENCES ${f.fk}(id)`:""}`).join(",\n")}\n);`).join("\n\n");
  const addTable=()=>setTables(t=>[...t,{id:uid(),name:"nouvelle_table",x:60+Math.random()*200,y:60+Math.random()*150,fields:[{n:"id",t:"uuid",pk:true}]}]);
  const addField=(tid)=>setTables(ts=>ts.map(t=>t.id===tid?{...t,fields:[...t.fields,{n:"champ",t:"text"}]}:t));
  const updField=(tid,fi,key,val)=>setTables(ts=>ts.map(t=>t.id===tid?{...t,fields:t.fields.map((f,i)=>i===fi?{...f,[key]:val}:f)}:t));
  const updName=(tid,val)=>setTables(ts=>ts.map(t=>t.id===tid?{...t,name:val}:t));
  const delTable=(tid)=>setTables(ts=>ts.filter(t=>t.id!==tid));
  return (
    <div style={{flex:1,overflow:"auto",background:T.surfaceAlt}}>
      <div style={{maxWidth:1140,margin:"0 auto",padding:isWide?"32px 36px":"24px 18px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22,flexWrap:"wrap",gap:12}}>
          <div><div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.03em"}}>Concepteur de base de données</div><div style={{fontSize:14,color:T.inkSoft,marginTop:4,lineHeight:1.55}}>Crée tes tables visuellement — le SQL PostgreSQL est généré automatiquement.</div></div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={addTable} style={{padding:"10px 18px",background:T.ink,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:7,fontFamily:FONT_DISPLAY}}><Icon name="plus" size={16}/>Table</button>
            <button onClick={()=>{const rows=[["Table","Champ","Type"]];tables.forEach(t=>t.fields.forEach(f=>rows.push([t.name,f.n,f.t])));exportCSV(rows,"schema-db")}} style={{padding:"10px 16px",background:T.surface,color:T.inkSoft,border:`1px solid ${T.line}`,borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>Export CSV</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isWide?"1fr 1fr":"1fr",gap:16}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {tables.map(t=>(
              <div key={t.id} style={{background:T.surface,border:`1.5px solid ${sel===t.id?T.indigo:T.line}`,borderRadius:12,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"11px 14px",background:T.indigoSoft,borderBottom:`1px solid ${T.line}`}}>
                  <Icon name="layers" size={15} color={T.indigo}/>
                  <input value={t.name} onChange={e=>updName(t.id,e.target.value)} style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:14,fontWeight:700,color:T.indigo,fontFamily:FONT_MONO}}/>
                  <button onClick={()=>addField(t.id)} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:8,padding:"3px 9px",cursor:"pointer",fontSize:11,color:T.inkSoft,fontWeight:600}}>+ champ</button>
                  <button onClick={()=>delTable(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.inkFaint,display:"flex"}}><Icon name="x" size={15}/></button>
                </div>
                <div style={{padding:"6px 0"}}>
                  {t.fields.map((f,fi)=>(
                    <div key={fi} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 14px"}}>
                      <input value={f.n} onChange={e=>updField(t.id,fi,"n",e.target.value)} style={{flex:1,background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:8,padding:"6px 9px",fontSize:13,color:T.ink,outline:"none",fontFamily:FONT_MONO}}/>
                      <select value={f.t} onChange={e=>updField(t.id,fi,"t",e.target.value)} style={{background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:8,padding:"6px 9px",fontSize:12,color:T.inkSoft,outline:"none",fontFamily:FONT_MONO}}>{TYPES.map(ty=><option key={ty}>{ty}</option>)}</select>
                      {f.pk&&<span style={{fontSize:9,fontWeight:700,color:T.gold,background:T.goldSoft,padding:"2px 6px",borderRadius:5}}>PK</span>}
                      {f.fk&&<span style={{fontSize:9,fontWeight:700,color:T.indigo,background:T.indigoSoft,padding:"2px 6px",borderRadius:5}}>FK</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{background:"#0C0F1A",borderRadius:12,overflow:"hidden",alignSelf:"flex-start",position:"sticky",top:0}}>
            <div style={{padding:"11px 16px",background:"#11151F",borderBottom:"1px solid #1C2233",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{color:"#6B7488",fontSize:12,fontFamily:FONT_MONO}}>schema.sql</span><button onClick={()=>navigator.clipboard.writeText(genSQL())} style={{background:"#1C2233",border:"1px solid #2A3147",color:"#9AA3B8",borderRadius:8,padding:"4px 12px",cursor:"pointer",fontSize:11,fontWeight:600}}>Copier</button></div>
            <pre style={{margin:0,padding:"16px 18px",color:"#D8DEE9",fontSize:13,fontFamily:FONT_MONO,lineHeight:1.7,overflow:"auto",maxHeight:480}}>{genSQL()}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// v8 — IMAGE STUDIO (génération SVG IA)
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// MODEL PICKER — bouton premium pour choisir le modèle IA (selon le plan)
// ═══════════════════════════════════════════════════════════════════════════
function ModelPicker({ models, selected, onSelect, userPlan, onUpgrade, compact }) {
  const [open,setOpen]=useState(false);
  const cur=models.find(m=>m.id===selected)||models[0];
  const rank={free:0,starter:1,pro:2,business:3};
  return (
    <div style={{position:"relative",flexShrink:0}}>
      <button onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:8,padding:compact?"7px 12px":"9px 14px",background:"#fff",border:`1.5px solid ${open?T.indigo:T.line}`,borderRadius:10,cursor:"pointer",transition:TRANS,boxShadow:open?`0 0 0 4px ${T.indigoSoft}`:"none"}}>
        <span style={{width:22,height:22,borderRadius:8,background:T.indigoSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>{cur.icon}</span>
        <div style={{textAlign:"left"}}><div style={{fontSize:13,fontWeight:700,color:T.ink,lineHeight:1.1}}>{cur.name}</div>{!compact&&<div style={{fontSize:10,color:T.inkFaint}}>{cur.desc}</div>}</div>
        <span style={{color:T.inkFaint,fontSize:11,marginLeft:2}}>▾</span>
      </button>
      {open&&<>
        <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:90}}/>
        <div style={{position:"absolute",top:"calc(100% + 8px)",left:0,background:"#fff",border:`1px solid ${T.line}`,borderRadius:16,boxShadow:"0 16px 48px rgba(11,14,24,0.16)",width:280,zIndex:100,overflow:"hidden",padding:6}}>
          <div style={{padding:"9px 12px 6px",fontSize:11,fontWeight:700,color:T.inkFaint,textTransform:"uppercase",letterSpacing:"0.06em"}}>Modèle de génération</div>
          {models.map(m=>{const unlocked=(rank[userPlan]??0)>=(rank[m.minPlan]??0);return(
            <button key={m.id} onClick={()=>{ if(unlocked){onSelect(m.id);setOpen(false);} else {setOpen(false);onUpgrade?.();} }} style={{width:"100%",display:"flex",alignItems:"center",gap:11,padding:"10px 11px",background:selected===m.id&&unlocked?T.indigoSoft:"transparent",border:"none",borderRadius:10,cursor:"pointer",textAlign:"left",transition:TRANS}} onMouseEnter={e=>{if(selected!==m.id)e.currentTarget.style.background=T.surfaceAlt}} onMouseLeave={e=>{if(selected!==m.id)e.currentTarget.style.background="transparent"}}>
              <span style={{width:30,height:30,borderRadius:8,background:unlocked?T.indigoSoft:T.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{m.icon}</span>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:unlocked?(selected===m.id?T.indigo:T.ink):T.inkFaint}}>{m.name}</div><div style={{fontSize:11,color:T.inkFaint}}>{m.desc}</div></div>
              {!unlocked&&<span style={{fontSize:9,fontWeight:700,color:T.gold,background:T.goldSoft,padding:"3px 8px",borderRadius:20,flexShrink:0}}> {m.minPlan}</span>}
              {unlocked&&selected===m.id&&<span style={{color:T.indigo}}><Icon name="check" size={15}/></span>}
            </button>
          );})}
        </div>
      </>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDIO HEADER — bannière premium pour identifier le studio
// ═══════════════════════════════════════════════════════════════════════════
function StudioHeader({ kicker, title, subtitle, tagline, badges, accent=T.indigo }) {
  return (
    <div style={{position:"relative",borderRadius:16,overflow:"hidden",marginBottom:22,background:T.navBg}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(${accent}33 1.2px,transparent 1.2px)`,backgroundSize:"22px 22px",opacity:0.5}}/>
      <div style={{position:"absolute",top:"-40%",right:"-5%",width:280,height:280,borderRadius:"50%",background:`radial-gradient(circle,${accent}55,transparent 70%)`,filter:"blur(10px)"}}/>
      <div style={{position:"relative",padding:"26px 28px"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 13px",background:"rgba(255,255,255,0.08)",border:`1px solid ${accent}55`,borderRadius:30,marginBottom:14}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:accent}}/><span style={{fontSize:11,fontWeight:700,color:"#fff",letterSpacing:"1.5px",textTransform:"uppercase"}}>{kicker}</span>
        </div>
        <div style={{fontSize:28,fontWeight:800,color:"#fff",fontFamily:FONT_DISPLAY,letterSpacing:"-0.03em",lineHeight:1.1,marginBottom:8}}>{title}</div>
        <div style={{fontSize:14,color:"#C7CDDC",maxWidth:560,lineHeight:1.6,marginBottom:tagline?12:0}}>{subtitle}</div>
        {tagline&&<div style={{fontSize:13,color:accent,fontWeight:600,fontStyle:"italic"}}>{tagline}</div>}
        {badges&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:16}}>{badges.map(b=><span key={b} style={{padding:"5px 12px",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:20,fontSize:11,color:"#C7CDDC",fontWeight:600}}>{b}</span>)}</div>}
      </div>
    </div>
  );
}

function ImageStudio({ userPlan="free", model, memCtx, onCredit }) {
  // ═══ EXECUTIVE STUDIO — galerie unique et plate. Tout est visible d'un coup d'oeil.
  //     Plus de hub -> departement -> objectif -> modele. Un seul ecran, on choisit, on cree.
  const [route,setRoute]=useState(null);   // null = galerie ; {kind, deptId}
  const isWide=useWide(720);

  // Tout ce que le studio cree, a plat, par section, avec apercu visuel
  const SECTIONS=[
    { id:"design", label:"Identité & visuels", color:"#CAA546", items:[
      {name:"Logo",to:"design",icon:"spark",g:["#CAA546","#E0C77A"]},
      {name:"Flyer",to:"design",icon:"image",g:["#EA580C","#F0915A"]},
      {name:"Affiche",to:"design",icon:"image",g:["#15A05A","#34C77B"]},
      {name:"Bannière",to:"design",icon:"layers",g:["#8B5CF6","#A98BF0"]},
      {name:"Post réseaux",to:"design",icon:"comments",g:["#E0464B","#F07478"]},
      {name:"Carte de visite",to:"design",icon:"receipt",g:["#0E1633","#2A3566"]},
      {name:"Packaging",to:"design",icon:"box",g:["#CAA546","#D8B95E"]},
      {name:"Mockup produit",to:"design",icon:"wand",g:["#8B5CF6","#B39AF2"]},
    ]},
    { id:"docs", label:"Documents", color:"#1C3293", items:[
      {name:"Contrat",to:"docs",icon:"receipt",g:["#1C3293","#4A5FC8"]},
      {name:"Devis",to:"docs",icon:"receipt",g:["#0891B2","#3BB6D4"]},
      {name:"Facture",to:"docs",icon:"receipt",g:["#15A05A","#2FB870"]},
      {name:"Business plan",to:"docs",icon:"pen",g:["#1C3293","#3A4680"]},
      {name:"Rapport",to:"docs",icon:"pen",g:["#0E1633","#3A4680"]},
      {name:"Courrier pro",to:"docs",icon:"pen",g:["#8B5CF6","#A98BF0"]},
    ]},
    { id:"excel", label:"Tableaux & finances", color:"#15A05A", items:[
      {name:"Budget",to:"excel",icon:"grid",g:["#15A05A","#34C77B"]},
      {name:"Trésorerie",to:"excel",icon:"chart",g:["#0891B2","#3BB6D4"]},
      {name:"Tableau KPI",to:"excel",icon:"chart",g:["#1C3293","#4A5FC8"]},
      {name:"Suivi des ventes",to:"excel",icon:"chart",g:["#CAA546","#E0C77A"]},
    ]},
    { id:"assistant", label:"Assistante de direction", color:"#0891B2", items:[
      {name:"Courrier",to:"assistant",icon:"comments",g:["#0891B2","#3BB6D4"]},
      {name:"Compte rendu",to:"assistant",icon:"comments",g:["#1C3293","#4A5FC8"]},
      {name:"Note de service",to:"assistant",icon:"comments",g:["#8B5CF6","#A98BF0"]},
      {name:"Convocation",to:"assistant",icon:"comments",g:["#15A05A","#34C77B"]},
    ]},
  ];

  // Routage vers l'atelier concerne
  if(route){
    const back=()=>setRoute(null);
    if(route.to==="docs") return <DocStudio userPlan={userPlan} model={model} memCtx={memCtx} onBack={back} onCredit={onCredit} kind="docs"/>;
    if(route.to==="excel") return <DocStudio userPlan={userPlan} model={model} memCtx={memCtx} onBack={back} onCredit={onCredit} kind="excel"/>;
    if(route.to==="assistant") return <AssistantStudio userPlan={userPlan} model={model} memCtx={memCtx} onBack={back} onCredit={onCredit}/>;
    return <DesignStudio userPlan={userPlan} onBack={back}/>;
  }

  // Detection simple de l'intention a partir du texte -> route vers le bon atelier
  const routeFor=(txt)=>{
    const t=(txt||"").toLowerCase();
    if(/budget|tresorerie|trésorerie|kpi|tableau|excel|vente|stock|compta/.test(t)) return "excel";
    if(/courrier|lettre|convocation|compte rendu|compte-rendu|note de service|mail|email/.test(t)) return "assistant";
    if(/contrat|devis|facture|rapport|business plan|business-plan|cv|attestation|procedure|procédure|document|word/.test(t)) return "docs";
    return "design"; // logo, flyer, affiche, banniere, visuel... par defaut
  };
  const [draft,setDraft]=useState("");
  const [think,setThink]=useState(false);      // réflexion : Jenga conseille avant de créer
  const [advice,setAdvice]=useState("");
  const [thinking,setThinking]=useState(false);
  const go=()=>{ if(!draft.trim())return; setRoute({to:routeFor(draft),seed:draft}); };
  const reflect=async()=>{
    if(!draft.trim()||thinking)return;
    if(!onCredit?.(1))return;
    setThinking(true); setAdvice("");
    try{
      const sys="Tu es le directeur de l'Executive Studio de Jenga. Avant de produire un document ou un visuel, tu conseilles brièvement l'entrepreneur : ce qu'il faut absolument inclure, le ton à adopter, les pièges à éviter, et 2-3 questions à se poser. Reponse courte, concrète, en puces, contexte africain (FCFA, OHADA)." + (memCtx||"");
      const r=await callAI(model||MODEL, sys, "Besoin de l'utilisateur : "+draft, 900);
      setAdvice(r);
    }catch(e){ setAdvice("Conseil indisponible pour le moment. Tu peux créer directement."); }
    setThinking(false);
  };
  const QUICK=["Un logo pour ma boutique","Un flyer promotionnel","Un devis client","Un business plan","Un budget prévisionnel","Une lettre administrative"];

  return (
    <div style={{flex:1,overflow:"auto",background:T.surfaceAlt}}>
      <div style={{maxWidth:780,margin:"0 auto",padding:isWide?"56px 36px":"32px 18px",minHeight:"100%",display:"flex",flexDirection:"column"}}>
        {/* HERO centré façon ChatGPT / Blink */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"6px 14px",background:T.goldSoft,borderRadius:30,marginBottom:20}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:T.gold,display:"inline-block"}}/>
            <span style={{fontSize:12,fontWeight:700,color:T.goldDeep,letterSpacing:"0.04em"}}>EXECUTIVE STUDIO · DOCUMENTS & VISUELS</span>
          </div>
          <div style={{fontSize:isWide?34:26,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.035em",lineHeight:1.12,marginBottom:14}}>Que souhaitez-vous créer aujourd'hui ?</div>
          <div style={{fontSize:15.5,color:T.inkSoft,lineHeight:1.55,maxWidth:540,margin:"0 auto"}}>Votre département créatif et administratif. Décrivez ce dont vous avez besoin — logo, document, présentation, tableau — et Jenga le crée.</div>
        </div>
        {/* GRANDE ZONE DE SAISIE */}
        <div style={{background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:20,boxShadow:T.shadowLg,padding:isWide?"20px 20px 16px":"16px 16px 14px",transition:TRANS}}>
          <textarea value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();think?reflect():go();}}} rows={isWide?3:4} placeholder="Décrivez ce que vous voulez créer. Ex : un logo moderne pour ma boutique de wax, tons or et indigo…" style={{width:"100%",border:"none",outline:"none",resize:"none",fontSize:16,color:T.ink,fontFamily:FONT,lineHeight:1.6,background:"transparent",boxSizing:"border-box"}}/>
          {/* Toggle réflexion : Direct ou Réfléchi */}
          <div style={{display:"flex",alignItems:"center",gap:9,marginTop:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,padding:3}}>
              <button onClick={()=>{setThink(false);setAdvice("");}} style={{padding:"6px 13px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12.5,fontWeight:700,fontFamily:FONT_DISPLAY,background:!think?T.ink:"transparent",color:!think?"#fff":T.inkSoft,transition:TRANS}}>Direct</button>
              <button onClick={()=>setThink(true)} style={{padding:"6px 13px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12.5,fontWeight:700,fontFamily:FONT_DISPLAY,background:think?T.gold:"transparent",color:think?"#fff":T.inkSoft,transition:TRANS}}>Réfléchi</button>
            </div>
            <span style={{fontSize:11.5,color:T.inkFaint,flex:1,minWidth:120}}>{think?"Jenga te conseille avant de créer":"Création immédiate"}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12,gap:12}}>
            <div style={{fontSize:12,color:T.inkFaint}}>Jenga choisit le bon outil automatiquement.</div>
            <div style={{display:"flex",gap:8}}>
              {think&&<button onClick={reflect} disabled={!draft.trim()||thinking} style={{display:"flex",alignItems:"center",gap:7,padding:"11px 16px",background:draft.trim()&&!thinking?T.goldSoft:T.line,color:draft.trim()&&!thinking?T.goldDeep:T.inkFaint,border:`1.5px solid ${draft.trim()&&!thinking?T.gold:T.line}`,borderRadius:12,fontSize:13,fontWeight:700,cursor:draft.trim()&&!thinking?"pointer":"not-allowed",fontFamily:FONT_DISPLAY,transition:TRANS,whiteSpace:"nowrap"}}><Icon name="brain" size={15}/>{thinking?"Réflexion…":"Conseiller"}</button>}
              <button onClick={go} disabled={!draft.trim()} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 20px",background:draft.trim()?T.ink:T.line,color:draft.trim()?"#fff":T.inkFaint,border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:draft.trim()?"pointer":"not-allowed",fontFamily:FONT_DISPLAY,transition:TRANS,whiteSpace:"nowrap"}}><Icon name="spark" size={16}/>Créer</button>
            </div>
          </div>
        </div>
        {/* Conseil de réflexion */}
        {advice&&(
          <div style={{marginTop:16,background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:"18px 20px",boxShadow:T.shadowSm,textAlign:"left"}}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
              <div style={{width:30,height:30,borderRadius:9,background:T.goldSoft,display:"flex",alignItems:"center",justifyContent:"center",color:T.goldDeep}}><Icon name="brain" size={16}/></div>
              <div style={{fontSize:13,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>Le conseil de Jenga avant de créer</div>
            </div>
            <div style={{fontSize:13.5,color:T.ink,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{advice}</div>
            <button onClick={go} style={{marginTop:14,width:"100%",padding:"11px",background:T.ink,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT_DISPLAY,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Icon name="spark" size={15}/>Créer maintenant</button>
          </div>
        )}
        {/* Suggestions rapides discrètes (pas des cartes) */}
        <div style={{display:"flex",flexWrap:"wrap",gap:9,justifyContent:"center",marginTop:22}}>
          {QUICK.map(q=>(
            <button key={q} onClick={()=>{setDraft(q);}} style={{fontSize:13,fontWeight:600,color:T.inkSoft,background:T.surface,border:`1px solid ${T.line}`,padding:"8px 15px",borderRadius:30,cursor:"pointer",transition:TRANS}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold;e.currentTarget.style.color=T.ink;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.line;e.currentTarget.style.color=T.inkSoft;}}>{q}</button>
          ))}
        </div>
        {/* Ce que le studio sait faire — liste discrète, pas des cadres */}
        <div style={{marginTop:"auto",paddingTop:34}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:"8px 16px",justifyContent:"center"}}>
            {["Logos & visuels","Flyers & affiches","Présentations","Catalogues","Contrats & devis","Factures","Business plans","Budgets Excel","Courriers pro"].map(c=>(
              <div key={c} style={{display:"flex",alignItems:"center",gap:6,fontSize:12.5,color:T.inkFaint,fontWeight:600}}><span style={{color:T.green,display:"flex"}}><Icon name="check" size={13}/></span>{c}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Département DESIGN & BRANDING (studio graphique original) ──
function DesignStudio({ userPlan="free", onBack }) {
  const MAX_Q_BY_PLAN={ free:"720", starter:"1080", visual:"8k", pro:"4k", business:"8k" };
  const Q_ORDER=["720","1080","4k","8k"];
  const Q_LABELS={ "720":"HD 720p","1080":"Full HD","4k":"4K Ultra","8k":"8K Pro" };
  const maxIdx=Q_ORDER.indexOf(MAX_Q_BY_PLAN[userPlan]||"720");
  const allowedQualities=Q_ORDER.slice(0,maxIdx+1);

  const [kind,setKind]=useState(null);     // null = galerie ; sinon = atelier
  const [subject,setSubject]=useState("");
  const [quality,setQuality]=useState(allowedQualities[allowedQualities.length-1]||"720");
  const [loading,setLoading]=useState(false);
  const [results,setResults]=useState([]);
  const [error,setError]=useState("");
  const isWide=useWide(720);

  // Chaque modèle a un aperçu visuel (dégradé + disposition mock) pour qu'on imagine le résultat
  const KINDS=[
    {label:"Logo",real:false,k:"logo",cat:"Identité",icon:"spark",g:["#1C3293","#3B4FC4"],desc:"Un logo unique pour ta marque"},
    {label:"Carte de visite",real:true,k:"card",cat:"Identité",icon:"receipt",g:["#0E1633","#2A3566"],desc:"Carte professionnelle recto-verso"},
    {label:"Flyer",real:true,k:"flyer",cat:"Promotion",icon:"image",g:["#CAA546","#E0C77A"],desc:"Affichette promo percutante"},
    {label:"Affiche",real:true,k:"poster",cat:"Promotion",icon:"image",g:["#15A05A","#34C77B"],desc:"Grand format, fort impact"},
    {label:"Bannière",real:true,k:"banner",cat:"Promotion",icon:"layers",g:["#8B5CF6","#A98BF0"],desc:"En-tête web ou réseaux"},
    {label:"Post réseaux",real:true,k:"social",cat:"Promotion",icon:"comments",g:["#E0464B","#F07478"],desc:"Visuel carré pour Insta/Facebook"},
    {label:"Roll-up",real:true,k:"rollup",cat:"Événement",icon:"layers",g:["#0891B2","#3BB6D4"],desc:"Kakémono debout pour stands"},
    {label:"Brochure",real:true,k:"brochure",cat:"Document",icon:"pen",g:["#1C3293","#4A5FC8"],desc:"Dépliant multi-volets élégant"},
    {label:"Catalogue",real:true,k:"catalog",cat:"Document",icon:"grid",g:["#0E1633","#3A4680"],desc:"Catalogue produits complet"},
    {label:"Packaging",real:true,k:"packaging",cat:"Produit",icon:"box",g:["#CAA546","#D8B95E"],desc:"Emballage produit pro"},
    {label:"Photo produit",real:true,k:"product",cat:"Produit",icon:"image",g:["#15A05A","#2FB870"],desc:"Mise en scène de ton produit"},
    {label:"Mockup",real:true,k:"mockup",cat:"Produit",icon:"wand",g:["#8B5CF6","#B39AF2"],desc:"Aperçu réaliste en situation"},
  ];
  const CATS=["Identité","Promotion","Document","Produit","Événement"];
  const QUALITIES=allowedQualities.map(id=>[id,Q_LABELS[id]]);
  const active=KINDS.find(x=>x.label===kind);

  const gen=async()=>{
    if(!subject.trim()||!active)return; setLoading(true); setError("");
    try{
      if(active.real && backend.enabled()){
        const r=await backend.post("/api/studio/generate",{ type:active.k, brief:subject, quality, plan:userPlan, provider:"openai" });
        setResults(prev=>[{type:"img",url:r.url,base64:r.base64,kind:active.label,subject,quality:r.qualityLabel||quality,id:uid()},...prev]);
      } else if(active.real && !backend.enabled()){
        setError("Les visuels HD nécessitent le backend (mode démo : seuls les logos SVG sont générés ici).");
      } else {
        const r=await generateImageSVG(active.k,subject);
        if(r)setResults(prev=>[{type:"svg",svg:r.svg,kind:active.label,subject,id:uid()},...prev]);
      }
    }catch(e){ setError(e.message); }
    setLoading(false);
  };

  // ── VUE GALERIE (aucun type choisi) ──
  if(!active){
    return (
      <div style={{flex:1,overflow:"auto",background:T.surfaceAlt}}>
        <div style={{maxWidth:1040,margin:"0 auto",padding:isWide?"32px 36px":"24px 18px"}}>
          <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:7,background:"transparent",border:"none",color:T.inkSoft,cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:18,padding:0,transition:TRANS}} onMouseEnter={e=>e.currentTarget.style.color=T.ink} onMouseLeave={e=>e.currentTarget.style.color=T.inkSoft}><Icon name="chevron" size={15}/>Executive Studio</button>
          <div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.03em",marginBottom:8}}>Que veux-tu créer aujourd'hui ?</div>
          <div style={{fontSize:16,color:T.inkSoft,lineHeight:1.55,marginBottom:30,maxWidth:560}}>Choisis un modèle. Décris ton idée. Jenga crée un visuel professionnel, prêt à l'emploi.</div>
          {CATS.map(cat=>{
            const items=KINDS.filter(k=>k.cat===cat);
            if(!items.length)return null;
            return (
              <div key={cat} style={{marginBottom:30}}>
                <div style={{fontSize:11,fontWeight:700,color:T.inkFaint,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:14}}>{cat}</div>
                <div className="ab-stagger" style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isWide?236:150}px,1fr))`,gap:16}}>
                  {items.map(k=>(
                    <button key={k.label} onClick={()=>{setKind(k.label);setResults([]);setSubject("");}} style={{textAlign:"left",background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,overflow:"hidden",cursor:"pointer",transition:TRANS,boxShadow:T.shadowSm,padding:0}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=T.shadowLg;}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadowSm;}}>
                      {/* aperçu visuel */}
                      <div style={{aspectRatio:"4/3",background:`linear-gradient(135deg,${k.g[0]},${k.g[1]})`,position:"relative",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                        <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 70% 20%, rgba(255,255,255,0.18), transparent 55%)"}}/>
                        <div style={{position:"absolute",inset:0,opacity:0.09,backgroundImage:"radial-gradient(#fff 1px, transparent 1px)",backgroundSize:"14px 14px"}}/>
                        <div style={{width:54,height:54,borderRadius:15,background:"rgba(255,255,255,0.16)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",position:"relative"}}><Icon name={k.icon} size={26}/></div>
                        {k.real&&<span style={{position:"absolute",top:10,right:10,fontSize:9,fontWeight:800,color:"#fff",background:"rgba(255,255,255,0.22)",padding:"3px 8px",borderRadius:20,letterSpacing:"0.04em"}}>HD</span>}
                      </div>
                      <div style={{padding:"13px 15px"}}>
                        <div style={{fontSize:15,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.01em"}}>{k.label}</div>
                        <div style={{fontSize:12,color:T.inkSoft,marginTop:3,lineHeight:1.5}}>{k.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── VUE ATELIER (type choisi) ──
  return (
    <div style={{flex:1,overflow:"auto",background:T.surfaceAlt}}>
      <div style={{maxWidth:1000,margin:"0 auto",padding:isWide?"32px 36px":"24px 18px"}}>
        <button onClick={()=>{setKind(null);setError("");}} style={{display:"flex",alignItems:"center",gap:7,background:"transparent",border:"none",color:T.inkSoft,cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:18,padding:0,transition:TRANS}} onMouseEnter={e=>e.currentTarget.style.color=T.ink} onMouseLeave={e=>e.currentTarget.style.color=T.inkSoft}><Icon name="chevron" size={15}/>Tous les modèles</button>
        {/* en-tête atelier avec aperçu du type choisi */}
        <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:24}}>
          <div style={{width:64,height:64,borderRadius:16,background:`linear-gradient(135deg,${active.g[0]},${active.g[1]})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",flexShrink:0,boxShadow:T.shadowMd}}><Icon name={active.icon} size={30}/></div>
          <div>
            <div style={{fontSize:24,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.02em"}}>{active.label}</div>
            <div style={{fontSize:14,color:T.inkSoft,marginTop:2}}>{active.desc}</div>
          </div>
        </div>
        <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24,marginBottom:20,boxShadow:T.shadowSm}}>
          {active.real&&<><div style={{fontSize:11,fontWeight:700,color:T.inkFaint,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>Qualité</div>
          <div style={{display:"flex",gap:8,marginBottom:maxIdx<3?8:18,flexWrap:"wrap",alignItems:"center"}}>{QUALITIES.map(([id,lbl])=><button key={id} onClick={()=>setQuality(id)} style={{padding:"7px 14px",background:quality===id?T.indigoSoft:T.surfaceAlt,color:quality===id?T.indigo:T.inkSoft,border:`1.5px solid ${quality===id?T.indigo:T.line}`,borderRadius:10,fontSize:13,fontWeight:quality===id?700:500,cursor:"pointer",transition:TRANS}}>{lbl}</button>)}
          {maxIdx<3&&Q_ORDER.slice(maxIdx+1).map(id=><div key={id} title="Disponible dans un plan supérieur" style={{padding:"7px 14px",background:T.surfaceAlt,color:T.inkFaint,border:`1.5px dashed ${T.line}`,borderRadius:10,fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:5,opacity:0.7}}> {Q_LABELS[id]}</div>)}</div>
          {maxIdx<3&&<div style={{fontSize:11,color:T.inkFaint,marginBottom:14}}>Les qualités supérieures (4K, 8K) sont incluses dans les plans Pro et Business.</div>}</>}
          <div style={{fontSize:11,fontWeight:700,color:T.inkFaint,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>Décris ton {active.label.toLowerCase()}</div>
          <div style={{display:"flex",gap:10}}>
            <input value={subject} onChange={e=>setSubject(e.target.value)} onKeyDown={e=>e.key==="Enter"&&gen()} placeholder={active.real?`ex. promo boutique wax, fond coloré, prix FCFA…`:`ex. fintech tontine, or et indigo…`} style={{flex:1,background:T.surfaceAlt,border:`1.5px solid ${T.line}`,borderRadius:10,padding:"12px 15px",fontSize:14,color:T.ink,outline:"none",fontFamily:FONT,transition:TRANS}} onFocus={e=>{e.target.style.borderColor=T.indigo;e.target.style.boxShadow=`0 0 0 3px ${T.indigoSoft}`;}} onBlur={e=>{e.target.style.borderColor=T.line;e.target.style.boxShadow="none";}}/>
            <button onClick={gen} disabled={loading||!subject.trim()} style={{padding:"0 22px",background:loading||!subject.trim()?T.line:T.ink,color:loading||!subject.trim()?T.inkFaint:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:loading||!subject.trim()?"not-allowed":"pointer",fontFamily:FONT_DISPLAY,display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap",transition:TRANS}}>{loading?"…":<><Icon name="wand" size={16}/>Générer</>}</button>
          </div>
          {active.real&&<div style={{marginTop:10,fontSize:12,color:T.inkFaint}}> Visuel {QUALITIES.find(q=>q[0]===quality)?.[1]} · consomme 1 crédit visuel</div>}
        </div>
        {error&&<div style={{margin:"0 2px 16px",padding:"10px 13px",background:T.redSoft,border:`1px solid ${T.red}33`,borderRadius:10,fontSize:13,color:T.red}}>{error}</div>}
        {results.length===0&&!loading&&<div style={{textAlign:"center",padding:"56px 0"}}><div style={{width:60,height:60,borderRadius:16,background:`linear-gradient(135deg,${active.g[0]},${active.g[1]})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:"#fff",boxShadow:T.shadowMd}}><Icon name={active.icon} size={26}/></div><div style={{fontSize:16,fontWeight:700,color:T.ink,fontFamily:FONT_DISPLAY}}>Prêt à créer ton {active.label.toLowerCase()}</div><div style={{fontSize:14,color:T.inkSoft,marginTop:4,lineHeight:1.55}}>Décris ce que tu veux ci-dessus, puis clique sur Générer.</div></div>}
        <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isWide?220:150}px,1fr))`,gap:16}}>
          {results.map(r=>(
            <div key={r.id} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,overflow:"hidden",boxShadow:T.shadowSm}}>
              {r.type==="svg"
                ? <div style={{aspectRatio:"1",background:T.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} dangerouslySetInnerHTML={{__html:r.svg}}/>
                : <div style={{aspectRatio:"1",background:T.surfaceAlt,overflow:"hidden"}}><img src={r.url||`data:image/webp;base64,${r.base64}`} alt={r.subject} style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
              <div style={{padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{fontSize:13,fontWeight:600,color:T.ink}}>{r.kind}</div>{r.quality&&<span style={{fontSize:10,color:T.indigo,fontWeight:700,background:T.indigoSoft,padding:"1px 7px",borderRadius:10}}>{r.quality}</span>}</div>
                <div style={{fontSize:11,color:T.inkFaint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>{r.subject}</div>
                <button onClick={()=>{ const a=document.createElement("a"); if(r.type==="svg"){const b=new Blob([r.svg],{type:"image/svg+xml"});a.href=URL.createObjectURL(b);a.download=`visuel-${r.id}.svg`;}else{a.href=r.url||`data:image/webp;base64,${r.base64}`;a.download=`visuel-${r.id}.webp`;} a.click(); }} style={{marginTop:10,width:"100%",padding:"7px",background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:8,color:T.inkSoft,cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:TRANS}}><Icon name="download" size={13}/>Télécharger</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Département DOCUMENTS / EXCEL (génération de contenu professionnel) ──
function DocStudio({ userPlan, model, memCtx, onBack, onCredit, kind }) {
  const isWide=useWide(720);
  const isExcel = kind==="excel";
  const cfg = isExcel ? {
    kicker:"Excel & Analytics", color:"#15A05A", icon:"grid",
    title:"Tes tableaux et analyses financières",
    subtitle:"Budgets, prévisions, tableaux de bord, KPI, suivi de trésorerie — structurés et prêts.",
    question:"Que souhaitez-vous gérer ?",
    goals:[
      {id:"argent",label:"Mon argent",icon:"wallet",types:["Budget prévisionnel","Prévisions financières","Suivi de trésorerie","Plan de trésorerie"]},
      {id:"stock",label:"Mes stocks",icon:"box",types:["Gestion de stock"]},
      {id:"ventes",label:"Mes ventes",icon:"chart",types:["Tableau de bord KPI","Analyse des ventes"]},
      {id:"equipe",label:"Mon équipe",icon:"users",types:["Tableau RH / paie"]},
    ],
  } : {
    kicker:"Documents professionnels", color:"#1C3293", icon:"receipt",
    title:"Tes documents d'entreprise, prêts à envoyer",
    subtitle:"Contrats, devis, factures, rapports, business plans, courriers — qualité professionnelle.",
    question:"Que souhaitez-vous préparer ?",
    goals:[
      {id:"vendre",label:"Vendre & facturer",icon:"wallet",types:["Devis","Facture","Contrat"]},
      {id:"piloter",label:"Piloter mon activité",icon:"chart",types:["Business plan","Plan marketing","Étude de marché","Rapport d'activité"]},
      {id:"organiser",label:"Organiser & encadrer",icon:"users",types:["Compte rendu de réunion","Procès-verbal","Note de service","Cahier des charges","Politique interne"]},
      {id:"administratif",label:"Courriers administratifs",icon:"pen",types:["Lettre administrative","Courrier professionnel"]},
    ],
  };
  const allTypes = cfg.goals.flatMap(g=>g.types);
  const [goal,setGoal]=useState(null);
  const [brief,setBrief]=useState("");
  const [out,setOut]=useState("");
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const [copied,setCopied]=useState(false);

  const run=async()=>{
    if(!brief.trim()||busy)return;
    if(!onCredit?.(1)){ return; }
    setBusy(true); setErr(""); setOut("");
    try{
      const label = isExcel ? (docType+" (présente-le sous forme de tableau clair en texte, avec colonnes, lignes et totaux ; chiffres en FCFA)") : docType;
      const r=await generateBusinessDoc(model||MODEL, label, brief, memCtx);
      setOut(r);
    }catch(e){ setErr(e.message); }
    setBusy(false);
  };
  const copy=()=>{ try{ navigator.clipboard.writeText(out); setCopied(true); setTimeout(()=>setCopied(false),1800);}catch(e){} };
  const download=()=>{ const b=new Blob([out],{type:"text/plain;charset=utf-8"}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download=`${docType.replace(/\s+/g,"-")}.txt`; a.click(); URL.revokeObjectURL(u); };

  return (
    <div style={{flex:1,overflow:"auto",background:T.surfaceAlt}}>
      <div style={{maxWidth:1000,margin:"0 auto",padding:isWide?"32px 36px":"24px 18px"}}>
        <button onClick={goal?()=>setGoal(null):onBack} style={{display:"flex",alignItems:"center",gap:7,background:"transparent",border:"none",color:T.inkSoft,cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:18,padding:0,transition:TRANS}} onMouseEnter={e=>e.currentTarget.style.color=T.ink} onMouseLeave={e=>e.currentTarget.style.color=T.inkSoft}><Icon name="chevron" size={15}/>{goal?"Retour":"Executive Studio"}</button>
        {!goal ? (<>
          <div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.03em",marginBottom:8}}>{cfg.question}</div>
          <div style={{fontSize:16,color:T.inkSoft,lineHeight:1.55,marginBottom:30,maxWidth:560}}>{cfg.subtitle}</div>
          <div className="ab-stagger" style={{display:"grid",gridTemplateColumns:isWide?"repeat(2,1fr)":"1fr",gap:16}}>
            {cfg.goals.map(g=>(
              <button key={g.id} onClick={()=>{setGoal(g.id);setDocType(g.types[0]);setOut("");}} style={{textAlign:"left",background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24,cursor:"pointer",transition:TRANS,display:"flex",gap:16,alignItems:"center",boxShadow:T.shadowSm,position:"relative",overflow:"hidden"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=T.shadowLg;}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadowSm;}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${cfg.color},${cfg.color}66)`}}/>
                <div style={{width:52,height:52,borderRadius:16,background:`linear-gradient(145deg,${cfg.color},${cfg.color}D0)`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 6px 16px ${cfg.color}40`}}><Icon name={g.icon} size={24}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:16,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.01em",marginBottom:4}}>{g.label}</div>
                  <div style={{fontSize:13,color:T.inkSoft,lineHeight:1.5}}>{g.types.slice(0,3).join(" · ")}{g.types.length>3?"…":""}</div>
                </div>
              </button>
            ))}
          </div>
        </>):(<>
        <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24,marginBottom:18,boxShadow:T.shadowSm}}>
          <div style={{fontSize:11,fontWeight:700,color:T.inkFaint,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:12}}>Choisis un modèle</div>
          <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isWide?150:120}px,1fr))`,gap:12,marginBottom:20}}>{cfg.goals.find(g=>g.id===goal).types.map(t=>{
            const sel=docType===t;
            return (
            <button key={t} onClick={()=>setDocType(t)} style={{textAlign:"left",background:T.surface,border:`1.5px solid ${sel?cfg.color:T.line}`,borderRadius:12,overflow:"hidden",cursor:"pointer",transition:TRANS,padding:0,boxShadow:sel?`0 0 0 3px ${cfg.color}1F`:T.shadowSm}} onMouseEnter={e=>{if(!sel)e.currentTarget.style.boxShadow=T.shadowMd}} onMouseLeave={e=>{if(!sel)e.currentTarget.style.boxShadow=T.shadowSm}}>
              {/* mini-aperçu de document */}
              <div style={{height:74,background:sel?cfg.color+"0F":T.surfaceAlt,borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                <div style={{width:38,height:50,background:"#fff",border:`1px solid ${T.line}`,borderRadius:3,boxShadow:T.shadowSm,padding:"6px 5px",display:"flex",flexDirection:"column",gap:2.5}}>
                  <div style={{height:3,width:"60%",background:cfg.color,borderRadius:2}}/>
                  <div style={{height:2,width:"100%",background:T.line,borderRadius:2}}/>
                  <div style={{height:2,width:"100%",background:T.line,borderRadius:2}}/>
                  <div style={{height:2,width:"80%",background:T.line,borderRadius:2}}/>
                  {isExcel&&<div style={{marginTop:2,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:1.5}}>{[...Array(6)].map((_,i)=><div key={i} style={{height:2.5,background:i%3===0?cfg.color+"99":T.line,borderRadius:1}}/>)}</div>}
                </div>
                {sel&&<div style={{position:"absolute",top:7,right:7,width:18,height:18,borderRadius:"50%",background:cfg.color,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="check" size={11} color="#fff"/></div>}
              </div>
              <div style={{padding:"9px 11px",fontSize:12,fontWeight:sel?700:600,color:sel?cfg.color:T.ink,lineHeight:1.3}}>{t}</div>
            </button>
          );})}</div>
          <div style={{fontSize:11,fontWeight:700,color:T.inkFaint,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>Décris ton besoin</div>
          <textarea value={brief} onChange={e=>setBrief(e.target.value)} placeholder={isExcel?"Ex : budget prévisionnel sur 12 mois pour ma boutique, loyer 50 000 F, salaires 2 employés…":"Ex : contrat de prestation entre ma société et un client pour la création d'un logo, montant 75 000 FCFA…"} rows={3} style={{width:"100%",background:T.surfaceAlt,border:`1.5px solid ${T.line}`,borderRadius:10,padding:"12px 15px",fontSize:14,color:T.ink,outline:"none",fontFamily:FONT,resize:"vertical",boxSizing:"border-box",lineHeight:1.6}} onFocus={e=>{e.target.style.borderColor=cfg.color;e.target.style.boxShadow=`0 0 0 3px ${cfg.color}22`;}} onBlur={e=>{e.target.style.borderColor=T.line;e.target.style.boxShadow="none";}}/>
          <button onClick={run} disabled={busy||!brief.trim()} style={{marginTop:14,padding:"12px 24px",background:busy||!brief.trim()?T.line:cfg.color,color:busy||!brief.trim()?T.inkFaint:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:busy||!brief.trim()?"not-allowed":"pointer",fontFamily:FONT_DISPLAY,display:"flex",alignItems:"center",gap:8}}>{busy?"Rédaction…":<><Icon name="pen" size={15}/>Générer le document</>}</button>
          <div style={{marginTop:8,fontSize:11,color:T.inkFaint}}>Consomme 1 crédit.</div>
        </div>
        {err&&<div style={{margin:"0 2px 16px",padding:"10px 13px",background:T.redSoft,border:`1px solid ${T.red}33`,borderRadius:10,fontSize:13,color:T.red}}>{err}</div>}
        {out&&(
          <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,overflow:"hidden",boxShadow:T.shadowSm}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 18px",borderBottom:`1px solid ${T.line}`,background:T.surfaceAlt}}>
              <div style={{fontSize:13,fontWeight:700,color:T.ink,fontFamily:FONT_DISPLAY}}>{docType}</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={copy} style={{padding:"7px 14px",background:copied?T.greenSoft:T.surface,border:`1px solid ${copied?T.green:T.line}`,borderRadius:10,color:copied?T.green:T.inkSoft,cursor:"pointer",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}><Icon name="check" size={13}/>{copied?"Copié":"Copier"}</button>
                <button onClick={download} style={{padding:"7px 14px",background:T.surface,border:`1px solid ${T.line}`,borderRadius:10,color:T.inkSoft,cursor:"pointer",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}><Icon name="download" size={13}/>Télécharger</button>
              </div>
            </div>
            <div style={{padding:"20px 24px",fontSize:13,color:T.ink,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:isExcel?FONT_MONO:FONT,maxHeight:560,overflow:"auto"}}>{out}</div>
          </div>
        )}
        {!out&&!busy&&<div style={{textAlign:"center",padding:"50px 0"}}><div style={{width:60,height:60,borderRadius:16,background:T.surface,border:`1px solid ${T.line}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:cfg.color}}><Icon name={cfg.icon} size={26}/></div><div style={{fontSize:16,fontWeight:600,color:T.ink,fontFamily:FONT_DISPLAY}}>Choisis un type et décris ton besoin</div><div style={{fontSize:14,color:T.inkSoft,marginTop:4,lineHeight:1.55}}>Jenga rédige un document professionnel, prêt à l'emploi.</div></div>}
        </>)}
      </div>
    </div>
  );
}

// ── Département EXECUTIVE ASSISTANT (chat assistante de direction) ──
function AssistantStudio({ userPlan, model, memCtx, onBack, onCredit }) {
  const isWide=useWide(720);
  const [chat,setChat]=useState([]);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);
  const ask=async()=>{
    if(!input.trim()||busy)return;
    if(!onCredit?.(1)){ return; }
    const q=input.trim(); setInput(""); setChat(c=>[...c,{role:"user",text:q}]); setBusy(true);
    try{ const r=await executiveAssistant(model||MODEL, chat, q, memCtx); setChat(c=>[...c,{role:"ea",text:r}]); }
    catch(e){ setChat(c=>[...c,{role:"ea",text:"Désolée, un souci technique m'empêche de répondre. Réessaie dans un instant."}]); }
    setBusy(false);
  };
  const suggestions=["Rédige un courrier de relance pour un client qui n'a pas payé","Prépare un compte rendu de réunion d'équipe","Écris une note de service sur les nouveaux horaires","Prépare une convocation à une réunion"];
  return (
    <div style={{flex:1,overflow:"auto",background:T.surfaceAlt}}>
      <div style={{maxWidth:820,margin:"0 auto",padding:isWide?"32px 36px":"24px 18px"}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:7,background:"transparent",border:"none",color:T.inkSoft,cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:14,padding:0,transition:TRANS}} onMouseEnter={e=>e.currentTarget.style.color=T.ink} onMouseLeave={e=>e.currentTarget.style.color=T.inkSoft}><Icon name="chevron" size={15}/>Executive Studio</button>
        <StudioHeader kicker="Executive Assistant" accent="#0891B2" title="Ton assistante de direction" subtitle="Elle rédige, organise, prépare, structure et corrige — comme une assistante expérimentée." tagline="Demande-lui ce que tu veux, en langage simple." badges={["Courriers","Comptes rendus","Convocations","Notes"]}/>
        <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,overflow:"hidden",boxShadow:T.shadowMd,marginTop:22}}>
          <div style={{minHeight:300,maxHeight:460,overflow:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:13}}>
            {chat.length===0&&(
              <div style={{textAlign:"center",color:T.inkFaint,padding:"24px 12px"}}>
                <div style={{fontSize:14,fontWeight:700,color:T.inkSoft,marginBottom:10,fontFamily:FONT_DISPLAY}}>Que puis-je préparer pour toi ?</div>
                <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:440,margin:"0 auto"}}>
                  {suggestions.map((q,i)=><button key={i} onClick={()=>{setInput(q);setTimeout(()=>ask(),50);}} style={{textAlign:"left",padding:"11px 15px",background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,fontSize:13,color:T.ink,cursor:"pointer",fontFamily:FONT,transition:TRANS}} onMouseEnter={e=>e.currentTarget.style.borderColor="#0891B2"} onMouseLeave={e=>e.currentTarget.style.borderColor=T.line}>{q}</button>)}
                </div>
              </div>
            )}
            {chat.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"86%",padding:"12px 15px",borderRadius:m.role==="user"?"16px 16px 5px 16px":"16px 16px 16px 5px",background:m.role==="user"?T.indigo:T.surfaceAlt,color:m.role==="user"?"#fff":T.ink,fontSize:13,lineHeight:1.65,whiteSpace:"pre-wrap"}}>{m.text}</div>
              </div>
            ))}
            {busy&&<div style={{display:"flex",gap:7,alignItems:"center",color:T.inkFaint,fontSize:13}}><div style={{width:14,height:14,border:`2px solid #0891B244`,borderTopColor:"#0891B2",borderRadius:"50%",animation:"abspin .8s linear infinite"}}/>L'assistante rédige…</div>}
          </div>
          <div style={{display:"flex",gap:10,padding:"14px 18px",borderTop:`1px solid ${T.line}`}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")ask();}} placeholder="Ex : prépare une lettre de demande de partenariat…" style={{flex:1,padding:"12px 15px",background:T.surfaceAlt,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:14,color:T.ink,outline:"none",fontFamily:FONT}} onFocus={e=>{e.target.style.borderColor="#0891B2";e.target.style.boxShadow="0 0 0 3px #0891B222";}} onBlur={e=>{e.target.style.borderColor=T.line;e.target.style.boxShadow="none";}}/>
            <button onClick={ask} disabled={busy||!input.trim()} style={{padding:"0 20px",background:busy||!input.trim()?T.line:"#0891B2",color:busy||!input.trim()?T.inkFaint:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:busy||!input.trim()?"not-allowed":"pointer",fontFamily:FONT_DISPLAY}}>Envoyer</button>
          </div>
        </div>
        <div style={{marginTop:12,fontSize:11,color:T.inkFaint,textAlign:"center"}}>Chaque demande consomme 1 crédit. Copie le résultat directement dans ton traitement de texte.</div>
      </div>
    </div>
  );
}

// ── Département PRÉSENTATIONS (oriente vers le générateur d'app / info) ──
function SlidesInfo({ onBack }) {
  const isWide=useWide(720);
  return (
    <div style={{flex:1,overflow:"auto",background:T.surfaceAlt}}>
      <div style={{maxWidth:820,margin:"0 auto",padding:isWide?"32px 36px":"24px 18px"}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:7,background:"transparent",border:"none",color:T.inkSoft,cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:14,padding:0,transition:TRANS}} onMouseEnter={e=>e.currentTarget.style.color=T.ink} onMouseLeave={e=>e.currentTarget.style.color=T.inkSoft}><Icon name="chevron" size={15}/>Executive Studio</button>
        <StudioHeader kicker="Présentations" accent="#8B5CF6" title="Tes présentations de niveau conseil" subtitle="Pitch decks, présentations commerciales et d'entreprise, rapports — design inspiré des grands cabinets." tagline="Bientôt : génération PPTX directement dans Jenga." badges={["Pitch Deck","Commercial","Rapports"]}/>
        <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24,marginTop:22}}>
          <div style={{fontSize:16,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,marginBottom:10}}>En attendant la génération automatique</div>
          <div style={{fontSize:13,color:T.inkSoft,lineHeight:1.7,marginBottom:16}}>L'Executive Assistant peut déjà rédiger le contenu structuré de ta présentation (titres, messages clés, plan slide par slide). Tu le colles ensuite dans PowerPoint ou Google Slides. La génération PPTX directe arrive prochainement dans le Executive Studio.</div>
          <div style={{padding:"13px 16px",background:"#F3EEFC",borderRadius:10,fontSize:13,color:"#7C3AED",lineHeight:1.55}}>Astuce : demande à l'Executive Assistant « prépare le plan d'une présentation commerciale en 8 slides pour mon produit », puis structure-le dans ton outil de slides.</div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// v10 — GITHUB MODAL (push / versioning)
// ═══════════════════════════════════════════════════════════════════════════
function GithubModal({ title, code, fullstack, token, setToken, onClose }) {
  const [step,setStep]=useState(token?"ready":"connect");
  const [input,setInput]=useState(token||"");
  const [user,setUser]=useState(null);
  const [isPrivate,setIsPrivate]=useState(true);
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState(null);
  const [err,setErr]=useState("");
  const inp={width:"100%",padding:"12px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:14,color:T.ink,outline:"none",fontFamily:FONT};

  const connect=async()=>{
    if(!input.trim()){setErr("Colle ton token GitHub.");return;}
    setBusy(true);setErr("");
    if(!backend.enabled()){ setErr("Le backend n'est pas configuré — GitHub nécessite le serveur."); setBusy(false); return; }
    try{ const u=await backend.githubVerify(input.trim()); setUser(u); setToken(input.trim()); setStep("ready"); }
    catch(e){ setErr(e.message); }
    setBusy(false);
  };
  const push=async()=>{
    setBusy(true);setErr("");
    try{
      const files={ [`${(title||"App").replace(/\s+/g,"-")}.jsx`]: code };
      if(fullstack?.backend) files["server.js"]=fullstack.backend;
      if(fullstack?.schema) files["schema.sql"]=fullstack.schema;
      if(fullstack?.apiDocs) files["API.md"]=fullstack.apiDocs;
      files["README.md"]=`# ${title}\n\nGénéré avec Jenga AI.`;
      const r=await backend.githubPush({ githubToken:token, appName:title||"afribuild-app", description:`${title} — généré avec Jenga`, files, message:msg||"Mise à jour via Jenga AI", isPrivate });
      setResult(r); setStep("done");
    }catch(e){ setErr(e.message); }
    setBusy(false);
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{background:T.surface,borderRadius:20,padding:32,width:460,maxWidth:"94vw"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{color:T.ink}}><Icon name="code" size={22}/></div><div style={{fontSize:20,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>GitHub</div></div>
          <button onClick={onClose} style={{width:36,height:36,background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.inkSoft}}><Icon name="x" size={16}/></button>
        </div>
        {step==="connect"&&<>
          <div style={{fontSize:14,color:T.inkSoft,marginBottom:18,lineHeight:1.6}}>Connecte ton compte GitHub avec un <strong>token personnel</strong>. Crée-le sur github.com → Settings → Developer settings → Personal access tokens (scope <code style={{background:T.surfaceAlt,padding:"1px 5px",borderRadius:4,fontFamily:FONT_MONO,fontSize:12}}>repo</code>).</div>
          <input type="password" placeholder="ghp_xxxxxxxxxxxx" value={input} onChange={e=>setInput(e.target.value)} style={inp}/>
          {err&&<div style={{padding:"9px 12px",background:T.redSoft,border:`1px solid ${T.red}33`,borderRadius:10,fontSize:13,color:T.red,marginTop:12}}>{err}</div>}
          <button onClick={connect} disabled={busy} style={{marginTop:18,width:"100%",padding:"13px",background:busy?T.inkFaint:T.ink,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:busy?"not-allowed":"pointer",fontFamily:FONT_DISPLAY}}>{busy?"Vérification…":"Connecter GitHub"}</button>
        </>}
        {step==="ready"&&<>
          {user&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:T.surfaceAlt,borderRadius:10,marginBottom:16}}><Avatar name={user.login} size={30}/><div><div style={{fontSize:13,fontWeight:600,color:T.ink}}>{user.name||user.login}</div><div style={{fontSize:11,color:T.inkFaint}}>@{user.login}</div></div><button onClick={()=>{setToken("");setStep("connect");setInput("")}} style={{marginLeft:"auto",background:"none",border:"none",color:T.inkFaint,cursor:"pointer",fontSize:12,textDecoration:"underline"}}>Changer</button></div>}
          <div style={{fontSize:13,color:T.inkSoft,marginBottom:14}}>Pousse <strong>{title}</strong> sur GitHub. Le dépôt est créé automatiquement, chaque génération crée un commit.</div>
          <input placeholder="Message de commit (optionnel)" value={msg} onChange={e=>setMsg(e.target.value)} style={{...inp,marginBottom:12}}/>
          <label style={{display:"flex",alignItems:"center",gap:9,fontSize:13,color:T.inkSoft,cursor:"pointer",marginBottom:18}}><input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)} style={{width:16,height:16,accentColor:T.indigo}}/>Dépôt privé</label>
          {err&&<div style={{padding:"9px 12px",background:T.redSoft,border:`1px solid ${T.red}33`,borderRadius:10,fontSize:13,color:T.red,marginBottom:14}}>{err}</div>}
          <button onClick={push} disabled={busy} style={{width:"100%",padding:"13px",background:busy?T.inkFaint:T.ink,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:busy?"not-allowed":"pointer",fontFamily:FONT_DISPLAY,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>{busy?"Push en cours…":<><Icon name="code" size={16}/>Pousser sur GitHub</>}</button>
        </>}
        {step==="done"&&result&&<div style={{textAlign:"center"}}>
          <div style={{width:60,height:60,borderRadius:"50%",background:T.greenSoft,border:`2px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:T.green}}><Icon name="check" size={26}/></div>
          <div style={{fontSize:20,fontWeight:800,color:T.ink,marginBottom:6,fontFamily:FONT_DISPLAY}}>Poussé sur GitHub !</div>
          <div style={{fontSize:13,color:T.inkSoft,marginBottom:18}}>{result.commits?.length||0} fichier(s) commités dans <strong>{result.owner}/{result.repo}</strong></div>
          <div style={{display:"flex",gap:10}}><button onClick={()=>window.open(result.repoUrl,"_blank")} style={{flex:1,padding:"12px",background:T.ink,border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:FONT_DISPLAY}}>Voir le dépôt</button><button onClick={onClose} style={{flex:1,padding:"12px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,color:T.inkSoft,cursor:"pointer",fontSize:14,fontWeight:600}}>Fermer</button></div>
        </div>}
      </div>
    </Overlay>
  );
}

// ─── GLOBAL STYLE ────────────────────────────────────────────────────────────
function BuyCreditsModal({ kind="apps", onClose, onPurchased }) {
  const [tab,setTab]=useState(kind);
  const activePacks = tab==="visuals" ? VISUAL_PACKS : CREDIT_PACKS;
  const [sel,setSel]=useState(activePacks.find(p=>p.popular||p.best)||activePacks[0]);
  const [step,setStep]=useState("choose");
  const [method,setMethod]=useState("cinetpay");
  const [card,setCard]=useState({number:"",expiry:"",cvv:"",name:"",email:""});
  const [mmo,setMmo]=useState({phone:"",op:"MTN"});
  const [processing,setProcessing]=useState(false);
  const inp={width:"100%",padding:"12px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:14,color:T.ink,outline:"none",fontFamily:FONT};
  const fOn=e=>e.target.style.borderColor=T.indigo; const fOff=e=>e.target.style.borderColor=T.line;
  const unit = tab==="visuals" ? "visuels" : "crédits";
  const amount=sel?.price||0;
  const qty=sel?.credits||sel?.visuals||0;
  const baseUnit = tab==="visuals"?100:133;
  const pay=async()=>{
    setProcessing(true);
    if(backend.enabled()){ try{ await backend.post("/api/pay/init",{ amount, currency:"XOF", country:"SN", description:`${qty} ${unit}` }); }catch{} }
    await sleep(2000); setProcessing(false); setStep("success"); await sleep(1400);
    onPurchased?.(tab, qty); onClose();
  };
  return (
    <Overlay onClose={onClose}>
      <div style={{background:T.surface,borderRadius:20,padding:30,width:480,maxWidth:"94vw"}}>
        {step==="choose"&&<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <div style={{fontSize:20,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>Acheter des crédits</div>
            <button onClick={onClose} style={{width:34,height:34,background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,cursor:"pointer",color:T.inkSoft,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="x" size={16}/></button>
          </div>
          <div style={{fontSize:13,color:T.inkSoft,marginBottom:18}}>Recharge quand tu veux, quel que soit ton plan. Les crédits n'expirent jamais.</div>
          <div style={{display:"flex",gap:6,background:T.surfaceAlt,padding:4,borderRadius:10,marginBottom:18}}>
            {[["apps","Crédits Apps"],["visuals","Crédits Visuels"]].map(([id,l])=><button key={id} onClick={()=>{setTab(id);const np=(id==="visuals"?VISUAL_PACKS:CREDIT_PACKS);setSel(np.find(p=>p.popular||p.best)||np[0]);}} style={{flex:1,padding:"9px",background:tab===id?"#fff":"transparent",border:"none",borderRadius:8,color:tab===id?T.ink:T.inkSoft,cursor:"pointer",fontSize:13,fontWeight:tab===id?700:500,boxShadow:tab===id?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>{l}</button>)}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
            {activePacks.map(p=>{const q=p.credits||p.visuals;const on=sel===p;return(
              <button key={q} onClick={()=>setSel(p)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:on?T.indigoSoft:T.surfaceAlt,border:`1.5px solid ${on?T.indigo:T.line}`,borderRadius:12,cursor:"pointer",textAlign:"left",position:"relative"}}>
                {(p.best||p.popular)&&<span style={{position:"absolute",top:-9,right:14,background:p.best?T.indigo:T.green,color:"#fff",fontSize:9,fontWeight:700,padding:"2px 9px",borderRadius:20}}>{p.best?"Meilleure offre":"Populaire"}</span>}
                <div style={{width:44,height:44,borderRadius:10,background:on?T.indigo:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:on?"none":`1px solid ${T.line}`}}><span style={{fontSize:18,fontWeight:800,color:on?"#fff":T.indigo,fontFamily:FONT_DISPLAY}}>{q}</span></div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:T.ink}}>{q} {unit}</div><div style={{fontSize:12,color:T.inkFaint}}>{p.per} F/u{p.per<baseUnit?` · -${Math.round((1-p.per/baseUnit)*100)}%`:""}</div></div>
                <div style={{fontSize:18,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>{fmt(p.price)} F</div>
              </button>
            );})}
          </div>
          <button onClick={()=>setStep("pay")} style={{width:"100%",padding:"14px",background:T.ink,color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT_DISPLAY}}>Continuer · {fmt(amount)} FCFA</button>
        </>}
        {step==="pay"&&<>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
            <div><div style={{fontSize:20,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>Paiement</div><div style={{fontSize:13,color:T.indigo,fontWeight:600,marginTop:2}}>{qty} {unit} · {fmt(amount)} FCFA</div></div>
            <button onClick={()=>setStep("choose")} style={{background:T.surfaceAlt,border:`1px solid ${T.line}`,color:T.inkSoft,borderRadius:10,padding:"7px 12px",cursor:"pointer",fontSize:13,fontWeight:600}}>Retour</button>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:T.inkFaint,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>Moyen de paiement</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            {[{id:"cinetpay",n:"CinetPay",f:"CI"},{id:"flutterwave",n:"Flutterwave",f:"FW"},{id:"kkiapay",n:"Kkiapay",f:"BJ"},{id:"mobile",n:"Mobile Money",f:"MM"}].map(g=>(
              <button key={g.id} onClick={()=>setMethod(g.id)} style={{padding:"11px 13px",background:method===g.id?T.indigoSoft:T.surfaceAlt,border:`1.5px solid ${method===g.id?T.indigo:T.line}`,borderRadius:10,cursor:"pointer",textAlign:"left"}}><span style={{fontSize:13,fontWeight:700,color:method===g.id?T.indigo:T.ink}}>{g.n}</span></button>
            ))}
          </div>
          <button onClick={()=>setMethod("card")} style={{width:"100%",padding:"11px 14px",background:method==="card"?T.indigoSoft:T.surfaceAlt,border:`1.5px solid ${method==="card"?T.indigo:T.line}`,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",gap:11,marginBottom:18}}><Icon name="card" size={18} color={method==="card"?T.indigo:T.inkSoft}/><span style={{fontSize:13,fontWeight:700,color:method==="card"?T.indigo:T.ink}}>Carte bancaire (Visa, MC)</span></button>
          {(method==="cinetpay"||method==="flutterwave"||method==="kkiapay"||method==="mobile")&&<div style={{display:"flex",flexDirection:"column",gap:11,marginBottom:18}}>
            {(method==="cinetpay"||method==="flutterwave")&&<input placeholder="Nom complet" value={card.name} onChange={e=>setCard({...card,name:e.target.value})} style={inp} onFocus={fOn} onBlur={fOff}/>}
            {method==="mobile"&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["MTN","Orange","Wave","M-Pesa"].map(o=><button key={o} onClick={()=>setMmo({...mmo,op:o})} style={{padding:"7px 13px",background:mmo.op===o?T.indigoSoft:T.surfaceAlt,border:`1.5px solid ${mmo.op===o?T.indigo:T.line}`,borderRadius:8,color:mmo.op===o?T.indigo:T.inkSoft,cursor:"pointer",fontSize:13,fontWeight:mmo.op===o?700:500}}>{o}</button>)}</div>}
            <input placeholder="Numéro de téléphone" value={mmo.phone} onChange={e=>setMmo({...mmo,phone:e.target.value})} style={inp} onFocus={fOn} onBlur={fOff}/>
          </div>}
          {method==="card"&&<div style={{display:"flex",flexDirection:"column",gap:11,marginBottom:18}}>
            <input placeholder="Nom sur la carte" value={card.name} onChange={e=>setCard({...card,name:e.target.value})} style={inp} onFocus={fOn} onBlur={fOff}/>
            <input placeholder="0000 0000 0000 0000" value={card.number} onChange={e=>setCard({...card,number:e.target.value.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim().slice(0,19)})} style={{...inp,fontFamily:FONT_MONO,letterSpacing:1.5}} onFocus={fOn} onBlur={fOff}/>
            <div style={{display:"flex",gap:10}}><input placeholder="MM / AA" value={card.expiry} onChange={e=>{let v=e.target.value.replace(/\D/g,"");if(v.length>2)v=v.slice(0,2)+" / "+v.slice(2,4);setCard({...card,expiry:v})}} style={inp} onFocus={fOn} onBlur={fOff}/><input placeholder="CVV" type="password" value={card.cvv} onChange={e=>setCard({...card,cvv:e.target.value.slice(0,4)})} style={inp} onFocus={fOn} onBlur={fOff}/></div>
          </div>}
          <button onClick={pay} disabled={processing} style={{width:"100%",padding:"14px",background:processing?T.inkFaint:T.ink,color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:processing?"not-allowed":"pointer",fontFamily:FONT_DISPLAY}}>{processing?"Traitement…":`Payer ${fmt(amount)} FCFA`}</button>
        </>}
        {step==="success"&&<div style={{textAlign:"center",padding:"26px 0"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:T.greenSoft,border:`2px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:T.green}}><Icon name="check" size={28}/></div>
          <div style={{fontSize:20,fontWeight:800,color:T.ink,marginBottom:6,fontFamily:FONT_DISPLAY}}>Crédits ajoutés !</div>
          <div style={{fontSize:14,color:T.inkSoft}}>+{qty} {unit} disponibles immédiatement</div>
        </div>}
      </div>
    </Overlay>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LIGHT COMPANY LLC — Informations légales officielles de l'éditeur
// ═══════════════════════════════════════════════════════════════════════════
const COMPANY_INFO = {
  name:       "LIGHT COMPANY LLC",
  commercial: "LIGHT CO",
  product:    "Jenga",
  ifu:        "3202599115010",
  rccm:       "RB/COT/25 B 40761",
  siege:      "Akpakpa Irédé, Cotonou \u2013 République du Bénin",
  email:      "contact@lightco.group",
  whatsapp:   "+229 61 31 28 45",
  tel:        "+229 21 37 51 24",
  site:       "lightco.group",
};
const CONSENT_KEY     = "jenga_legal_v1_accepted";
const CONSENT_VERSION = "1.0";

// ─── 6 documents légaux complets (lisibles dans l'app) ──────────────────────
const LEGAL_DOCS = {
  cgu: {
    title:"Conditions Générales d'Utilisation",
    version:"Version 1.0 — En vigueur : 1er juillet 2026",
    sections:[
      {h:"Article 1 — Définitions",t:'« JENGA » : plateforme numérique de génération d\'apps par IA, exploitée par LIGHT COMPANY LLC (IFU 3202599115010, RCCM RB/COT/25 B 40761), Akpakpa Irédé, Cotonou, Bénin. « Utilisateur » : toute personne inscrite. « Crédits » : unités virtuelles sans valeur monétaire légale.'},
      {h:"Article 2 — Nature du service",t:"JENGA est un outil technologique. LIGHT COMPANY LLC ne garantit aucun résultat, aucun revenu, aucune compatibilité avec une plateforme tierce. La société n'est pas partie aux relations entre utilisateurs."},
      {h:"Article 3 — Acceptation",t:"L'inscription vaut acceptation pleine des CGU, Politique de Confidentialité et Règles de la Communauté. Votre acceptation constitue une signature électronique conservée avec horodatage."},
      {h:"Article 4 — Admissibilité",t:"Vous devez avoir au moins 18 ans, avoir la capacité juridique de contracter, ne pas avoir été banni, et fournir des informations exactes. Toute personne de moins de 18 ans est interdite d'accès."},
      {h:"Article 5 — Conduites interdites",t:"Sont interdits : contenus illégaux, harcèlement, bots, collecte de données d'autrui, contournement des sécurités, usurpation d'identité, activités frauduleuses, promotion de la haine ou de la violence."},
      {h:"Article 6 — Crédits et services Premium",t:"Les crédits sont des unités virtuelles non remboursables et non échangeables contre de l'argent. Chaque action (génération d'app, visuel, APK, déploiement) consomme des crédits selon le barème en vigueur. Les crédits non utilisés sont perdus en cas de suppression du compte."},
      {h:"Article 7 — Limitation de responsabilité",t:"DANS LES LIMITES PERMISES PAR LA LOI, LIGHT COMPANY LLC EXCLUT TOUTE RESPONSABILITÉ POUR DOMMAGES INDIRECTS. LA RESPONSABILITÉ TOTALE EST LIMITÉE AU MONTANT PAYÉ AU COURS DES 12 DERNIERS MOIS."},
      {h:"Article 8 — Propriété intellectuelle",t:"La marque JENGA, le logo, le code source et les algorithmes sont la propriété exclusive de Light Company LLC, protégés par les droits applicables."},
      {h:"Article 9 — Droit applicable",t:"Les CGU sont régies par le droit béninois et le droit uniforme OHADA, sans préjudice des protections impératives locales (RGPD pour l'UE, CCPA pour la Californie)."},
      {h:"Article 10 — Contact",t:"Light Company LLC — contact@lightco.group — +229 21 37 51 24 — WhatsApp +229 61 31 28 45 — https://lightco.group — Akpakpa Irédé, Cotonou, Bénin."},
    ]
  },
  privacy: {
    title:"Politique de Confidentialité",
    version:"Version 1.0 — RGPD · CCPA · Standards internationaux",
    sections:[
      {h:"1. Responsable du traitement",t:"Light Company LLC — IFU 3202599115010 — RCCM RB/COT/25 B 40761 — Akpakpa Irédé, Cotonou, Bénin — contact@lightco.group"},
      {h:"2. Données collectées",t:"Identité (prénom, email), données d'usage (actions, projets créés), données techniques (IP, appareil, OS), historique de transactions. Nous ne stockons pas vos données bancaires."},
      {h:"3. Finalités",t:"Fourniture du service, gestion de votre compte et abonnements, sécurité de la plateforme, communications liées au service (marketing uniquement avec consentement)."},
      {h:"4. Partage des données",t:"Nous ne vendons pas vos données. Partages possibles avec prestataires techniques (sous DPA) et autorités compétentes sur réquisition légale."},
      {h:"5. Conservation",t:"Compte actif : pendant la durée d'inscription. Après suppression : anonymisation dans les 30 jours. Transactions : 5 ans (obligation légale). Logs : 12 mois."},
      {h:"6. Vos droits",t:"Droits d'accès, rectification, effacement, portabilité, opposition. Pour exercer vos droits : contact@lightco.group — délai de réponse : 30 jours. Vous pouvez saisir votre autorité de contrôle locale (CNIL pour la France)."},
      {h:"7. Sécurité",t:"Chiffrement TLS en transit, AES-256 au repos, contrôle d'accès strict, audits réguliers, programme de divulgation responsable des vulnérabilités."},
      {h:"8. Contact",t:"contact@lightco.group — +229 21 37 51 24 — https://lightco.group"},
    ]
  },
  community: {
    title:"Règles de la Communauté",
    version:"Version 1.0 — 1er juillet 2026",
    sections:[
      {h:"Nos trois valeurs",t:"1. AUTHENTICITÉ — Soyez vous-même. Informations honnêtes, intentions transparentes.\n2. RESPECT — Traitez chaque membre avec dignité.\n3. SÉCURITÉ — Ne partagez jamais d'argent. Signalez tout comportement suspect."},
      {h:"Ce qui est autorisé",t:"Créer un profil authentique, interagir respectueusement, signaler les abus, utiliser toutes les fonctionnalités dans le respect des CGU."},
      {h:"Ce qui est interdit",t:"Faux profils, harcèlement, contenus illégaux, sollicitation financière, promotion de services non autorisés, contenu haineux ou discriminatoire."},
      {h:"Sanctions",t:"Avertissement → Limitation temporaire → Suspension (1 à 30 jours) → Bannissement permanent → Signalement aux autorités pour violations pénales."},
      {h:"Signalement",t:"Bouton Signaler disponible sur chaque profil. Urgences : safety@lightco.group"},
    ]
  },
  security: {
    title:"Centre de Sécurité",
    version:"Version 1.0 — 1er juillet 2026",
    sections:[
      {h:"Votre sécurité, notre priorité",t:"Light Company LLC met en œuvre des mesures techniques et humaines pour garantir la sécurité des utilisateurs de JENGA."},
      {h:"Mesures techniques",t:"Chiffrement TLS 1.3, AES-256 au repos, détection automatique des comportements suspects, pare-feu applicatif, protection DDoS, tests de pénétration réguliers."},
      {h:"Reconnaître une arnaque",t:"Signaux d'alerte : déclaration d'amour rapide, profil trop parfait, refus de vidéo, urgences financières inventées, demande de transfert d'argent. JENGA ne vous demandera JAMAIS d'argent."},
      {h:"Signalement",t:"Urgences : safety@lightco.group — Arnaques : antiscam@lightco.group — Failles de sécurité : security@lightco.group"},
    ]
  },
  mentions: {
    title:"Mentions Légales",
    version:"Version 1.0 — 1er juillet 2026",
    sections:[
      {h:"Éditeur",t:"LIGHT COMPANY LLC\nNom commercial : LIGHT CO\nIFU : 3202599115010\nRCCM : RB/COT/25 B 40761\nSiège : Akpakpa Irédé, Cotonou, République du Bénin\nEmail : contact@lightco.group\nTél : +229 21 37 51 24\nWhatsApp : +229 61 31 28 45\nSite : https://lightco.group\nApplication : JENGA by LIGHT COMPANY LLC"},
      {h:"Propriété intellectuelle",t:"L'ensemble des éléments de JENGA (nom, logo, code, algorithmes) est la propriété exclusive de Light Company LLC, protégé par les droits applicables."},
      {h:"Données personnelles",t:"DPO : contact@lightco.group. Voir Politique de Confidentialité pour les détails."},
    ]
  },
  moderation: {
    title:"Politique de Modération",
    version:"Version 1.0 — 1er juillet 2026",
    sections:[
      {h:"Engagement",t:"JENGA applique une modération active combinant IA et intervention humaine pour maintenir un environnement sûr."},
      {h:"Délais de traitement",t:"Urgences (CSAM, menaces) : moins de 2h. Harcèlement grave : moins de 24h. Violations courantes : 3 à 7 jours. Appels : 14 jours."},
      {h:"Sanctions",t:"Avertissement → Suspension temporaire → Bannissement permanent → Signalement aux autorités pour violations pénales."},
      {h:"Contact",t:"moderation@lightco.group — Urgences : safety@lightco.group"},
    ]
  },
};

// ─── Fenêtre document légal (glissante depuis le bas, comme les grandes apps) ─
function LegalDocModal({ title, onClose }) {
  const doc = LEGAL_DOCS[title] || LEGAL_DOCS.cgu;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:3000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:620,background:"#fff",borderRadius:"22px 22px 0 0",maxHeight:"88vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"18px 20px 12px",borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>{doc.title}</div>
            <div style={{fontSize:11,color:T.inkFaint,marginTop:2,fontStyle:"italic"}}>{doc.version}</div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.inkSoft,flexShrink:0}}><Icon name="x" size={14}/></button>
        </div>
        <div style={{padding:"10px 20px",background:T.indigoSoft,borderBottom:`1px solid ${T.line}`,flexShrink:0}}>
          <div style={{fontSize:11,fontWeight:700,color:T.indigo}}>{COMPANY_INFO.name} · IFU {COMPANY_INFO.ifu} · RCCM {COMPANY_INFO.rccm}</div>
          <div style={{fontSize:11,color:T.inkSoft,marginTop:1}}>{COMPANY_INFO.siege} · {COMPANY_INFO.email}</div>
        </div>
        <div style={{overflow:"auto",padding:"18px 20px",flex:1}}>
          {doc.sections.map((s,i)=>(
            <div key={i} style={{marginBottom:18,paddingBottom:14,borderBottom:i<doc.sections.length-1?`1px solid ${T.line}`:"none"}}>
              <div style={{fontSize:13,fontWeight:700,color:T.ink,marginBottom:6}}>{s.h}</div>
              <div style={{fontSize:13,color:"#333",lineHeight:1.75,whiteSpace:"pre-line"}}>{s.t}</div>
            </div>
          ))}
          <div style={{marginTop:16,padding:14,background:T.surfaceAlt,borderRadius:10,fontSize:11,color:T.inkFaint,lineHeight:1.8}}>
            <div style={{fontWeight:700,color:T.ink,marginBottom:3}}>JENGA by LIGHT COMPANY LLC</div>
            <div>{COMPANY_INFO.siege}</div>
            <div style={{marginTop:4}}> {COMPANY_INFO.email} ·  {COMPANY_INFO.tel} ·  {COMPANY_INFO.whatsapp}</div>
            <div> https://{COMPANY_INFO.site}</div>
          </div>
        </div>
        <div style={{padding:"13px 20px",borderTop:`1px solid ${T.line}`,flexShrink:0}}>
          <button onClick={onClose} style={{width:"100%",padding:"13px",background:T.ink,color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT_DISPLAY}}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Écran de consentement officiel JENGA — au premier lancement ─────────────
function ConsentScreen({ onAccepted }) {
  const { online, slow } = useNetwork();
  const [cgu,setCgu]=useState(false);
  const [privacy,setPrivacy]=useState(false);
  const [community,setCommunity]=useState(false);
  const [age,setAge]=useState(false);
  const [reading,setReading]=useState(null);
  const [loading,setLoading]=useState(false);
  const allOk = cgu && privacy && community && age;

  const accept = async () => {
    if(!allOk)return;
    setLoading(true);
    await sleep(800);
    ls.set(CONSENT_KEY,{version:CONSENT_VERSION,accepted_at:new Date().toISOString(),cgu:true,privacy:true,community:true,age_confirmed:true,method:"checkbox_button"});
    setLoading(false);
    onAccepted();
  };

  const DocLink = ({doc,label}) => (
    <span onClick={e=>{e.stopPropagation();setReading(doc);}}
      style={{color:T.indigo,fontWeight:700,textDecoration:"underline",textUnderlineOffset:2,cursor:"pointer"}}>{label}</span>
  );

  const CB = ({checked,onToggle,color,children}) => (
    <label onClick={onToggle} style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer",
      padding:"13px 14px",background:checked?(color||T.indigo)+"18":T.surfaceAlt,
      border:`1.5px solid ${checked?(color||T.indigo):T.line}`,borderRadius:12,marginBottom:11,transition:TRANS}}>
      <div style={{width:22,height:22,borderRadius:6,background:checked?(color||T.indigo):"#fff",
        border:`2px solid ${checked?(color||T.indigo):T.line}`,display:"flex",alignItems:"center",
        justifyContent:"center",flexShrink:0,marginTop:1,transition:TRANS}}>
        {checked&&<svg width="12" height="9" viewBox="0 0 12 9"><polyline points="1,4.5 4.5,8 11,1" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div style={{fontSize:13,color:T.ink,lineHeight:1.55}}>{children}</div>
    </label>
  );

  return (
    <>
      {reading&&<LegalDocModal title={reading} onClose={()=>setReading(null)}/>}
      <div style={{minHeight:"100vh",background:T.navBg,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px",fontFamily:FONT}}>
        <div style={{width:"100%",maxWidth:480}}>
          <div style={{textAlign:"center",marginBottom:22}}>
            <Logo size={58}/>
            <div style={{fontSize:28,fontWeight:800,color:"#fff",fontFamily:FONT_DISPLAY,marginTop:14,letterSpacing:"-0.03em"}}>JENGA</div>
            <div style={{fontSize:13,color:T.navInk,marginTop:4}}>by LIGHT COMPANY LLC</div>
          </div>
          <div style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"15px 17px",marginBottom:16,fontSize:13,color:T.navInk,lineHeight:1.7,textAlign:"center"}}>
            En créant un compte ou en vous connectant à JENGA, vous acceptez nos{" "}
            <DocLink doc="cgu" label="Conditions d'utilisation"/>{" "}
            et reconnaissez avoir pris connaissance de notre{" "}
            <DocLink doc="privacy" label="Politique de confidentialité"/>.{" "}
            Vous confirmez également avoir au moins 18 ans.
          </div>
          <div style={{background:"rgba(255,255,255,0.05)",borderRadius:16,padding:"18px 20px",marginBottom:13}}>
            <div style={{fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12}}>Conditions obligatoires</div>
            <CB checked={cgu} onToggle={()=>setCgu(v=>!v)}>
              J'ai lu et j'accepte les <DocLink doc="cgu" label="Conditions d'utilisation"/> et la <DocLink doc="privacy" label="Politique de confidentialité"/> de JENGA.
            </CB>
            <CB checked={privacy} onToggle={()=>setPrivacy(v=>!v)}>
              J'ai pris connaissance des <DocLink doc="community" label="Règles de la communauté"/>, du <DocLink doc="security" label="Centre de sécurité"/> et des <DocLink doc="mentions" label="Mentions légales"/>.
            </CB>
            <CB checked={community} onToggle={()=>setCommunity(v=>!v)}>
              Je comprends que JENGA est un outil technologique et que Light Company LLC <span style={{fontWeight:700}}>ne garantit aucun résultat</span>. J'agis sous ma propre responsabilité.
            </CB>
            <CB checked={age} onToggle={()=>setAge(v=>!v)} color={T.gold}>
              Je confirme avoir au moins <span style={{fontWeight:700}}>18 ans</span> et être légalement autorisé(e) à utiliser ce service.
            </CB>
          </div>
          <div style={{fontSize:11,color:T.navInk,textAlign:"center",marginBottom:14,lineHeight:1.65,opacity:0.8}}>
            En appuyant sur « CRÉER UN COMPTE », vous apposez votre <span style={{fontWeight:700,color:"#fff"}}>signature électronique</span>. Un enregistrement horodaté est conservé conformément aux lois applicables.
          </div>
          <button onClick={accept} disabled={!allOk||loading} style={{width:"100%",padding:"16px",
            background:allOk?`linear-gradient(135deg,${T.indigo},${T.indigoDeep})`:"#242D4A",
            color:"#fff",border:"none",borderRadius:12,fontSize:16,fontWeight:800,
            cursor:allOk&&!loading?"pointer":"not-allowed",fontFamily:FONT_DISPLAY,
            marginBottom:16,opacity:allOk?1:0.52,transition:"all .25s",
            boxShadow:allOk?"0 8px 28px rgba(30,42,120,0.45)":"none"}}>
            {loading?"Enregistrement…":allOk?"CRÉER UN COMPTE":"Cochez toutes les cases pour continuer"}
          </button>
          <div style={{display:"flex",justifyContent:"center",gap:14,flexWrap:"wrap",marginBottom:20}}>
            {[["cgu","CGU"],["privacy","Confidentialité"],["community","Règles"],["security","Sécurité"],["mentions","Mentions légales"]].map(([k,l])=>(
              <button key={k} onClick={()=>setReading(k)} style={{background:"transparent",border:"none",color:T.navInk,cursor:"pointer",fontSize:12,textDecoration:"underline",textUnderlineOffset:2}}>{l}</button>
            ))}
          </div>
          <div style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:700,color:T.gold,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>JENGA by LIGHT COMPANY LLC</div>
            <div style={{fontSize:11,color:T.navInk,lineHeight:1.8}}>
              <div>IFU : {COMPANY_INFO.ifu} · RCCM : {COMPANY_INFO.rccm}</div>
              <div>{COMPANY_INFO.siege}</div>
              <div style={{marginTop:5,display:"flex",flexDirection:"column",gap:2}}>
                <span> <a href={"mailto:"+COMPANY_INFO.email} style={{color:T.gold}}>{COMPANY_INFO.email}</a></span>
                <span> <a href={"tel:"+COMPANY_INFO.tel} style={{color:T.navInk}}>{COMPANY_INFO.tel}</a></span>
                <span> WhatsApp : {COMPANY_INFO.whatsapp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NetworkBanner online={online} slow={slow}/>
      {/* WhatsApp Support — flottant en bas à droite, comme les grandes plateformes */}
      <a href={"https://wa.me/22961312845?text=Bonjour%20JENGA%20Support%20-%20j'ai%20besoin%20d'aide"}
        target="_blank" rel="noopener noreferrer"
        title="Support WhatsApp"
        style={{position:"fixed",bottom:80,right:20,width:52,height:52,borderRadius:"50%",
          background:"#25D366",color:"#fff",display:"flex",alignItems:"center",
          justifyContent:"center",boxShadow:"0 4px 20px rgba(37,211,102,0.45)",
          zIndex:500,textDecoration:"none",fontSize:24,transition:TRANS}}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.12)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
        
      </a>    </>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING — Guide interactif 3 étapes pour les nouveaux utilisateurs
// Comme Notion, Linear, Webflow — affiché une seule fois après l'inscription
// ═══════════════════════════════════════════════════════════════════════════
const ONBOARDING_KEY = "jenga_onboarding_done_v1";
const ONBOARDING_STEPS = [
  {
    emoji:"*", title:"Génère ta première app en 30 secondes",
    desc:"Décris ton projet en une phrase simple — Jenga crée l'application complète avec code, design et données réelles.",
    tip:"Astuce: Astuce : sois précis sur le secteur et la ville. « Boutique de wax à Dakar » génère mieux que « boutique ».",
    action:"Voir un exemple", demo:"Boutique de wax à Dakar avec paiement Wave et gestion de stock"
  },
  {
    emoji:"Art", title:"Crée des visuels professionnels",
    desc:"Le Studio graphique génère des flyers, logos, photos produits et bannières par IA — en quelques secondes.",
    tip:"Astuce: Astuce : clique sur Studio graphique dans le menu gauche et décris l'image que tu veux.",
    action:"Explorer le studio", demo:null
  },
  {
    emoji:"Tel", title:"Exporte ton app sur Android et iOS",
    desc:"En un clic, ton application devient un vrai fichier APK installable sur Android. Partage-le directement.",
    tip:"Astuce: Astuce : génère d'abord ton app, puis clique sur le bouton APK dans la barre d'outils.",
    action:"Commencer maintenant", demo:null
  },
];

function OnboardingScreen({ onDone, onGenerate }) {
  const [step, setStep] = useState(0);
  const s = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:20,padding:0,width:460,maxWidth:"96vw",overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.25)"}}>
        {/* Header marine */}
        <div style={{background:`linear-gradient(135deg,${T.indigo},${T.indigoDeep})`,padding:"28px 28px 22px",textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:10}}>{s.emoji}</div>
          <div style={{fontSize:20,fontWeight:800,color:"#fff",fontFamily:FONT_DISPLAY,letterSpacing:"-0.02em"}}>{s.title}</div>
          {/* Dots de progression */}
          <div style={{display:"flex",justifyContent:"center",gap:7,marginTop:16}}>
            {ONBOARDING_STEPS.map((_,i)=>(
              <div key={i} style={{width:i===step?22:7,height:7,borderRadius:4,background:i<=step?"#fff":"rgba(255,255,255,0.3)",transition:TRANS}}/>
            ))}
          </div>
        </div>
        {/* Contenu */}
        <div style={{padding:"22px 28px"}}>
          <div style={{fontSize:14,color:T.inkSoft,lineHeight:1.7,marginBottom:14}}>{s.desc}</div>
          <div style={{background:T.goldSoft,border:`1px solid ${T.gold}44`,borderRadius:10,padding:"12px 14px",fontSize:13,color:"#7a5c00",lineHeight:1.6,marginBottom:20}}>{s.tip}</div>
          {/* Boutons */}
          <div style={{display:"flex",gap:10}}>
            {s.demo&&(
              <button onClick={()=>{ onGenerate(s.demo); onDone(); }} style={{flex:1,padding:"12px",background:T.ink,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT_DISPLAY}}>{s.action}</button>
            )}
            <button onClick={()=>{ if(isLast){onDone();}else{setStep(s=>s+1);} }}
              style={{flex:1,padding:"12px",background:s.demo?T.surfaceAlt:T.ink,color:s.demo?T.ink:"#fff",border:`1px solid ${T.line}`,borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT_DISPLAY}}>
              {isLast?"Commencer →":s.demo?"Suivant →":s.action+" →"}
            </button>
          </div>
          <button onClick={onDone} style={{width:"100%",marginTop:10,padding:"9px",background:"transparent",border:"none",color:T.inkFaint,cursor:"pointer",fontSize:13}}>Passer l'introduction</button>
        </div>
      </div>
    </div>
  );
}
function GlobalStyle() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box}
    html,body,#root{margin:0;padding:0;height:100%}
    body{font-family:${FONT};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;letter-spacing:-0.011em}
    button{font-family:inherit}
    textarea,input{font-family:inherit}
    textarea::placeholder,input::placeholder{color:#A2AAC0}
    ::-webkit-scrollbar{width:10px;height:10px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:#D6DBE6;border-radius:6px;border:2px solid transparent;background-clip:content-box}
    ::-webkit-scrollbar-thumb:hover{background:#B8C0D2;background-clip:content-box}
    ::selection{background:rgba(28,50,147,0.14)}
    @keyframes abspin{to{transform:rotate(360deg)}}
    @keyframes abpulse{0%,100%{opacity:1}50%{opacity:0.35}}
    @keyframes abfade{from{opacity:0}to{opacity:1}}
    @keyframes abslide{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes abmic{0%,100%{box-shadow:0 0 0 4px rgba(229,72,77,0.16)}50%{box-shadow:0 0 0 9px rgba(229,72,77,0.05)}}
    @keyframes abrise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes abscale{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}
    @keyframes abshimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    .ab-rise{animation:abrise 0.5s ${EASE} both}
    .ab-scale{animation:abscale 0.4s ${EASE} both}
    .ab-stagger>*{animation:abrise 0.5s ${EASE} both}
    .ab-stagger>*:nth-child(1){animation-delay:0.03s}
    .ab-stagger>*:nth-child(2){animation-delay:0.07s}
    .ab-stagger>*:nth-child(3){animation-delay:0.11s}
    .ab-stagger>*:nth-child(4){animation-delay:0.15s}
    .ab-stagger>*:nth-child(5){animation-delay:0.19s}
    .ab-stagger>*:nth-child(6){animation-delay:0.23s}
    .ab-stagger>*:nth-child(7){animation-delay:0.27s}
    .ab-stagger>*:nth-child(8){animation-delay:0.31s}
    @keyframes abfadeview{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .ab-fade-view{animation:abfadeview 0.32s ${EASE} both}
    @keyframes abword{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
    .ab-word{display:inline-block;opacity:0;animation:abword .26s ${EASE} forwards}
    .ab-lift{transition:${TRANS}}
    .ab-lift:hover{transform:translateY(-3px)}
    @media (prefers-reduced-motion: reduce){
      *,*::before,*::after{animation-duration:0.01ms !important;animation-iteration-count:1 !important;transition-duration:0.01ms !important}
    }
  `}</style>;
}

// Aperçu miniature varié pour les cartes Templates (4 variantes : dashboard, liste, boutique, agenda)
function TemplatePreview({ color, letter, variant=0 }) {
  const bg=`linear-gradient(135deg,${color}14,${color}06)`;
  const Wrap=(children)=>(
    <div style={{height:118,background:bg,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      <div style={{width:"100%",maxWidth:200,background:"#fff",borderRadius:11,boxShadow:"0 6px 18px rgba(14,22,51,0.12)",overflow:"hidden",border:`1px solid ${color}1F`}}>
        <div style={{height:20,background:color,display:"flex",alignItems:"center",padding:"0 9px",gap:5}}>
          <span style={{width:11,height:11,borderRadius:4,background:"rgba(255,255,255,0.85)",color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,fontFamily:FONT_DISPLAY}}>{letter}</span>
          <span style={{flex:1,height:4,borderRadius:2,background:"rgba(255,255,255,0.4)"}}/>
        </div>
        <div style={{padding:"9px 10px"}}>{children}</div>
      </div>
    </div>
  );
  const bar=(w,c=color,o=1)=><div style={{height:6,borderRadius:3,background:c,opacity:o,width:w}}/>;
  if(variant===0){ // dashboard : KPIs + graphe
    return Wrap(<>
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        {[0.9,0.6,0.75].map((h,i)=><div key={i} style={{flex:1,background:color+"12",borderRadius:6,padding:"6px 5px"}}><div style={{height:4,width:"60%",borderRadius:2,background:color,marginBottom:4}}/><div style={{height:7,width:"85%",borderRadius:2,background:color,opacity:0.35}}/></div>)}
      </div>
      <div style={{display:"flex",alignItems:"flex-end",gap:4,height:30}}>
        {[0.4,0.7,0.45,0.9,0.6,1,0.55].map((h,i)=><div key={i} style={{flex:1,height:`${h*100}%`,borderRadius:"3px 3px 0 0",background:color,opacity:0.55+h*0.4}}/>)}
      </div>
    </>);
  }
  if(variant===1){ // liste / CRM
    return Wrap(<div style={{display:"flex",flexDirection:"column",gap:7}}>
      {[1,2,3].map(i=><div key={i} style={{display:"flex",alignItems:"center",gap:7}}><span style={{width:16,height:16,borderRadius:"50%",background:color,opacity:0.25,flexShrink:0}}/><div style={{flex:1}}>{bar("70%",color,0.8)}<div style={{height:4}}/>{bar("45%",color,0.3)}</div><span style={{width:18,height:8,borderRadius:4,background:color,opacity:0.3}}/></div>)}
    </div>);
  }
  if(variant===2){ // boutique : grille produits
    return Wrap(<>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
        {[0,1,2,3,4,5].map(i=><div key={i} style={{aspectRatio:"1",borderRadius:6,background:color,opacity:0.15+((i%3)*0.12)}}/>)}
      </div>
      <div style={{height:9,borderRadius:5,background:color,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{width:"40%",height:3,borderRadius:2,background:"rgba(255,255,255,0.7)"}}/></div>
    </>);
  }
  // variant 3 : agenda / réservation
  return Wrap(<div style={{display:"flex",flexDirection:"column",gap:5}}>
    <div style={{display:"flex",gap:4}}>{[0,1,2,3,4].map(i=><div key={i} style={{flex:1,textAlign:"center"}}><div style={{height:5,borderRadius:2,background:color,opacity:0.3}}/></div>)}</div>
    {[0,1,2].map(r=><div key={r} style={{display:"flex",gap:4}}>{[0,1,2,3,4].map(i=><div key={i} style={{flex:1,height:11,borderRadius:3,background:color,opacity:(r===1&&i===2)||(r===0&&i===4)?0.85:0.12}}/>)}</div>)}
  </div>);
}


function FadeWords({ text, animate=true, step=28 }) {
  if(!animate) return <>{text}</>;
  const words=String(text).split(/(\s+)/); // garde les espaces
  return (
    <>
      {words.map((w,i)=> /^\s+$/.test(w)
        ? w
        : <span key={i} className="ab-word" style={{animationDelay:`${i*step}ms`}}>{w}</span>
      )}
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// ACCUEIL NÉOPHYTE — un conseiller qui écoute le besoin et propose une route
// ═══════════════════════════════════════════════════════════════════════════
function AdvisorHome({ user, model, memCtx, onRoute, onCredit }) {
  const isWide=useWide(720);
  const [need,setNeed]=useState("");
  const [thinking,setThinking]=useState(false);
  const [plan,setPlan]=useState(null);   // { titre, explication, destination, action, exemple }
  const [error,setError]=useState("");

  // Les destinations possibles que le conseiller peut recommander
  const DESTS={
    builder:   { label:"Build Studio", desc:"créer une application ou un site web", view:"builder" },
    design:    { label:"Executive Studio · Design", desc:"créer un logo ou un visuel", view:"images" },
    docs:      { label:"Executive Studio · Documents", desc:"rédiger un document (contrat, devis, rapport…)", view:"images" },
    excel:     { label:"Executive Studio · Tableaux", desc:"créer un budget ou un tableau", view:"images" },
    advisors:  { label:"Directeurs IA", desc:"obtenir un conseil d'expert pour ton entreprise", view:"advisors" },
  };

  const analyze=async()=>{
    if(!need.trim()||thinking)return;
    if(onCredit && !onCredit(1)) return;
    setThinking(true); setError(""); setPlan(null);
    const sys=`Tu es le conseiller d'accueil de Jenga, une plateforme qui aide les entrepreneurs africains. Un utilisateur débutant te décrit son besoin ou son problème. Tu dois choisir LA meilleure solution Jenga parmi ces destinations :
- "builder" : créer une application ou un site web (boutique en ligne, gestion, réservation...)
- "design" : créer un logo, flyer, affiche, visuel
- "docs" : rédiger un document (contrat, devis, facture, business plan, rapport, courrier)
- "excel" : créer un budget, une trésorerie, un tableau de suivi
- "advisors" : obtenir un conseil stratégique (commercial, marketing, finance...)
Réponds UNIQUEMENT en JSON valide, sans texte autour, au format exact :
{"destination":"builder|design|docs|excel|advisors","titre":"titre court et rassurant","explication":"2 phrases simples expliquant pourquoi cette solution répond à son besoin, sans jargon","exemple":"une phrase d'exemple concret de ce que Jenga va créer pour lui"}`+(memCtx||"");
    try{
      let raw=await callAI(model||MODEL, sys, "Besoin de l'utilisateur : "+need, 800);
      raw=(raw||"").replace(/```json|```/g,"").trim();
      const obj=JSON.parse(raw);
      if(!DESTS[obj.destination]) obj.destination="builder";
      setPlan(obj);
    }catch(e){ setError("Je n'ai pas pu analyser ton besoin. Reformule en une phrase simple, ou choisis directement un studio dans le menu."); }
    setThinking(false);
  };

  const confirm=()=>{ if(!plan)return; const d=DESTS[plan.destination]; onRoute(d.view, need); };

  const SUGGEST=["Je veux vendre mes produits en ligne","J'ai besoin d'un logo pour ma boutique","Je dois faire un devis pour un client","Je veux suivre mes dépenses et mes revenus","Comment trouver plus de clients ?"];

  return (
    <div style={{flex:1,overflow:"auto",background:T.surfaceAlt}}>
      <div style={{maxWidth:760,margin:"0 auto",padding:isWide?"52px 36px":"30px 18px",minHeight:"100%",display:"flex",flexDirection:"column"}}>
        <div style={{textAlign:"center",marginBottom:26}}>
          <div style={{width:64,height:64,borderRadius:20,background:`linear-gradient(135deg,${T.indigo},${T.navBg})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:T.shadowLg,color:"#fff"}}><Icon name="comments" size={30}/></div>
          <div style={{fontSize:isWide?32:25,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.035em",lineHeight:1.12,marginBottom:12}}>Bonjour. Quel est votre besoin ?</div>
          <div style={{fontSize:16,color:T.inkSoft,lineHeight:1.55,maxWidth:520,margin:"0 auto"}}>Décrivez simplement votre problème ou ce que vous voulez faire. Je vous guide vers la bonne solution — pas besoin de savoir par où commencer.</div>
        </div>

        <div style={{background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:20,boxShadow:T.shadowLg,padding:isWide?"20px 20px 16px":"16px 16px 14px"}}>
          <textarea value={need} onChange={e=>setNeed(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();analyze();}}} rows={isWide?3:4} placeholder="Ex : Je vends des vêtements et je veux que mes clients puissent commander sur internet…" style={{width:"100%",border:"none",outline:"none",resize:"none",fontSize:16,color:T.ink,fontFamily:FONT,lineHeight:1.6,background:"transparent",boxSizing:"border-box"}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10,gap:12}}>
            <div style={{fontSize:12,color:T.inkFaint}}>Je choisis la meilleure solution pour vous.</div>
            <button onClick={analyze} disabled={!need.trim()||thinking} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 22px",background:need.trim()&&!thinking?T.ink:T.line,color:need.trim()&&!thinking?"#fff":T.inkFaint,border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:need.trim()&&!thinking?"pointer":"not-allowed",fontFamily:FONT_DISPLAY,transition:TRANS,whiteSpace:"nowrap"}}><Icon name="spark" size={16}/>{thinking?"J'analyse…":"M'aider"}</button>
          </div>
        </div>

        {error&&<div style={{marginTop:16,padding:"12px 15px",background:T.redSoft,border:`1px solid ${T.red}33`,borderRadius:12,fontSize:13.5,color:T.red,lineHeight:1.5}}>{error}</div>}

        {/* Recommandation du conseiller — à confirmer avant génération */}
        {plan&&(
          <div className="ab-rise" style={{marginTop:18,background:T.surface,border:`1px solid ${T.line}`,borderRadius:18,padding:"22px 24px",boxShadow:T.shadowMd}}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
              <div style={{width:30,height:30,borderRadius:9,background:T.greenSoft,display:"flex",alignItems:"center",justifyContent:"center",color:T.green}}><Icon name="check" size={17}/></div>
              <div style={{fontSize:12,fontWeight:700,color:T.green,textTransform:"uppercase",letterSpacing:"0.05em"}}>Voici ce que je vous propose</div>
            </div>
            <div style={{fontSize:19,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.02em",marginBottom:8}}>{plan.titre}</div>
            <div style={{fontSize:14.5,color:T.inkSoft,lineHeight:1.6,marginBottom:14}}>{plan.explication}</div>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 15px",background:T.indigoSoft,borderRadius:12,marginBottom:18}}>
              <div style={{color:T.indigo,flexShrink:0}}><Icon name="spark" size={17}/></div>
              <div style={{fontSize:13.5,color:T.indigo,lineHeight:1.5}}><strong>Destination :</strong> {DESTS[plan.destination].label}{plan.exemple?` — ${plan.exemple}`:""}</div>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button onClick={confirm} style={{flex:1,minWidth:180,padding:"13px",background:T.ink,color:"#fff",border:"none",borderRadius:12,fontSize:14.5,fontWeight:700,cursor:"pointer",fontFamily:FONT_DISPLAY,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Icon name="arrow" size={17}/>Oui, on y va</button>
              <button onClick={()=>setPlan(null)} style={{padding:"13px 20px",background:T.surface,color:T.inkSoft,border:`1.5px solid ${T.line}`,borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:FONT_DISPLAY}}>Non, autre chose</button>
            </div>
          </div>
        )}

        {/* Suggestions pour démarrer */}
        {!plan&&(
          <div style={{marginTop:24}}>
            <div style={{fontSize:12,fontWeight:700,color:T.inkFaint,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:12,textAlign:"center"}}>Ou commencez par un exemple</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:9,justifyContent:"center"}}>
              {SUGGEST.map(s=>(
                <button key={s} onClick={()=>setNeed(s)} style={{fontSize:13.5,fontWeight:600,color:T.inkSoft,background:T.surface,border:`1px solid ${T.line}`,padding:"9px 16px",borderRadius:30,cursor:"pointer",transition:TRANS}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.indigo;e.currentTarget.style.color=T.ink;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.line;e.currentTarget.style.color=T.inkSoft;}}>{s}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLEAU DE BORD — vue d'ensemble utile (stats, actions rapides, activité)
// ═══════════════════════════════════════════════════════════════════════════
function DashboardHome({ user, projects, onGo, onOpen, onDelete }) {
  const isWide=useWide(720);
  const [showAll,setShowAll]=useState(false);
  const planName=PLANS.find(p=>p.id===user?.plan)?.name||"Découverte";
  const online=projects.filter(p=>p.deployUrl).length;
  const recent=showAll?[...projects]:[...projects].slice(0,4);
  const stats=[
    {label:"Projets créés",value:projects.length,color:T.indigo,icon:"layers"},
    {label:"En ligne",value:online,color:T.green,icon:"spark"},
    {label:"Crédits restants",value:user?.credits??0,color:T.gold,icon:"spark"},
    {label:"Mon plan",value:planName,color:"#8B5CF6",icon:"card"},
  ];
  const actions=[
    {t:"Créer une application",d:"Boutique, gestion, réservation…",view:"builder",c:T.indigo,icon:"spark"},
    {t:"Créer un document ou visuel",d:"Logo, contrat, devis, présentation…",view:"images",c:T.gold,icon:"wand"},
    {t:"Demander conseil",d:"Vos directeurs IA vous répondent",view:"advisors",c:"#0891B2",icon:"comments"},
    {t:"Je ne sais pas par où commencer",d:"Laissez-vous guider",view:"home",c:T.green,icon:"comments"},
  ];
  const greeting=(()=>{ const h=new Date().getHours(); return h<12?"Bonjour":h<18?"Bon après-midi":"Bonsoir"; })();
  return (
    <div style={{flex:1,overflow:"auto",background:T.surfaceAlt}}>
      <div style={{maxWidth:1100,margin:"0 auto",padding:isWide?"32px 36px":"24px 18px"}}>
        <div style={{marginBottom:26}}>
          <div style={{fontSize:isWide?30:24,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.035em"}}>{greeting}{user?.name?`, ${user.name.split(" ")[0]}`:""}.</div>
          <div style={{fontSize:15,color:T.inkSoft,marginTop:5,lineHeight:1.55}}>Voici votre tableau de bord. Tout ce dont votre entreprise a besoin, au même endroit.</div>
        </div>
        {/* Stats */}
        <div className="ab-stagger" style={{display:"grid",gridTemplateColumns:isWide?"repeat(4,1fr)":"1fr 1fr",gap:14,marginBottom:28}}>
          {stats.map(s=>(
            <div key={s.label} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:"18px 20px",boxShadow:T.shadowSm}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:11}}>
                <span style={{fontSize:11,color:T.inkFaint,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.label}</span>
                <span style={{color:s.color,opacity:0.85}}><Icon name={s.icon} size={16}/></span>
              </div>
              <div style={{fontSize:26,fontWeight:800,color:s.color,fontFamily:FONT_DISPLAY,letterSpacing:"-0.02em"}}>{s.value}</div>
            </div>
          ))}
        </div>
        {/* Actions rapides */}
        <div style={{fontSize:12,fontWeight:700,color:T.inkFaint,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:14}}>Que voulez-vous faire ?</div>
        <div className="ab-stagger" style={{display:"grid",gridTemplateColumns:isWide?"repeat(2,1fr)":"1fr",gap:14,marginBottom:30}}>
          {actions.map(a=>(
            <button key={a.t} onClick={()=>onGo(a.view)} style={{textAlign:"left",background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:"20px 22px",cursor:"pointer",transition:TRANS,display:"flex",gap:15,alignItems:"center",boxShadow:T.shadowSm}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=T.shadowLg;}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadowSm;}}>
              <div style={{width:48,height:48,borderRadius:14,background:`linear-gradient(145deg,${a.c},${a.c}D0)`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 6px 16px ${a.c}40`}}><Icon name={a.icon} size={23}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15.5,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.01em",marginBottom:3}}>{a.t}</div>
                <div style={{fontSize:13,color:T.inkSoft,lineHeight:1.5}}>{a.d}</div>
              </div>
              <div style={{color:a.c,flexShrink:0}}><Icon name="arrow" size={18}/></div>
            </button>
          ))}
        </div>
        {/* Activité récente */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:T.inkFaint,letterSpacing:"0.07em",textTransform:"uppercase"}}>{showAll?"Tous vos projets":"Vos projets récents"}</div>
          {projects.length>4&&<button onClick={()=>setShowAll(v=>!v)} style={{background:"transparent",border:"none",color:T.indigo,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FONT_DISPLAY}}>{showAll?"Réduire":"Tout voir"}</button>}
        </div>
        {recent.length===0?(
          <div style={{background:T.surface,border:`1px dashed ${T.line}`,borderRadius:16,padding:"36px 20px",textAlign:"center"}}>
            <div style={{fontSize:14,color:T.inkSoft,marginBottom:16}}>Vous n'avez pas encore de projet. Commencez maintenant.</div>
            <button onClick={()=>onGo("builder")} style={{padding:"11px 22px",background:T.ink,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT_DISPLAY}}>Créer mon premier projet</button>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isWide?250:150}px,1fr))`,gap:14}}>
            {recent.map(p=>(
              <div key={p.id} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:14,overflow:"hidden",transition:TRANS,boxShadow:T.shadowSm,position:"relative"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=T.shadowLg;}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadowSm;}}>
                <div onClick={()=>onOpen(p)} style={{cursor:"pointer"}}>
                  <div style={{height:90,background:`linear-gradient(135deg,${T.indigoSoft},${T.goldSoft})`,display:"flex",alignItems:"center",justifyContent:"center",color:T.indigo,opacity:0.85,position:"relative"}}>
                    <Icon name="layers" size={28}/>
                    {p.deployUrl&&<div style={{position:"absolute",top:8,right:8}}><Badge color={T.green} soft={T.greenSoft}>En ligne</Badge></div>}
                  </div>
                  <div style={{padding:"12px 14px"}}>
                    <div style={{fontSize:13.5,fontWeight:700,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
                    <div style={{fontSize:11,color:T.inkFaint,marginTop:3}}>{p.time}</div>
                  </div>
                </div>
                {showAll&&onDelete&&<button onClick={()=>onDelete(p.id)} title="Supprimer" style={{position:"absolute",top:8,left:8,width:26,height:26,background:"rgba(255,255,255,0.92)",border:`1px solid ${T.line}`,borderRadius:8,color:T.inkFaint,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="x" size={12}/></button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardView({ user, projects, onOpen, onDelete, onNew, storageWarning }) {
  const [search,setSearch]=useState("");
  const isWide=useWide(720);
  const filtered=projects.filter(p=>p.title.toLowerCase().includes(search.toLowerCase()));
  const stats=[
    {label:"Projets",value:projects.length,color:T.indigo},
    {label:"En ligne",value:projects.filter(p=>p.deployUrl).length,color:T.green},
    {label:"Crédits",value:user.credits,color:T.gold},
    {label:"Plan",value:PLANS.find(p=>p.id===user.plan)?.name||"Découverte",color:"#8B5CF6"},
  ];
  return (
    <div style={{flex:1,overflow:"auto",background:T.surfaceAlt}}>
      <div style={{maxWidth:1140,margin:"0 auto",padding:isWide?"32px 36px":"24px 18px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:14}}>
          <div><div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.03em"}}>Tes projets</div><div style={{fontSize:14,color:T.inkSoft,marginTop:4,lineHeight:1.55}}>{projects.length} application{projects.length!==1?"s":""}</div></div>
          <button onClick={onNew} style={{padding:"11px 20px",background:T.ink,color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:FONT_DISPLAY,boxShadow:T.shadowMd,transition:TRANS}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}><Icon name="plus" size={17}/>Nouveau projet</button>
        </div>
        {storageWarning&&(
          <div style={{display:"flex",alignItems:"flex-start",gap:11,background:T.goldSoft,border:`1px solid ${T.gold}55`,borderRadius:12,padding:"13px 16px",marginBottom:20}}>
            <div style={{color:T.goldDeep,flexShrink:0,marginTop:1}}><Icon name="folder" size={17}/></div>
            <div style={{fontSize:13,color:T.ink,lineHeight:1.55}}>L'espace de sauvegarde de ton navigateur est presque plein. Tes projets récents sont conservés intacts, mais les plus anciens ont pu être retirés de l'historique local. Connecte-toi au cloud pour tout conserver sans limite.</div>
          </div>
        )}
        <div className="ab-stagger" style={{display:"grid",gridTemplateColumns:isWide?"repeat(5,1fr)":"1fr 1fr",gap:12,marginBottom:26}}>
          {stats.map(s=><div key={s.label} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:"18px 20px",boxShadow:T.shadowSm}}><div style={{fontSize:11,color:T.inkFaint,fontWeight:600,marginBottom:9,textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.label}</div><div style={{fontSize:28,fontWeight:800,color:s.color,fontFamily:FONT_DISPLAY,letterSpacing:"-0.02em"}}>{s.value}</div></div>)}
        </div>
        <div style={{position:"relative",marginBottom:20,maxWidth:380}}>
          <div style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:T.inkFaint}}><Icon name="search" size={17}/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un projet…" style={{width:"100%",padding:"11px 14px 11px 40px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:14,color:T.ink,outline:"none",fontFamily:FONT}} onFocus={e=>{e.target.style.borderColor=T.indigo;e.target.style.boxShadow=`0 0 0 3px ${T.indigoSoft}`;}} onBlur={e=>{e.target.style.borderColor=T.line;e.target.style.boxShadow="none";}}/>
        </div>
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"72px 0"}}>
            <div style={{width:64,height:64,borderRadius:16,background:T.surface,border:`1px solid ${T.line}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",color:T.inkFaint}}><Icon name="folder" size={28}/></div>
            <div style={{fontSize:16,fontWeight:700,color:T.ink,marginBottom:7,fontFamily:FONT_DISPLAY}}>{search?"Aucun résultat":"Aucun projet"}</div>
            <div style={{fontSize:14,color:T.inkSoft,marginBottom:24}}>{search?"Essaie un autre terme.":"Crée ta première application africaine."}</div>
            {!search&&<button onClick={onNew} style={{padding:"11px 24px",background:T.ink,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT_DISPLAY}}>Commencer</button>}
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isWide?280:150}px,1fr))`,gap:16}}>
            {filtered.map(p=>(
              <div key={p.id} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,overflow:"hidden",transition:TRANS,cursor:"pointer",boxShadow:T.shadowSm}} onMouseEnter={e=>{e.currentTarget.style.boxShadow=T.shadowLg;e.currentTarget.style.transform="translateY(-3px)"}} onMouseLeave={e=>{e.currentTarget.style.boxShadow=T.shadowSm;e.currentTarget.style.transform="translateY(0)"}}>
                <div onClick={()=>onOpen(p)} style={{height:130,background:`linear-gradient(135deg,${T.indigoSoft},${T.goldSoft})`,borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                  <div style={{color:T.indigo,opacity:0.5}}><Icon name="layers" size={36}/></div>
                  {p.deployUrl&&<div style={{position:"absolute",top:10,right:10}}><Badge color={T.green} soft={T.greenSoft}>En ligne</Badge></div>}
                </div>
                <div style={{padding:"14px 16px"}}>
                  <div style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
                  <div style={{fontSize:12,color:T.inkFaint,marginBottom:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.prompt?.slice(0,52)}…</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:11,color:T.inkFaint}}>{p.time}</span>
                    <div style={{display:"flex",gap:6}}><button onClick={()=>onOpen(p)} style={{padding:"5px 13px",background:T.indigoSoft,border:"none",borderRadius:8,color:T.indigo,cursor:"pointer",fontSize:12,fontWeight:600}}>Ouvrir</button><button onClick={()=>onDelete(p.id)} style={{width:28,height:28,background:T.surface,border:`1px solid ${T.line}`,borderRadius:8,color:T.inkFaint,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="x" size={13}/></button></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user,setUser]=useState(()=>ls.get("ab7_user",null));
  const planData=PLANS.find(p=>p.id===user?.plan)||PLANS[0];
  const [consented,setConsented]=useState(()=>{ const c=ls.get(CONSENT_KEY,null); return c?.version===CONSENT_VERSION&&c?.cgu&&c?.privacy; });
  const [showOnboarding,setShowOnboarding]=useState(()=>!ls.get(ONBOARDING_KEY,false));
  const [streamText,setStreamText]=useState(""); // texte streamé en temps réel
  const [legalDoc,setLegalDoc]=useState(null);
  const [view,setView]=useState("home");
  const [navOpen,setNavOpen]=useState(false);
  const [prompt,setPrompt]=useState("");
  const [expertMode,setExpertMode]=useState(false);
  const [analysis,setAnalysis]=useState(null);
  const [analyzing,setAnalyzing]=useState(false);
  const runAnalysis=useCallback(async(override)=>{
    const p=override||prompt;
    if(!p.trim()||analyzing)return;
    if((user?.credits||0)<1){setNoCreditsFor({action:"advisor",cost:1});return;}
    setAnalyzing(true);setAnalysis(null);
    try{
      const m=AI_TIERS[planData?.ai||"balanced"]?.id||MODEL;
      const a=await analyzeProject(m,p+businessMemory.context());
      setAnalysis(a);
      setUser(u=>({...u,credits:Math.max(0,(u?.credits||0)-1)}));
    }catch(e){ setAnalysis({error:e.message}); }
    setAnalyzing(false);
  },[prompt,analyzing,user,planData]);
  const [phase,setPhase]=useState("idle");
  const [result,setResult]=useState(null);
  const [liveCode,setLiveCode]=useState(null);
  const [error,setError]=useState("");
  const [tab,setTab]=useState("preview");
  const [previewMode,setPreviewMode]=useState("desktop");
  const [projects,setProjects]=useState(()=>projectStore.load());
  const [activeAgents,setActiveAgents]=useState([]);
  const [agentLogs,setAgentLogs]=useState(null);
  const [progress,setProgress]=useState(0);
  const [sidebarTab,setSidebarTab]=useState("templates");
  const [showPricing,setShowPricing]=useState(false);
  const [noCreditsFor,setNoCreditsFor]=useState(null); // action bloquée faute de crédits
  const [showBuyCredits,setShowBuyCredits]=useState(false);
  const [showJobs,setShowJobs]=useState(false);
  const allJobs=useJobs();
  const [bizMem,refreshBizMem]=useBusinessMemory();
  const [aaronPlan,setAaronPlan]=useState(()=>aaron.get().plan);
  const [aaronBusy,setAaronBusy]=useState(false);
  const loadAaron=useCallback(async(force)=>{
    if(aaronBusy)return;
    if(!force&&!aaron.isStale()&&aaron.get().plan){setAaronPlan(aaron.get().plan);return;}
    setAaronBusy(true);
    try{
      const m=AI_TIERS[planData?.ai||"balanced"]?.id||MODEL;
      const p=await aaron.generate(m);
      setAaronPlan(p);
    }catch(e){/* silencieux, Aaron ne doit jamais bloquer */}
    setAaronBusy(false);
  },[aaronBusy,planData]);
  const [advisor,setAdvisor]=useState(null);
  const [advisorInput,setAdvisorInput]=useState("");
  const [advisorChat,setAdvisorChat]=useState([]);
  const [advisorBusy,setAdvisorBusy]=useState(false);
  // Service client (support) — gratuit, ne consomme PAS de credits
  const [supportChat,setSupportChat]=useState([]);
  const [supportInput,setSupportInput]=useState("");
  const [supportBusy,setSupportBusy]=useState(false);
  const askSupport=useCallback(async()=>{
    if(!supportInput.trim()||supportBusy)return;
    const q=supportInput.trim();
    setSupportInput("");
    setSupportChat(c=>[...c,{role:"user",text:q}]);
    setSupportBusy(true);
    try{
      const m=AI_TIERS[planData?.ai||"balanced"]?.id||MODEL;
      const ans=await supportReply(m,supportChat,q);
      setSupportChat(c=>[...c,{role:"bot",text:ans}]);
    }catch(e){
      setSupportChat(c=>[...c,{role:"bot",text:"Desole, je rencontre un souci technique. Contactez-nous directement par WhatsApp au "+COMPANY_INFO.whatsapp+" ou par appel au "+COMPANY_INFO.tel+", notre equipe vous aidera."}]);
    }
    setSupportBusy(false);
  },[supportInput,supportBusy,supportChat,planData]);
  const askAdvisor=useCallback(async()=>{
    if(!advisor||!advisorInput.trim()||advisorBusy)return;
    if((user?.credits||0)<ACTION_COST.advisor){setNoCreditsFor({action:"advisor",cost:ACTION_COST.advisor});return;}
    const q=advisorInput.trim();
    setAdvisorInput("");
    setAdvisorChat(c=>[...c,{role:"user",text:q}]);
    setAdvisorBusy(true);
    try{
      const planModel=AI_TIERS[planData?.ai||"balanced"]?.id||MODEL;
      const ans=await callAI(planModel,advisor.system+PERSONNALITE,q+businessMemory.context(),2000);
      setAdvisorChat(c=>[...c,{role:"agent",text:ans}]);
      setUser(u=>({...u,credits:Math.max(0,(u?.credits||0)-ACTION_COST.advisor)}));
    }catch(e){
      setAdvisorChat(c=>[...c,{role:"agent",text:"Erreur : "+e.message}]);
    }
    setAdvisorBusy(false);
  },[advisor,advisorInput,advisorBusy,user,planData]);
  const { online, slow }=useNetwork();
  // Reprise des jobs interrompus au démarrage + au retour réseau
  // Capture le code de parrainage depuis l'URL (?ref=CODE) — boucle virale
  useEffect(()=>{
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && !ls.get("jenga_referred_by", null)) {
        ls.set("jenga_referred_by", ref);
        // Bonus de bienvenue : +20 crédits pour le filleul
        ls.set("jenga_welcome_bonus", 20);
      }
    } catch {}
  },[]);
  useEffect(()=>{ resumeInterruptedJobs(); },[]);
  useEffect(()=>{ if(user&&!user.isDemo) loadAaron(false); },[user]);
  useEffect(()=>{ if(online) resumeInterruptedJobs(); },[online]);
  // Dépense des crédits pour une action. Retourne false (et bloque) si pas assez.
  const spendCredits=useCallback((action)=>{
    const cost=ACTION_COST[action]||1;
    if((user?.credits||0)<cost){ setNoCreditsFor({action,cost}); return false; }
    setUser(u=>({...u,credits:Math.max(0,(u?.credits||0)-cost)}));
    return true;
  },[user]);
  const [showChat,setShowChat]=useState(false);
  const [showDeploy,setShowDeploy]=useState(false);
  const [showBrand,setShowBrand]=useState(false);
  const [brandData,setBrandData]=useState(null);
  const [previewError,setPreviewError]=useState(null);
  const [autoFixing,setAutoFixing]=useState(false);
  const [autoFixAttempts,setAutoFixAttempts]=useState(0);
  const [voiceLang,setVoiceLang]=useState("fr");
  const [voiceTranslating,setVoiceTranslating]=useState(false);
  const [originalVoice,setOriginalVoice]=useState("");
  const [selectedModel,setSelectedModel]=useState("balanced");
  const [genMode,setGenMode]=useState("frontend");
  const [fullstack,setFullstack]=useState(null);
  const [showBuild,setShowBuild]=useState(false);
  const [showGithub,setShowGithub]=useState(false);
  const [githubToken,setGithubToken]=useState(()=>ls.get("ab_ghtoken",""));
  const [projectMemory,setProjectMemory]=useState(null);
  const [selectedAgent,setSelectedAgent]=useState(null);
  const isWide=useWide(900);

  useEffect(()=>{if(user)ls.set("ab7_user",user)},[user]);
  useEffect(()=>{ if(user && backend.enabled() && !backend.token){ backend.auth(user.id,user.email); } },[user]);
  useEffect(()=>{ ls.set("ab_ghtoken",githubToken); },[githubToken]);
  const [storageWarning,setStorageWarning]=useState(false);
  useEffect(()=>{ const ok=projectStore.save(projects); if(!ok) setStorageWarning(true); },[projects]);
  useEffect(()=>{if(!isWide)setNavOpen(false)},[view,isWide]);

  useEffect(()=>{
    if(phase!=="generating"){setActiveAgents([]);setProgress(0);return;}
    const seq=[{a:["planner"],p:14,d:0},{a:["planner","design"],p:30,d:1400},{a:["design","frontend"],p:52,d:3200},{a:["frontend","backend"],p:72,d:5200},{a:["backend","qa"],p:88,d:7200},{a:["qa"],p:96,d:9000}];
    const t=seq.map(s=>setTimeout(()=>{setActiveAgents(s.a);setProgress(s.p)},s.d));
    return ()=>t.forEach(clearTimeout);
  },[phase]);

  const handlePreviewError=useCallback(async(msg)=>{
    if(autoFixing||!liveCode||autoFixAttempts>=3)return;
    setAutoFixing(true);setAutoFixAttempts(n=>n+1);
    try{
      const raw=await callAI("claude",`Dev React senior. Corrige l'erreur. JSON: {"code":"…corrigé complet…"}`,`Erreur: ${msg}\nCode:\n${liveCode.slice(0,8000)}`,6000);
      const m=raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim().match(/\{[\s\S]*\}/);
      const parsed=JSON.parse(m?m[0]:raw);
      if(parsed.code){setLiveCode(parsed.code);setPreviewError(null);}
    }catch{}
    setAutoFixing(false);
  },[liveCode,autoFixing,autoFixAttempts]);


  // runJob — execute le job en arriere-plan, resiste a la fermeture d'onglet
  const runJob = useCallback(async (job, lowData=false) => {
    const cur0 = jobStore.get(job.id);
    if (!cur0 || cur0.status === JOB_STATUS.RUNNING) return;
    jobStore.update(job.id, { status: JOB_STATUS.RUNNING, progress: 5, log: ["Initialisation des agents IA..."] });
    const addLog = (msg, prog) => {
      const c = jobStore.get(job.id) || {};
      jobStore.update(job.id, { log:[...(c.log||[]),msg], ...(prog!==undefined?{progress:prog}:{}) });
    };
    try {
      const steps = ["Analyse de ta demande...","Architecture en cours...","Generation des composants...","Integration donnees africaines...","Optimisation UI...","Tests automatiques...","Finalisation..."];
      for(let i=0;i<steps.length;i++){ addLog(steps[i], Math.round(8+(i/steps.length)*76)); await sleep(800); }
      const sys = job.genMode==="fullstack"?FULLSTACK_SYSTEM_PROMPT:job.genMode==="mobile"?MOBILE_SYSTEM_PROMPT:SYSTEM_PROMPT;
      const ctx = job.selectedAgent?("\n\nAGENT: "+job.selectedAgent.systemPrompt):"";
      const africa = buildAfricaExpertContext(job.prompt);
      const extras = ADMIN_PANEL_DIRECTIVE+BUSINESS_DIRECTIVE+RECEIPT_DIRECTIVE+VISUAL_DIRECTIVE+DOC_DIRECTIVE;
      const planModel = AI_MODELS.find(m=>m.id===job.selectedModel)?.model||AI_TIERS[planData?.ai||"balanced"]?.id||MODEL;
      addLog("Appel au modele IA...", 88);
      const raw = await callAI(
        planModel, sys,
        "Genere une app PROFESSIONNELLE indistinguable d'une equipe senior. Min 3 vues, donnees africaines.\n\n"+job.prompt+ctx+africa+extras+businessMemory.context(),
        job.genMode==="fullstack"?8000:7000,
        lowData ? undefined : (full) => { setStreamText(full); jobStore.update(job.id,{progress:Math.min(95,88+Math.floor(full.length/180))}); }
      );
      setStreamText("");
      const clean = raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
      const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0]||clean);
      if(job.genMode==="fullstack"){ if(!parsed.frontend) throw new Error("Pas de frontend."); parsed.code=parsed.frontend; }
      if(!parsed.code) throw new Error("Aucun code genere.");
      addLog("Succes !", 100);
      jobStore.update(job.id,{status:JOB_STATUS.DONE,progress:100,result:parsed,title:parsed.title||job.prompt.slice(0,50)});
      setResult(parsed); setLiveCode(parsed.code); setAgentLogs(parsed.agentLogs);
      setProgress(100); setActiveAgents([]); setPhase("done");
      setUser(u=>({...u,credits:Math.max(0,(u?.credits||0)-ACTION_COST.generate)}));
      const entry={id:job.id,title:parsed.title,prompt:job.prompt,result:parsed,code:parsed.code,
        time:new Date().toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}),deployUrl:null};
      setProjects(prev=>[entry,...prev.filter(p=>p.id!==job.id).slice(0,18)]);
      businessMemory.addProject(parsed.title||job.prompt.slice(0,40), job.prompt);
      notify("App generee ! " + (parsed.title||""), "Clique pour voir le resultat");
    } catch(e) {
      const c2 = jobStore.get(job.id)||{};
      jobStore.update(job.id,{status:JOB_STATUS.FAILED,log:[...(c2.log||[]),"Erreur: "+e.message]});
      setError(e.message); setPhase("error");
    }
  },[planData,setResult,setLiveCode,setAgentLogs,setProgress,setActiveAgents,setPhase,setUser,setProjects,setError]);

  const generate=useCallback(async(override)=>{
    const p=override||prompt;
    if(!p.trim()||phase==="generating")return;
    if((user?.credits||0)<ACTION_COST.generate){setNoCreditsFor({action:"generate",cost:ACTION_COST.generate});return;}
    askNotifPermission();
    const job={id:uid(),type:"generate",status:JOB_STATUS.QUEUED,progress:0,
      prompt:p,genMode,selectedModel,selectedAgent,title:p.slice(0,60),log:["Job cree..."]};
    jobStore.add(job);
    setPhase("generating");setResult(null);setLiveCode(null);setError("");setTab("preview");setStreamText("");
    setAgentLogs(null);setPreviewError(null);setFullstack(null);setAutoFixAttempts(0);
    runJob(job, slow);
  },[prompt,phase,user,genMode,selectedModel,selectedAgent,runJob,slow]);

  const openProject=p=>{
    const code = p.code || p.result?.code || p.result?.frontend || null;
    setResult(p.result||{title:p.title,code}); setLiveCode(code);
    setAgentLogs(p.result?.agentLogs||null); setPrompt(p.prompt||"");
    setFullstack(p.result?.frontend?p.result:null);
    setPreviewError(null); setError("");
    setPhase(code?"done":"idle"); setTab("preview"); setView("builder");
  };
  const downloadCode=()=>{if(!liveCode)return;const b=new Blob([liveCode],{type:"text/javascript"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`${result?.title?.replace(/\s+/g,"-")||"App"}.jsx`;a.click();URL.revokeObjectURL(u);};
  const doBrand=async()=>{setShowBrand(true);setBrandData(null);const b=await generateBrand(result?.title||"App",result?.description||"");setBrandData(b);};
  const pw=previewMode==="mobile"?390:previewMode==="tablet"?768:"100%";

  if(!consented) return <><GlobalStyle/><ConsentScreen onAccepted={()=>setConsented(true)}/></>;
  if(!user) return <><GlobalStyle/><AuthScreen onAuth={async u=>{ if(backend.enabled()){ await backend.auth(u.id,u.email); } setUser(u); ls.set("ab7_user",u); }}/></>;

  const NAV=[["home","spark","Accueil"],["dashboard","grid","Tableau de bord"],["builder","spark","Build Studio"],["templates","layers","Templates"],["images","wand","Executive Studio"],["marketplace","grid","Agents"],["advisors","spark","Directeurs IA"],["business_memory","folder","Mon Entreprise"],["community_feed","folder","Communauté"],["support","comments","Aide & Support"],["payments","card","Paiements"]];

  return (
    <div style={{display:"flex",height:"100vh",background:T.surfaceAlt,fontFamily:FONT,overflow:"hidden",color:T.ink}}>
      <GlobalStyle/>
      {/* mobile nav overlay */}
      {navOpen && !isWide && <div onClick={()=>setNavOpen(false)} style={{position:"fixed",inset:0,background:"rgba(11,14,24,0.5)",zIndex:80,backdropFilter:"blur(2px)"}}/>}

      {/* SIDEBAR */}
      <div style={{width:248,background:T.navBg,display:"flex",flexDirection:"column",flexShrink:0,position:isWide?"relative":"fixed",left:isWide?0:navOpen?0:-260,top:0,bottom:0,zIndex:85,transition:"left .25s ease",boxShadow:!isWide&&navOpen?"0 0 60px rgba(0,0,0,0.4)":"none"}}>
        <div style={{padding:"18px 16px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:16}}>
            <Logo size={38}/>
            <div><div style={{fontSize:16,fontWeight:800,color:"#fff",fontFamily:FONT_DISPLAY,letterSpacing:"-0.02em"}}>Jenga</div><div style={{fontSize:10,color:T.navInkSoft,letterSpacing:"0.16em",textTransform:"uppercase"}}>AI App Studio</div></div>
          </div>
          <button onClick={()=>setShowPricing(true)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:T.navActive,border:`1px solid ${T.navLine}`,borderRadius:10,cursor:"pointer",transition:TRANS}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.gold+"66"} onMouseLeave={e=>e.currentTarget.style.borderColor=T.navLine}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:7,height:7,borderRadius:"50%",background:planData.color}}/><span style={{fontSize:13,fontWeight:600,color:T.navInk}}>{planData.name}</span></div>
            <span style={{fontSize:12,color:T.gold,fontWeight:700}}>{user.credits} *</span>
          </button>
          <button onClick={()=>setShowBuyCredits(true)} style={{width:"100%",marginTop:7,padding:"8px 12px",background:"transparent",border:`1px solid ${T.gold}55`,borderRadius:10,cursor:"pointer",color:T.gold,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:TRANS}} onMouseEnter={e=>e.currentTarget.style.background=T.gold+"15"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>+ Acheter des crédits</button>
        </div>
        <div style={{flex:1,overflow:"auto",padding:"4px 10px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:16}}>
            {NAV.filter(([id])=>{ const allowed=navAllowedFor(user?.role); return !allowed||allowed.has(id); }).map(([id,icon,label])=>(
              <button key={id} onClick={()=>setView(id)} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 12px",background:view===id?T.navActive:"transparent",border:"none",borderRadius:10,color:view===id?"#fff":T.navInk,cursor:"pointer",fontSize:13,fontWeight:view===id?600:500,transition:TRANS,position:"relative"}} onMouseEnter={e=>{if(view!==id)e.currentTarget.style.background=T.navActive+"99"}} onMouseLeave={e=>{if(view!==id)e.currentTarget.style.background="transparent"}}>
                {view===id&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:18,background:T.gold,borderRadius:3}}/>}
                <span style={{color:view===id?T.gold:T.navInkSoft,transition:TRANS}}><Icon name={icon} size={18}/></span>{label}
                {id==="dashboard"&&projects.length>0&&<span style={{marginLeft:"auto",fontSize:10,background:T.navLine,color:T.navInk,padding:"1px 7px",borderRadius:10,fontWeight:700}}>{projects.length}</span>}
              </button>
            ))}
          </div>
          {view==="builder"&&(
            <div style={{borderTop:`1px solid ${T.navLine}`,paddingTop:14}}>
              <div style={{display:"flex",gap:4,marginBottom:8,padding:"0 2px"}}>
                {[["templates","Solutions"],["history","Récents"]].map(([id,l])=><button key={id} onClick={()=>setSidebarTab(id)} style={{flex:1,padding:"7px",background:sidebarTab===id?T.navActive:"transparent",border:"none",borderRadius:8,color:sidebarTab===id?"#fff":T.navInkSoft,cursor:"pointer",fontSize:11,fontWeight:sidebarTab===id?600:500}}>{l}</button>)}
              </div>
              {sidebarTab==="templates"?(
                <div style={{display:"flex",flexDirection:"column",gap:1}}>
                  {SOLUTIONS.map(s=><button key={s.id} onClick={()=>{setPrompt(s.prompt);generate(s.prompt);}} style={{background:"transparent",border:"none",borderRadius:10,padding:"9px 11px",color:T.navInk,cursor:"pointer",textAlign:"left",fontSize:13,display:"flex",alignItems:"center",gap:10,transition:TRANS,width:"100%"}} onMouseEnter={e=>e.currentTarget.style.background=T.navActive} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span style={{width:20,height:20,borderRadius:6,background:s.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,flexShrink:0}}>{s.letter}</span>{s.problem}</button>)}
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:1}}>
                  {projects.slice(0,8).map(p=><button key={p.id} onClick={()=>openProject(p)} style={{background:"transparent",border:"none",borderRadius:10,padding:"9px 11px",cursor:"pointer",textAlign:"left",transition:TRANS,width:"100%"}} onMouseEnter={e=>e.currentTarget.style.background=T.navActive} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><div style={{fontSize:13,fontWeight:500,color:T.navInk,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div><div style={{fontSize:10,color:T.navInkSoft,marginTop:1}}>{p.time}</div></button>)}
                  {projects.length===0&&<div style={{fontSize:12,color:T.navInkSoft,padding:"12px 6px",fontStyle:"italic"}}>Aucun projet</div>}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{padding:"12px 12px",borderTop:`1px solid ${T.navLine}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,background:T.navActive}}>
            <Avatar name={user.name||user.email} size={32}/>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name||user.email}</div><div style={{fontSize:10,color:T.navInkSoft}}>{user.isDemo?"Mode démo":planData.name}</div></div>
            <button onClick={()=>{setUser(null);ls.del("ab7_user")}} title="Déconnexion" style={{background:"none",border:"none",color:T.navInkSoft,cursor:"pointer",padding:4,display:"flex"}}><Icon name="logout" size={16}/></button>
            <button onClick={()=>setShowJobs(true)} title="Jobs & Builds" style={{background:"none",border:"none",color:allJobs.some(j=>j.status===JOB_STATUS.RUNNING||j.status===JOB_STATUS.QUEUED)?T.gold:T.navInkSoft,cursor:"pointer",padding:4,display:"flex",position:"relative"}}>
              <Icon name="layers" size={16}/>
              {allJobs.some(j=>j.status===JOB_STATUS.RUNNING||j.status===JOB_STATUS.QUEUED)&&<span style={{position:"absolute",top:2,right:2,width:6,height:6,borderRadius:"50%",background:T.gold}}/>}
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        {/* mobile topbar */}
        {!isWide && (
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:T.surface,borderBottom:`1px solid ${T.line}`,flexShrink:0}}>
            <button onClick={()=>setNavOpen(true)} aria-label="Menu" style={{width:42,height:42,background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:3}}>
              {[0,1,2].map(i=><div key={i} style={{width:16,height:2,background:T.ink,borderRadius:2}}/>)}
            </button>
            <span style={{fontSize:16,fontWeight:700,fontFamily:FONT_DISPLAY,color:T.ink}}>{NAV.find(n=>n[0]===view)?.[2]}</span>
          </div>
        )}
        <div key={view} className="ab-fade-view" style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        {view==="templates"?(
          <div style={{flex:1,overflow:"auto",background:T.surfaceAlt}}>
            <div style={{maxWidth:1140,margin:"0 auto",padding:isWide?"32px 36px":"24px 18px"}}>
              <div style={{marginBottom:6}}><div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.03em"}}>Templates</div><div style={{fontSize:14,color:T.inkSoft,marginTop:4,lineHeight:1.55}}>Choisis un modèle prêt à lancer. Jenga génère l'application complète : workflows, tableaux de bord, KPI et rapports.</div></div>
              <div className="ab-stagger" style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isWide?300:160}px,1fr))`,gap:18,marginTop:24}}>
                {SOLUTIONS.map((s,idx)=>(
                  <div key={s.id} onClick={()=>{setView("builder");setPrompt(s.prompt);setTimeout(()=>generate(s.prompt),60);}} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,overflow:"hidden",cursor:"pointer",transition:TRANS,position:"relative",boxShadow:T.shadowSm}} onMouseEnter={e=>{e.currentTarget.style.boxShadow=T.shadowLg;e.currentTarget.style.transform="translateY(-3px)"}} onMouseLeave={e=>{e.currentTarget.style.boxShadow=T.shadowSm;e.currentTarget.style.transform="translateY(0)"}}>
                    {s.impact>=5&&<div style={{position:"absolute",top:13,right:13,zIndex:2}}><Badge color={T.gold} soft={T.goldSoft}>Fort impact</Badge></div>}
                    <TemplatePreview color={s.color} letter={s.letter} variant={idx%4}/>
                    <div style={{padding:"16px 18px"}}>
                      <div style={{fontSize:16,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,marginBottom:6,letterSpacing:"-0.01em"}}>{s.problem}</div>
                      <div style={{display:"inline-block",fontSize:10,fontWeight:700,color:s.color,background:s.color+"13",padding:"3px 10px",borderRadius:20,marginBottom:10}}>{s.gain}</div>
                      <div style={{fontSize:13,color:T.inkSoft,lineHeight:1.6,marginBottom:15}}>{s.desc}</div>
                      <div style={{display:"flex",alignItems:"center",gap:7,color:s.color,fontSize:13,fontWeight:700}}><Icon name="spark" size={15}/>Utiliser ce template</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ):view==="home"?(
          <AdvisorHome user={user} model={AI_TIERS[(user?.plan==="pro"||user?.plan==="business")?"power":(planData?.ai||"balanced")]?.id||MODEL} memCtx={businessMemory.context()} onCredit={(cost)=>{ if((user?.credits||0)<cost){ setNoCreditsFor({action:"advisor",cost}); return false; } setUser(u=>({...u,credits:Math.max(0,(u?.credits||0)-cost)})); return true; }} onRoute={(v,seed)=>{ if(v==="builder"){ setView("builder"); setPhase("idle"); if(seed){setPrompt(seed); setTimeout(()=>generate(seed),80);} } else { if(seed)setPrompt(seed); setView(v); } }}/>
        ):view==="images"?(
          <ImageStudio userPlan={user?.plan||"free"} model={AI_TIERS[(user?.plan==="pro"||user?.plan==="business")?"power":(planData?.ai||"balanced")]?.id||MODEL} memCtx={businessMemory.context()} onCredit={(cost)=>{ if((user?.credits||0)<cost){ setNoCreditsFor({action:"advisor",cost}); return false; } setUser(u=>({...u,credits:Math.max(0,(u?.credits||0)-cost)})); return true; }}/>
        ):view==="dashboard"?(
          <DashboardHome user={user} projects={projects} onGo={(v)=>{ if(v==="builder"){setView("builder");setPhase("idle");setResult(null);setLiveCode(null);setPrompt("");} else setView(v); }} onOpen={openProject} onDelete={id=>setProjects(prev=>prev.filter(p=>p.id!==id))}/>
        ):view==="marketplace"?(
          <div style={{flex:1,overflow:"auto",background:T.surfaceAlt}}>
            <div style={{maxWidth:1140,margin:"0 auto",padding:isWide?"32px 36px":"24px 18px"}}>
              <div style={{marginBottom:6}}><div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.03em"}}>Marketplace d'agents</div><div style={{fontSize:14,color:T.inkSoft,marginTop:4,lineHeight:1.55}}>{MARKETPLACE_AGENTS.length} agents spécialisés pour chaque secteur africain</div></div>
              <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isWide?280:160}px,1fr))`,gap:14,marginTop:22}}>
                {MARKETPLACE_AGENTS.map(a=>(
                  <div key={a.id} style={{background:T.surface,border:`1px solid ${selectedAgent?.id===a.id?T.indigo:T.line}`,borderRadius:16,overflow:"hidden",transition:TRANS}} onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 8px 28px rgba(11,14,24,0.1)";e.currentTarget.style.transform="translateY(-2px)"}} onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)"}}>
                    <div style={{height:70,background:`linear-gradient(135deg,${a.color}14,${a.color}06)`,display:"flex",alignItems:"center",padding:"0 18px",gap:13}}>
                      <div style={{width:42,height:42,borderRadius:12,background:a.color+"1F",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{a.icon}</div>
                      <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div><div style={{fontSize:11,color:T.inkFaint}}>{a.category}</div></div>
                      {a.price===0?<Badge color={T.green} soft={T.greenSoft}>Gratuit</Badge>:<span style={{fontSize:12,fontWeight:700,color:a.color}}>{fmt(a.price)} F</span>}
                    </div>
                    <div style={{padding:"13px 16px"}}>
                      <div style={{fontSize:12,color:T.inkSoft,lineHeight:1.6,marginBottom:11,minHeight:38}}>{a.description}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,fontSize:11,color:T.inkFaint}}><span style={{color:T.gold}}>* {a.rating}</span><span>·</span><span>{fmt(a.downloads)} usages</span></div>
                      <button onClick={()=>{setSelectedAgent(a);setView("builder");}} style={{width:"100%",padding:"9px",background:selectedAgent?.id===a.id?T.indigoSoft:T.ink,color:selectedAgent?.id===a.id?T.indigo:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FONT_DISPLAY}}>{selectedAgent?.id===a.id?"Sélectionné v":"Utiliser cet agent"}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ):view==="business_memory"?(
          <div style={{flex:1,overflow:"auto",padding:isWide?"32px 36px":"24px 18px",background:T.surfaceAlt}}>
            <div style={{maxWidth:680,margin:"0 auto"}}>
              <div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.03em",marginBottom:5}}>Mon Entreprise</div>
              <div style={{fontSize:13,color:T.inkSoft,marginBottom:8}}>Plus Jenga connait ton activite, plus ses conseils et ses generations sont precis et personnalises.</div>
              <div style={{fontSize:13,color:T.indigo,background:T.indigoSoft,borderRadius:12,padding:"10px 14px",marginBottom:22,display:"flex",alignItems:"center",gap:8}}><Icon name="spark" size={15}/>Ces infos sont injectees automatiquement dans tes Directeurs IA, ton analyse Expert et tes generations.</div>
              <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24}}>
                {[
                  ["activite","Ton activite","Ex: Boutique de vetements wax et accessoires"],
                  ["ville","Ville et pays","Ex: Cotonou, Benin"],
                  ["cible","Tes clients cibles","Ex: Femmes 25-45 ans, classe moyenne"],
                  ["objectif","Ton objectif principal","Ex: Doubler mes ventes en 6 mois"],
                  ["budget","Ton budget mensuel","Ex: 50 000 FCFA pour le marketing"],
                ].map(([field,label,ph])=>(
                  <div key={field} style={{marginBottom:18}}>
                    <label style={{fontSize:13,fontWeight:700,color:T.ink,display:"block",marginBottom:6}}>{label}</label>
                    <input defaultValue={bizMem[field]||""} placeholder={ph} onBlur={e=>{businessMemory.setField(field,e.target.value);refreshBizMem();}} style={{width:"100%",padding:"12px 15px",background:T.surfaceAlt,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:13,color:T.ink,outline:"none",fontFamily:FONT,boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=T.indigo} onBlurCapture={e=>e.target.style.borderColor=T.line}/>
                  </div>
                ))}
              </div>
              {(bizMem.faits||[]).length>0&&(
                <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24,marginTop:16}}>
                  <div style={{fontSize:13,fontWeight:800,color:T.ink,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.05em"}}>Ce que Jenga a retenu</div>
                  {bizMem.faits.map((f,i)=>(
                    <div key={i} style={{fontSize:13,color:T.inkSoft,lineHeight:1.6,marginBottom:7,paddingLeft:16,position:"relative"}}><span style={{position:"absolute",left:0,color:T.gold}}>*</span>{f}</div>
                  ))}
                </div>
              )}
              {(bizMem.projets||[]).length>0&&(
                <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24,marginTop:16}}>
                  <div style={{fontSize:13,fontWeight:800,color:T.ink,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.05em"}}>Tes projets crees ({bizMem.projets.length})</div>
                  {bizMem.projets.slice(0,8).map((p,i)=>(
                    <div key={i} style={{fontSize:13,color:T.inkSoft,lineHeight:1.5,marginBottom:8,display:"flex",justifyContent:"space-between",gap:10}}>
                      <span style={{fontWeight:600,color:T.ink}}>{p.title}</span>
                      <span style={{fontSize:11,color:T.inkFaint,flexShrink:0}}>{new Date(p.at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={()=>{if(confirm("Effacer toute la memoire business ?")){businessMemory.save({activite:"",ville:"",objectif:"",budget:"",cible:"",projets:[],faits:[]});refreshBizMem();}}} style={{marginTop:16,padding:"10px 16px",background:"transparent",border:`1px solid ${T.line}`,borderRadius:10,color:T.inkFaint,fontSize:13,cursor:"pointer"}}>Effacer la memoire</button>
            </div>
          </div>
        ):view==="advisors"?(
          <div style={{flex:1,overflow:"auto",padding:isWide?"32px 36px":"24px 18px",background:T.surfaceAlt}}>
            <div style={{maxWidth:780,margin:"0 auto"}}>
              {!advisor?(<>
                <div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,marginBottom:5,letterSpacing:"-0.03em"}}>Votre comité de direction</div>
                <div style={{fontSize:14,color:T.inkSoft,marginBottom:24,lineHeight:1.55}}>Six directeurs experts, disponibles à tout moment pour piloter votre entreprise. Chaque consultation coûte 1 crédit.</div>
                <div className="ab-stagger" style={{display:"grid",gridTemplateColumns:isWide?"repeat(2,1fr)":"1fr",gap:16}}>
                  {BUSINESS_AGENTS.map(a=>(
                    <button key={a.id} onClick={()=>{setAdvisor(a);setAdvisorChat([]);}} style={{textAlign:"left",background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24,cursor:"pointer",transition:TRANS,display:"flex",gap:16,alignItems:"flex-start",boxShadow:T.shadowSm,position:"relative",overflow:"hidden"}}
                      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=T.shadowLg;}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadowSm;}}>
                      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${a.color},${a.color}66)`}}/>
                      <div style={{position:"relative",flexShrink:0}}>
                        <div style={{width:54,height:54,borderRadius:16,background:`linear-gradient(145deg,${a.color},${a.color}D0)`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,fontFamily:FONT_DISPLAY,boxShadow:`0 6px 16px ${a.color}40`,border:`1px solid ${a.color}`}}>{a.letter}</div>
                        <div style={{position:"absolute",bottom:-2,right:-2,width:14,height:14,borderRadius:"50%",background:T.green,border:`2.5px solid ${T.surface}`}}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:5}}>
                          <span style={{fontSize:16,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.01em"}}>{a.name}</span>
                          <span style={{fontSize:10,fontWeight:700,color:a.color,background:a.color+"15",padding:"3px 10px",borderRadius:20,letterSpacing:"0.02em"}}>{a.tag}</span>
                        </div>
                        <div style={{fontSize:13,color:T.inkSoft,lineHeight:1.6}}>{a.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>):(<>
                {/* Chat avec l'agent */}
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
                  <button onClick={()=>{setAdvisor(null);setAdvisorChat([]);}} style={{width:36,height:36,borderRadius:10,background:T.surface,border:`1px solid ${T.line}`,cursor:"pointer",color:T.inkSoft,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="x" size={15}/></button>
                  <div style={{width:42,height:42,borderRadius:10,background:advisor.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,fontFamily:FONT_DISPLAY}}>{advisor.letter}</div>
                  <div><div style={{fontSize:16,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>{advisor.name}</div><div style={{fontSize:12,color:advisor.color,fontWeight:600}}>{advisor.tag}</div></div>
                </div>
                <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,minHeight:340,maxHeight:480,overflow:"auto",padding:"18px 20px",marginBottom:14,display:"flex",flexDirection:"column",gap:14}}>
                  {advisorChat.length===0&&(
                    <div style={{textAlign:"center",color:T.inkFaint,fontSize:13,padding:"40px 20px"}}>
                      <div style={{fontSize:14,fontWeight:600,color:T.inkSoft,marginBottom:6}}>Pose ta question a ton {advisor.name}</div>
                      <div style={{fontStyle:"italic"}}>{advisor.placeholder}</div>
                    </div>
                  )}
                  {advisorChat.map((m,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                      <div style={{maxWidth:"86%",padding:"12px 15px",borderRadius:m.role==="user"?"16px 16px 5px 16px":"16px 16px 16px 5px",background:m.role==="user"?T.indigo:T.surfaceAlt,color:m.role==="user"?"#fff":T.ink,fontSize:13,lineHeight:1.65,whiteSpace:"pre-wrap"}}>{m.text}</div>
                    </div>
                  ))}
                  {advisorBusy&&<div style={{display:"flex",gap:6,alignItems:"center",color:T.inkFaint,fontSize:13}}><div style={{width:14,height:14,border:`2px solid ${advisor.color}44`,borderTopColor:advisor.color,borderRadius:"50%",animation:"abspin .8s linear infinite"}}/>{advisor.name} reflechit...</div>}
                </div>
                <div style={{display:"flex",gap:10}}>
                  <input value={advisorInput} onChange={e=>setAdvisorInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();askAdvisor();}}} placeholder={advisor.placeholder} style={{flex:1,padding:"13px 16px",background:T.surface,border:`1px solid ${T.line}`,borderRadius:12,fontSize:13,color:T.ink,outline:"none",fontFamily:FONT}}/>
                  <button onClick={askAdvisor} disabled={advisorBusy||!advisorInput.trim()} style={{padding:"0 22px",background:advisorInput.trim()?advisor.color:T.line,color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:advisorInput.trim()&&!advisorBusy?"pointer":"not-allowed",fontFamily:FONT_DISPLAY}}>Envoyer</button>
                </div>
                <div style={{fontSize:11,color:T.inkFaint,textAlign:"center",marginTop:8}}>Chaque reponse coute 1 credit · {user?.credits||0} credits restants</div>
              </>)}
            </div>
          </div>
        ):view==="support"?(
          <div style={{flex:1,overflow:"auto",padding:isWide?"32px 36px":"24px 18px",background:T.surfaceAlt}}>
            <div style={{maxWidth:720,margin:"0 auto"}}>
              <div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,marginBottom:5,letterSpacing:"-0.03em"}}>Aide & Support</div>
              <div style={{fontSize:14,color:T.inkSoft,marginBottom:22,lineHeight:1.55}}>Notre assistant répond à tes questions 24h/24. Pour une plainte ou un cas urgent, contacte directement notre équipe.</div>

              {/* Contact direct — comme les grandes entreprises */}
              <div className="ab-stagger" style={{display:"grid",gridTemplateColumns:isWide?"repeat(3,1fr)":"1fr",gap:12,marginBottom:24}}>
                <a href={"tel:"+COMPANY_INFO.tel.replace(/\s/g,"")} style={{textDecoration:"none",background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:"18px 20px",display:"flex",alignItems:"center",gap:13,boxShadow:T.shadowSm,transition:TRANS}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=T.shadowLg;}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadowSm;}}>
                  <div style={{width:44,height:44,borderRadius:12,background:T.indigoSoft,color:T.indigo,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="phone" size={21}/></div>
                  <div><div style={{fontSize:13,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>Nous appeler</div><div style={{fontSize:12,color:T.inkSoft,marginTop:1}}>{COMPANY_INFO.tel}</div></div>
                </a>
                <a href={"https://wa.me/22961312845?text=Bonjour%20JENGA%20Support%2C%20j'ai%20besoin%20d'aide"} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:"18px 20px",display:"flex",alignItems:"center",gap:13,boxShadow:T.shadowSm,transition:TRANS}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=T.shadowLg;}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadowSm;}}>
                  <div style={{width:44,height:44,borderRadius:12,background:"#E7F8EF",color:"#15A05A",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="comments" size={21}/></div>
                  <div><div style={{fontSize:13,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>WhatsApp</div><div style={{fontSize:12,color:T.inkSoft,marginTop:1}}>Réponse rapide</div></div>
                </a>
                <a href={"mailto:"+COMPANY_INFO.email} style={{textDecoration:"none",background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:"18px 20px",display:"flex",alignItems:"center",gap:13,boxShadow:T.shadowSm,transition:TRANS}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=T.shadowLg;}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadowSm;}}>
                  <div style={{width:44,height:44,borderRadius:12,background:T.goldSoft,color:T.goldDeep,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="mail" size={21}/></div>
                  <div><div style={{fontSize:13,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>Email</div><div style={{fontSize:12,color:T.inkSoft,marginTop:1,wordBreak:"break-all"}}>{COMPANY_INFO.email}</div></div>
                </a>
              </div>

              {/* Assistant Support IA */}
              <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,overflow:"hidden",boxShadow:T.shadowMd}}>
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",borderBottom:`1px solid ${T.line}`,background:`linear-gradient(135deg,${T.indigo},${T.indigoDeep})`}}>
                  <div style={{width:40,height:40,borderRadius:10,background:"rgba(255,255,255,0.18)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="comments" size={20}/></div>
                  <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:"#fff",fontFamily:FONT_DISPLAY}}>Assistant Jenga</div><div style={{fontSize:11,color:"#CAD3F0",display:"flex",alignItems:"center",gap:6}}><span style={{width:7,height:7,borderRadius:"50%",background:"#4ADE80",display:"inline-block"}}/>En ligne · gratuit</div></div>
                </div>
                <div style={{minHeight:300,maxHeight:430,overflow:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:13}}>
                  {supportChat.length===0&&(
                    <div style={{textAlign:"center",color:T.inkFaint,padding:"30px 16px"}}>
                      <div style={{fontSize:14,fontWeight:700,color:T.inkSoft,marginBottom:8,fontFamily:FONT_DISPLAY}}>Comment pouvons-nous t'aider ?</div>
                      <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:380,margin:"14px auto 0"}}>
                        {["Comment créer ma première application ?","Comment fonctionnent les crédits ?","J'ai un problème de paiement","Mes données sont-elles protégées ?"].map((q,i)=>(
                          <button key={i} onClick={()=>{setSupportInput(q);setTimeout(()=>askSupport(),50);}} style={{textAlign:"left",padding:"11px 15px",background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,fontSize:13,color:T.ink,cursor:"pointer",fontFamily:FONT,transition:TRANS}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.indigo} onMouseLeave={e=>e.currentTarget.style.borderColor=T.line}>{q}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {supportChat.map((m,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                      <div style={{maxWidth:"86%",padding:"12px 15px",borderRadius:m.role==="user"?"16px 16px 5px 16px":"16px 16px 16px 5px",background:m.role==="user"?T.indigo:T.surfaceAlt,color:m.role==="user"?"#fff":T.ink,fontSize:13,lineHeight:1.65,whiteSpace:"pre-wrap"}}>{m.role==="bot"?<FadeWords text={m.text} animate={i===supportChat.length-1}/>:m.text}</div>
                    </div>
                  ))}
                  {supportBusy&&<div style={{display:"flex",gap:7,alignItems:"center",color:T.inkFaint,fontSize:13}}><div style={{width:14,height:14,border:`2px solid ${T.indigo}44`,borderTopColor:T.indigo,borderRadius:"50%",animation:"abspin .8s linear infinite"}}/>L'assistant écrit…</div>}
                </div>
                <div style={{display:"flex",gap:10,padding:"14px 18px",borderTop:`1px solid ${T.line}`}}>
                  <input value={supportInput} onChange={e=>setSupportInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")askSupport();}} placeholder="Écris ta question ou ta plainte…" style={{flex:1,padding:"12px 15px",background:T.surfaceAlt,border:`1.5px solid ${T.line}`,borderRadius:10,fontSize:14,color:T.ink,outline:"none",fontFamily:FONT}} onFocus={e=>{e.target.style.borderColor=T.indigo;e.target.style.boxShadow=`0 0 0 3px ${T.indigoSoft}`;}} onBlur={e=>{e.target.style.borderColor=T.line;e.target.style.boxShadow="none";}}/>
                  <button onClick={askSupport} disabled={supportBusy||!supportInput.trim()} style={{padding:"0 20px",background:supportBusy||!supportInput.trim()?T.line:T.ink,color:supportBusy||!supportInput.trim()?T.inkFaint:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:supportBusy||!supportInput.trim()?"not-allowed":"pointer",fontFamily:FONT_DISPLAY}}>Envoyer</button>
                </div>
              </div>
              <div style={{fontSize:11,color:T.inkFaint,textAlign:"center",marginTop:14,lineHeight:1.5}}>Notre assistant répond aux questions courantes. Pour les plaintes, remboursements ou cas complexes, contacte directement notre équipe par WhatsApp ou appel.</div>
            </div>
          </div>
        ):view==="community_feed"?(
          <div style={{flex:1,overflow:"auto",padding:isWide?"32px 36px":"24px 18px",background:T.surfaceAlt}}>
            <div style={{maxWidth:720,margin:"0 auto"}}>
              <div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.03em",marginBottom:5}}>Communauté Jenga</div>
              <div style={{fontSize:13,color:T.inkSoft,marginBottom:22}}>Apps créées par la communauté. Inspire-toi, partage la tienne.</div>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {[
                  {user:"Kofi M.",city:"Accra",app:"Boutique Kente Digital",desc:"Vente de tissus kente avec paiement MTN Mobile Money",stack:["React","Firebase"],likes:34,icon:"",color:"#CAA546"},
                  {user:"Fatou D.",city:"Dakar",app:"Tontine Familiale",desc:"Gestion de tontine 15 membres, historique FCFA complet",stack:["Vue","Supabase"],likes:28,icon:"",color:"#15A05A"},
                  {user:"Jean-Paul A.",city:"Cotonou",app:"Clinique Akpakpa",desc:"Dossiers patients, rendez-vous et ordonnances",stack:["React","Node"],likes:21,icon:"",color:"#E5484D"},
                  {user:"Amina T.",city:"Abidjan",app:"Livraison Express",desc:"App de livraison avec suivi temps réel et paiement Wave",stack:["React Native"],likes:19,icon:"",color:"#1C3293"},
                  {user:"Ibrahim B.",city:"Lagos",app:"Marché Agricole",desc:"Marketplace agriculteurs B2C avec notation vendeurs",stack:["React","Postgres"],likes:15,icon:"",color:"#059669"},
                ].map((item,i)=>(
                  <div key={i} style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24,display:"flex",gap:16,alignItems:"flex-start"}}>
                    <div style={{width:48,height:48,borderRadius:16,background:item.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{item.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                        <div style={{fontSize:16,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>{item.app}</div>
                        <div style={{fontSize:11,color:T.inkFaint}}>par {item.user} · {item.city}</div>
                      </div>
                      <div style={{fontSize:13,color:T.inkSoft,marginBottom:10}}>{item.desc}</div>
                      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                        {item.stack.map(s=><span key={s} style={{padding:"3px 9px",background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:20,fontSize:11,color:T.inkSoft}}>{s}</span>)}
                        <div style={{flex:1}}/>
                        <button onClick={()=>{setPrompt(item.desc);setView("builder");}} style={{padding:"7px 14px",background:T.indigoSoft,border:`1px solid ${T.indigo}33`,borderRadius:10,color:T.indigo,cursor:"pointer",fontSize:13,fontWeight:700}}>Générer similaire</button>
                        <span style={{fontSize:13,color:T.inkFaint,fontWeight:600}}> {item.likes}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{textAlign:"center",padding:"18px",fontSize:13,color:T.inkFaint,background:T.surface,borderRadius:16,border:`1px dashed ${T.line}`}}>
                   Partage ta création avec la communauté — contacte-nous sur WhatsApp !
                </div>
              </div>
            </div>
          </div>
        ):view==="payments"?(
          <div style={{flex:1,overflow:"auto",background:T.surfaceAlt}}>
            <div style={{maxWidth:820,margin:"0 auto",padding:isWide?"32px 36px":"24px 18px"}}>
              <div style={{marginBottom:6}}><div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.03em"}}>Paiements & facturation</div><div style={{fontSize:14,color:T.inkSoft,marginTop:4,lineHeight:1.55}}>Gère ton abonnement, tes crédits et tes moyens de paiement.</div></div>
              <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24,marginTop:22,marginBottom:18}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
                  <div style={{fontSize:16,fontWeight:700,color:T.ink,fontFamily:FONT_DISPLAY}}>Abonnement actuel</div>
                  <button onClick={()=>setShowPricing(true)} style={{padding:"8px 16px",background:T.ink,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer"}}>Changer de plan</button>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:180}}><div style={{fontSize:20,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>Plan {planData.name}</div><div style={{fontSize:14,color:T.inkSoft,marginTop:4,lineHeight:1.55}}>{user.credits} crédits restants</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:24,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>{fmt(planData.price)} F</div><div style={{fontSize:12,color:T.inkFaint}}>par mois</div></div>
                </div>
              </div>
              <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24,marginTop:22,marginBottom:18}}>
                <div style={{fontSize:16,fontWeight:700,color:T.ink,marginBottom:6,fontFamily:FONT_DISPLAY,display:"flex",alignItems:"center",gap:9}}><Icon name="shield" size={18}/>Sécurité & accès</div>
                <div style={{fontSize:13,color:T.inkSoft,marginBottom:18}}>Protège ton compte et contrôle qui accède à quoi dans ton entreprise.</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:T.surfaceAlt,borderRadius:10,marginBottom:10,gap:12,flexWrap:"wrap"}}>
                  <div><div style={{fontSize:13,fontWeight:700,color:T.ink}}>Authentification à deux facteurs (2FA)</div><div style={{fontSize:12,color:T.inkFaint,marginTop:2}}>Une couche de protection supplémentaire à la connexion.</div></div>
                  <button onClick={()=>{ if(!backend.enabled()){ alert("La 2FA s'active une fois le serveur Jenga connecté. Ton développeur l'activera côté backend."); return;} setUser(u=>({...u,twoFactor:!u?.twoFactor})); }} style={{padding:"8px 16px",background:user?.twoFactor?T.greenSoft:T.surface,border:`1.5px solid ${user?.twoFactor?T.green:T.line}`,borderRadius:10,fontSize:13,fontWeight:700,color:user?.twoFactor?T.green:T.inkSoft,cursor:"pointer",whiteSpace:"nowrap"}}>{user?.twoFactor?"Activée":"Activer"}</button>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:T.surfaceAlt,borderRadius:10,gap:12,flexWrap:"wrap"}}>
                  <div><div style={{fontSize:13,fontWeight:700,color:T.ink}}>Ton rôle</div><div style={{fontSize:12,color:T.inkFaint,marginTop:2}}>Définit les sections accessibles. Géré par le propriétaire.</div></div>
                  <span style={{padding:"6px 14px",background:T.indigoSoft,color:T.indigo,borderRadius:20,fontSize:13,fontWeight:700}}>{ROLES[user?.role||"owner"]?.label||"Propriétaire"}</span>
                </div>
                <div style={{marginTop:14,fontSize:11,color:T.inkFaint,lineHeight:1.55,display:"flex",gap:8,alignItems:"flex-start"}}><span style={{color:T.gold,flexShrink:0}}>•</span>Les rôles (Directeur, Comptable, RH, Commercial) donnent des accès différents. La gestion fine des équipes et la sécurité complète s'activent avec le serveur Jenga.</div>
              </div>
              <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24,marginBottom:18}}>
                <div style={{fontSize:16,fontWeight:700,color:T.ink,marginBottom:16,fontFamily:FONT_DISPLAY}}>Passerelles disponibles</div>
                {[["CinetPay","Côte d'Ivoire · Sénégal · Mali · Cameroun","",T.indigo],["Flutterwave","Nigeria · Ghana · Kenya · +30 pays","","#EA580C"],["Kkiapay","Bénin · Togo · Afrique de l'Ouest","","#8B5CF6"],["Mobile Money","MTN · Orange · Wave · M-Pesa","",T.green],["Visa / Mastercard","International","",T.ink]].map(([n,r,f,c])=>(
                  <div key={n} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 15px",background:T.surfaceAlt,borderRadius:10,marginBottom:9}}>
                    <span style={{fontSize:20}}>{f}</span>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:c}}>{n}</div><div style={{fontSize:11,color:T.inkFaint,marginTop:1}}>{r}</div></div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:7,height:7,borderRadius:"50%",background:T.green}}/><span style={{fontSize:12,color:T.green,fontWeight:600}}>Actif</span></div>
                  </div>
                ))}
              </div>
              <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24,marginBottom:18}}>
                <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:6}}><div style={{fontSize:16,fontWeight:700,color:T.ink,fontFamily:FONT_DISPLAY}}>Recharger en crédits d'apps</div><span style={{fontSize:12,color:T.green,fontWeight:600}}>Plus tu prends, moins c'est cher · n'expirent jamais</span></div>
                <div style={{fontSize:13,color:T.inkSoft,marginBottom:16}}>1 crédit = 1 génération d'application.</div>
                <div style={{display:"grid",gridTemplateColumns:isWide?"repeat(3,1fr)":"1fr",gap:12}}>
                  {CREDIT_PACKS.map(pk=><div key={pk.credits} style={{padding:18,background:pk.best?T.indigoSoft:T.surfaceAlt,border:`1.5px solid ${pk.best?T.indigo:pk.popular?T.indigo+"66":T.line}`,borderRadius:12,cursor:"pointer",position:"relative"}}>{pk.best&&<div style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)"}}><Badge color={T.indigo} soft={T.surface}>Meilleure offre</Badge></div>}{pk.popular&&!pk.best&&<div style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)"}}><Badge color={T.green} soft={T.surface}>Populaire</Badge></div>}<div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.03em"}}>{pk.credits}</div><div style={{fontSize:12,color:T.inkFaint,marginBottom:8}}>générations</div><div style={{fontSize:16,fontWeight:700,color:T.ink}}>{fmt(pk.price)} F</div><div style={{fontSize:11,color:pk.best?T.indigo:T.inkFaint,marginTop:4,fontWeight:pk.best?700:400}}>{pk.per} F / app{pk.per<133?` · −${Math.round((1-pk.per/133)*100)}%`:""}</div></div>)}
                </div>
              </div>
              <div style={{background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:24}}>
                <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:6}}><div style={{fontSize:16,fontWeight:700,color:T.ink,fontFamily:FONT_DISPLAY}}>Recharger en crédits visuels</div><span style={{fontSize:12,color:T.green,fontWeight:600}}>Flyers, logos, photos · n'expirent jamais</span></div>
                <div style={{fontSize:13,color:T.inkSoft,marginBottom:16}}>1 visuel chez un graphiste coûte 5 000 à 15 000 FCFA. Ici, à partir de 70 F.</div>
                <div style={{display:"grid",gridTemplateColumns:isWide?"repeat(3,1fr)":"1fr",gap:12}}>
                  {VISUAL_PACKS.map(pk=><div key={pk.visuals} style={{padding:18,background:pk.best?"#FCEEFF":T.surfaceAlt,border:`1.5px solid ${pk.best?"#E879F9":pk.popular?"#E879F966":T.line}`,borderRadius:12,cursor:"pointer",position:"relative"}}>{pk.best&&<div style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)"}}><Badge color="#C026D3" soft={T.surface}>Meilleure offre</Badge></div>}{pk.popular&&!pk.best&&<div style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)"}}><Badge color={T.green} soft={T.surface}>Populaire</Badge></div>}<div style={{fontSize:28,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.03em"}}>{pk.visuals}</div><div style={{fontSize:12,color:T.inkFaint,marginBottom:8}}>visuels</div><div style={{fontSize:16,fontWeight:700,color:T.ink}}>{fmt(pk.price)} F</div><div style={{fontSize:11,color:pk.best?"#C026D3":T.inkFaint,marginTop:4,fontWeight:pk.best?700:400}}>{pk.per} F / visuel{pk.per<100?` · −${Math.round((1-pk.per/100)*100)}%`:""}</div></div>)}
                
              {/* Parrainage — gagne des crédits (comme Dropbox/Lovable) */}
              <div style={{marginTop:18,background:`linear-gradient(135deg,${T.indigoSoft},#fff)`,border:`1px solid ${T.indigo}33`,borderRadius:16,padding:24}}>
                <div style={{fontSize:16,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,marginBottom:4}}>Parraine, gagne des credits</div>
                <div style={{fontSize:13,color:T.inkSoft,marginBottom:14}}>Invite un ami : il recoit 20 credits, tu recois 20 credits a sa premiere generation.</div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:160,padding:"11px 14px",background:"#fff",border:`1.5px dashed ${T.indigo}55`,borderRadius:10,fontFamily:FONT_MONO,fontSize:14,fontWeight:700,color:T.indigo,letterSpacing:"0.05em"}}>{getReferralCode(user).code}</div>
                  <button onClick={()=>{const c=getReferralCode(user).code;const link="https://jenga.app/?ref="+c;if(navigator.share){navigator.share({title:"Jenga",text:"Cree ton app avec Jenga ! Code: "+c,url:link});}else{navigator.clipboard?.writeText(link);}}} style={{padding:"11px 18px",background:T.indigo,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT_DISPLAY}}>Partager mon lien</button>
                </div>
              </div>

              {/* Liens légaux — style grandes plateformes */}
              <div style={{marginTop:18,padding:"16px 0 4px",borderTop:`1px solid ${T.line}`}}>
                <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center"}}>
                  {[["cgu","Conditions générales"],["privacy","Confidentialité"],["community","Règles"],["security","Sécurité"],["mentions","Mentions légales"],["moderation","Modération"]].map(([k,l],i,arr)=>(
                    <span key={k} style={{display:"flex",alignItems:"center"}}>
                      <button onClick={()=>setLegalDoc(k)} style={{background:"none",border:"none",color:T.inkFaint,cursor:"pointer",fontSize:12,padding:"4px 8px",textDecoration:"underline",textUnderlineOffset:2}} onMouseEnter={e=>e.currentTarget.style.color=T.ink} onMouseLeave={e=>e.currentTarget.style.color=T.inkFaint}>{l}</button>
                      {i<arr.length-1&&<span style={{color:T.line,fontSize:11}}>·</span>}
                    </span>
                  ))}
                </div>
                <div style={{textAlign:"center",fontSize:11,color:T.inkFaint,marginTop:7}}>© {new Date().getFullYear()} JENGA by Light Company LLC</div>
              </div>
</div>
              </div>
            </div>
          </div>
        ):(
          /* BUILDER */
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
            <div style={{padding:isWide?"16px 22px":"14px 16px",background:T.surface,borderBottom:`1px solid ${T.line}`,flexShrink:0}}>
              <div style={{display:"flex",gap:8,marginBottom:11,flexWrap:"wrap",alignItems:"center"}}>
                <div style={{display:"flex",background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,overflow:"hidden"}}>
                  {[["frontend","Web"],["fullstack","Full-Stack"],["mobile","Mobile"]].map(([m,l])=><button key={m} onClick={()=>setGenMode(m)} style={{padding:"7px 14px",background:genMode===m?T.ink:"transparent",color:genMode===m?"#fff":T.inkSoft,border:"none",cursor:"pointer",fontSize:13,fontWeight:genMode===m?700:500}}>{l}</button>)}
                </div>
                <ModelPicker models={AI_MODELS} selected={selectedModel} onSelect={setSelectedModel} userPlan={planData?.id||"free"} onUpgrade={()=>setShowPricing(true)} compact/>
                {selectedAgent&&<div style={{display:"flex",alignItems:"center",gap:7,padding:"6px 12px",background:T.indigoSoft,border:`1px solid ${T.indigo}33`,borderRadius:10,fontSize:13,color:T.indigo}}><span>{selectedAgent.icon}</span><span style={{fontWeight:700}}>{selectedAgent.name}</span><button onClick={()=>setSelectedAgent(null)} style={{background:"none",border:"none",color:T.indigo,cursor:"pointer",display:"flex",padding:0,marginLeft:2}}><Icon name="x" size={13}/></button></div>}
              </div>
              {originalVoice&&<div style={{display:"flex",alignItems:"center",gap:9,padding:"8px 13px",background:T.greenSoft,border:`1px solid ${T.green}33`,borderRadius:10,marginBottom:9,fontSize:13}}><span style={{fontSize:16}}>{AFRICAN_LANGUAGES.find(l=>l.code===voiceLang)?.flag}</span><span style={{color:T.inkSoft}}>Dicté :</span><span style={{color:T.green,fontStyle:"italic",flex:1}}>"{originalVoice}"</span><button onClick={()=>setOriginalVoice("")} style={{background:"none",border:"none",color:T.inkFaint,cursor:"pointer",display:"flex"}}><Icon name="x" size={13}/></button></div>}
              <div style={{fontSize:11,fontWeight:600,color:T.inkFaint,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:8}}>
                Décris ton application
                {(user?.credits||0)<=3&&(user?.credits||0)>0&&<span style={{marginLeft:10,color:T.gold,textTransform:"none",letterSpacing:0}}>· {user.credits} crédit{user.credits>1?"s":""} restant{user.credits>1?"s":""}</span>}
                {(user?.credits||0)===0&&<span style={{marginLeft:10,color:T.red,textTransform:"none",letterSpacing:0}}>· Plus de crédits — <button onClick={()=>setShowPricing(true)} style={{background:"none",border:"none",color:T.indigo,cursor:"pointer",fontSize:11,fontWeight:700,textDecoration:"underline",padding:0}}>Recharger</button></span>}
                {autoFixing&&<span style={{marginLeft:10,color:T.indigo,textTransform:"none",letterSpacing:0}}>· Correction auto…</span>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:11,flexWrap:"wrap"}}>
                <div style={{display:"flex",background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,padding:3}}>
                  <button onClick={()=>{setExpertMode(false);setAnalysis(null);}} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FONT_DISPLAY,background:!expertMode?T.ink:"transparent",color:!expertMode?"#fff":T.inkSoft,transition:TRANS}}>Mode rapide</button>
                  <button onClick={()=>setExpertMode(true)} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FONT_DISPLAY,background:expertMode?T.indigo:"transparent",color:expertMode?"#fff":T.inkSoft,transition:TRANS}}>Mode expert</button>
                </div>
                <span style={{fontSize:12,color:T.inkFaint}}>{expertMode?"Jenga analyse ton projet avant de generer":"Clique, Jenga genere immediatement"}</span>
              </div>
              {expertMode&&analysis&&!analysis.error&&(
                <div style={{marginBottom:13,background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:"18px 20px"}}>
                  <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                    {[["Marche",analysis.scores?.marche],["Rentabilite",analysis.scores?.rentabilite],["Croissance",analysis.scores?.croissance],["Global",analysis.scores?.global]].map(([l,v])=>(
                      <div key={l} style={{flex:1,minWidth:70,textAlign:"center",padding:"10px 8px",background:T.surfaceAlt,borderRadius:10}}>
                        <div style={{fontSize:20,fontWeight:800,fontFamily:FONT_DISPLAY,color:(v||0)>=70?T.green:(v||0)>=45?T.gold:T.red}}>{v||0}</div>
                        <div style={{fontSize:10,color:T.inkFaint,marginTop:2}}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:isWide?"1fr 1fr":"1fr",gap:12,marginBottom:14}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:800,color:T.red,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Risques</div>
                      {(analysis.risques||[]).map((r,i)=><div key={i} style={{fontSize:13,color:T.inkSoft,lineHeight:1.5,marginBottom:5,paddingLeft:12,position:"relative"}}><span style={{position:"absolute",left:0,color:T.red}}>-</span>{r}</div>)}
                    </div>
                    <div>
                      <div style={{fontSize:12,fontWeight:800,color:T.green,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Opportunites</div>
                      {(analysis.opportunites||[]).map((o,i)=><div key={i} style={{fontSize:13,color:T.inkSoft,lineHeight:1.5,marginBottom:5,paddingLeft:12,position:"relative"}}><span style={{position:"absolute",left:0,color:T.green}}>+</span>{o}</div>)}
                    </div>
                  </div>
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:800,color:T.indigo,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Ameliorations recommandees</div>
                    {(analysis.ameliorations||[]).map((a,i)=><div key={i} style={{fontSize:13,color:T.inkSoft,lineHeight:1.5,marginBottom:5,paddingLeft:12,position:"relative"}}><span style={{position:"absolute",left:0,color:T.indigo}}>{i+1}</span>{a}</div>)}
                  </div>
                  {analysis.versionAmelioree&&(
                    <button onClick={()=>{setPrompt(analysis.versionAmelioree);setAnalysis(null);setTimeout(()=>generate(analysis.versionAmelioree),60);}} style={{width:"100%",padding:"12px",background:`linear-gradient(135deg,${T.indigo},${T.indigoDeep})`,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT_DISPLAY,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Icon name="spark" size={15}/>Generer la version amelioree</button>
                  )}
                </div>
              )}
              {expertMode&&analysis?.error&&<div style={{marginBottom:13,padding:"12px 15px",background:"#FEF1F1",border:`1px solid ${T.red}33`,borderRadius:10,fontSize:13,color:T.red}}>Analyse impossible : {analysis.error}</div>}
              <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
                <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey))generate();}} placeholder={AFRICAN_LANGUAGES.find(l=>l.code===voiceLang)?.hint||"Ex : un système de tontine avec 12 membres et paiement Mobile Money…"} rows={3} style={{flex:1,background:T.surfaceAlt,border:`1.5px solid ${T.line}`,borderRadius:12,padding:"12px 15px",color:T.ink,fontSize:14,resize:"none",outline:"none",lineHeight:1.6,fontFamily:FONT,transition:TRANS}} onFocus={e=>{e.target.style.borderColor=T.indigo;e.target.style.boxShadow=`0 0 0 3px ${T.indigoSoft}`;}} onBlur={e=>{e.target.style.borderColor=T.line;e.target.style.boxShadow="none";}}/>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {expertMode&&<button onClick={()=>runAnalysis()} disabled={analyzing||!prompt.trim()} style={{padding:"0 18px",height:52,background:analyzing||!prompt.trim()?T.line:T.indigoSoft,color:analyzing||!prompt.trim()?T.inkFaint:T.indigo,border:`1.5px solid ${analyzing||!prompt.trim()?T.line:T.indigo}`,borderRadius:12,fontSize:13,fontWeight:700,cursor:analyzing||!prompt.trim()?"not-allowed":"pointer",whiteSpace:"nowrap",fontFamily:FONT_DISPLAY,display:"flex",alignItems:"center",gap:7}}>{analyzing?"Analyse…":<><Icon name="search" size={15}/>Analyser</>}</button>}
                  <button onClick={()=>generate()} disabled={phase==="generating"||!prompt.trim()||(user?.credits||0)===0} style={{padding:"0 22px",height:52,background:phase==="generating"||(user?.credits||0)===0?T.line:T.ink,color:phase==="generating"||(user?.credits||0)===0?T.inkFaint:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:phase==="generating"||(user?.credits||0)===0?"not-allowed":"pointer",whiteSpace:"nowrap",fontFamily:FONT_DISPLAY,display:"flex",alignItems:"center",gap:8,boxShadow:phase==="generating"||(user?.credits||0)===0?"none":T.shadowMd,transition:TRANS}} onMouseEnter={e=>{if(!(phase==="generating"||(user?.credits||0)===0))e.currentTarget.style.transform="translateY(-1px)"}} onMouseLeave={e=>e.currentTarget.style.transform="none"}>{phase==="generating"?"Génération…":<><Icon name="spark" size={16}/>Générer</>}</button>
                  {!isWide?null:<VoiceButton compact currentLang={voiceLang} onLangChange={setVoiceLang} onTranslating={setVoiceTranslating} onTranscript={(tr,or,lg)=>{setPrompt(tr);setOriginalVoice(lg!=="fr"&&lg!=="en"?or:"");}}/>}
                </div>
              </div>
              {phase==="generating"&&<div style={{marginTop:11}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12,color:T.inkSoft,fontWeight:500}}>{AGENTS.find(a=>activeAgents.includes(a.id))?.label||"Initialisation"}…</span><span style={{fontSize:12,color:T.inkFaint}}>{progress}%</span></div><div style={{height:4,background:T.line,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:`linear-gradient(90deg,${T.indigo},${T.gold})`,borderRadius:3,width:`${progress}%`,transition:"width .5s ease"}}/></div></div>}
            </div>
            <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
              {phase==="idle"&&(
                <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:22,padding:isWide?48:24,animation:"abfade .5s ease"}}>
                  <Logo size={56}/>
                  <div style={{textAlign:"center"}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"6px 14px",background:T.indigoSoft,borderRadius:30,marginBottom:16}}>
                      <span style={{width:7,height:7,borderRadius:"50%",background:T.indigo,display:"inline-block"}}/>
                      <span style={{fontSize:12,fontWeight:700,color:T.indigo,letterSpacing:"0.04em"}}>BUILD STUDIO · APPS & SITES WEB</span>
                    </div>
                    <div style={{fontSize:isWide?34:26,fontWeight:800,color:T.ink,marginBottom:12,letterSpacing:"-0.035em",fontFamily:FONT_DISPLAY,lineHeight:1.12}}>Que veux-tu construire aujourd'hui ?</div><div style={{fontSize:15.5,color:T.inkSoft,maxWidth:520,lineHeight:1.55,margin:"0 auto 16px"}}>Ton département de développement. Décris ton projet — Jenga conçoit l'application complète : code, design et Mobile Money inclus.</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"7px 8px",justifyContent:"center",maxWidth:560}}>
                      {["Sites web","Applications mobiles","Boutiques en ligne","SaaS & CRM","Réservation","Livraison"].map(c=>(
                        <span key={c} style={{fontSize:12,fontWeight:600,color:T.inkSoft,background:T.surface,border:`1px solid ${T.line}`,padding:"5px 12px",borderRadius:30}}>{c}</span>
                      ))}
                    </div>
                  </div>
                  {/* GRANDE ZONE DE SAISIE — élément central façon Blink */}
                  <div style={{width:"100%",maxWidth:600,background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:20,boxShadow:T.shadowLg,padding:isWide?"20px 20px 16px":"16px 16px 14px",transition:TRANS}}>
                    <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();expertMode?runAnalysis():generate();}}} rows={isWide?3:4} placeholder="Décris ton projet. Ex : un système de tontine avec 12 membres et paiement Mobile Money…" style={{width:"100%",border:"none",outline:"none",resize:"none",fontSize:16,color:T.ink,fontFamily:FONT,lineHeight:1.6,background:"transparent",boxSizing:"border-box"}}/>
                    {/* Toggle réflexion : Rapide ou Expert */}
                    <div style={{display:"flex",alignItems:"center",gap:9,marginTop:8,flexWrap:"wrap"}}>
                      <div style={{display:"flex",background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,padding:3}}>
                        <button onClick={()=>{setExpertMode(false);setAnalysis(null);}} style={{padding:"6px 13px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12.5,fontWeight:700,fontFamily:FONT_DISPLAY,background:!expertMode?T.ink:"transparent",color:!expertMode?"#fff":T.inkSoft,transition:TRANS}}>Rapide</button>
                        <button onClick={()=>setExpertMode(true)} style={{padding:"6px 13px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12.5,fontWeight:700,fontFamily:FONT_DISPLAY,background:expertMode?T.indigo:"transparent",color:expertMode?"#fff":T.inkSoft,transition:TRANS}}>Expert</button>
                      </div>
                      <span style={{fontSize:11.5,color:T.inkFaint,flex:1,minWidth:120}}>{expertMode?"Jenga réfléchit et analyse avant de construire":"Construction immédiate"}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12,gap:12}}>
                      <div style={{fontSize:12,color:T.inkFaint}}>Code, design et Mobile Money inclus.</div>
                      <button onClick={()=>expertMode?runAnalysis():generate()} disabled={!prompt.trim()||analyzing} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 20px",background:prompt.trim()&&!analyzing?T.ink:T.line,color:prompt.trim()&&!analyzing?"#fff":T.inkFaint,border:"none",borderRadius:12,fontSize:14,fontWeight:700,cursor:prompt.trim()&&!analyzing?"pointer":"not-allowed",fontFamily:FONT_DISPLAY,transition:TRANS,whiteSpace:"nowrap"}}><Icon name={expertMode?"search":"spark"} size={16}/>{analyzing?"Analyse…":expertMode?"Analyser":"Construire"}</button>
                    </div>
                  </div>
                  {/* Résultat de la réflexion Expert, juste sous la zone de saisie */}
                  {expertMode&&analysis&&!analysis.error&&(
                    <div style={{width:"100%",maxWidth:600,background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,padding:"18px 20px"}}>
                      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                        {[["Marché",analysis.scores?.marche],["Rentabilité",analysis.scores?.rentabilite],["Croissance",analysis.scores?.croissance],["Global",analysis.scores?.global]].map(([l,v])=>(
                          <div key={l} style={{flex:1,minWidth:70,textAlign:"center",padding:"10px 8px",background:T.surfaceAlt,borderRadius:10}}>
                            <div style={{fontSize:20,fontWeight:800,fontFamily:FONT_DISPLAY,color:(v||0)>=70?T.green:(v||0)>=45?T.gold:T.red}}>{v||0}</div>
                            <div style={{fontSize:10,color:T.inkFaint,marginTop:2}}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:isWide?"1fr 1fr":"1fr",gap:12,marginBottom:14}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:800,color:T.red,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Risques</div>
                          {(analysis.risques||[]).map((r,i)=><div key={i} style={{fontSize:13,color:T.inkSoft,lineHeight:1.5,marginBottom:5,paddingLeft:12,position:"relative",textAlign:"left"}}><span style={{position:"absolute",left:0,color:T.red}}>-</span>{r}</div>)}
                        </div>
                        <div>
                          <div style={{fontSize:12,fontWeight:800,color:T.green,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Opportunités</div>
                          {(analysis.opportunites||[]).map((o,i)=><div key={i} style={{fontSize:13,color:T.inkSoft,lineHeight:1.5,marginBottom:5,paddingLeft:12,position:"relative",textAlign:"left"}}><span style={{position:"absolute",left:0,color:T.green}}>+</span>{o}</div>)}
                        </div>
                      </div>
                      {analysis.versionAmelioree&&(
                        <button onClick={()=>{setPrompt(analysis.versionAmelioree);setAnalysis(null);setTimeout(()=>generate(analysis.versionAmelioree),60);}} style={{width:"100%",padding:"12px",background:`linear-gradient(135deg,${T.indigo},${T.indigoDeep})`,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT_DISPLAY,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Icon name="spark" size={15}/>Construire la version améliorée</button>
                      )}
                    </div>
                  )}
                  {expertMode&&analysis?.error&&<div style={{width:"100%",maxWidth:600,padding:"12px 15px",background:"#FEF1F1",border:`1px solid ${T.red}33`,borderRadius:10,fontSize:13,color:T.red}}>Analyse impossible : {analysis.error}</div>}
                  <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:540}}>
                    {[["Tontine digitale","Gérer une tontine de 12 membres à Dakar avec Mobile Money"],["Boutique en ligne","Vendre des vêtements wax avec paiement Wave et livraison"],["Clinique","Suivi des patients, rendez-vous et ordonnances"]].map(([t,ex])=>(
                      <button key={t} onClick={()=>{setPrompt(ex);}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:T.surface,border:`1px solid ${T.line}`,borderRadius:12,cursor:"pointer",textAlign:"left",transition:TRANS}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.indigo+"66";e.currentTarget.style.background=T.indigoSoft;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.line;e.currentTarget.style.background=T.surface;}}>
                        <div style={{width:32,height:32,borderRadius:8,background:T.indigoSoft,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:T.indigo}}><Icon name="spark" size={15}/></div>
                        <div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:T.ink}}>{t}</div><div style={{fontSize:13,color:T.inkFaint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ex}</div></div>
                      </button>
                    ))}
                  </div>
                  {/* VITRINE — tout ce que le Build Studio peut créer (modèles avec aperçu) */}
                  <div style={{width:"100%",maxWidth:760,marginTop:10}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                      <div style={{fontSize:11,fontWeight:700,color:T.inkFaint,letterSpacing:"0.08em",textTransform:"uppercase"}}>Modèles prêts à lancer</div>
                      <div style={{fontSize:12,color:T.inkFaint}}>{STARTER_TEMPLATES.length} applications</div>
                    </div>
                    <div className="ab-stagger" style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isWide?230:150}px,1fr))`,gap:14}}>
                      {STARTER_TEMPLATES.map(t=>(
                        <button key={t.id} onClick={()=>{setPrompt(t.prompt);setTimeout(()=>generate(t.prompt),60);}} style={{textAlign:"left",background:T.surface,border:`1px solid ${T.line}`,borderRadius:16,overflow:"hidden",cursor:"pointer",transition:TRANS,boxShadow:T.shadowSm,padding:0}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=T.shadowLg;}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadowSm;}}>
                          {/* aperçu : maquette d'app stylisée */}
                          <div style={{aspectRatio:"16/10",background:`linear-gradient(135deg,${t.color},${t.color}C0)`,position:"relative",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 80% 15%, rgba(255,255,255,0.20), transparent 55%)"}}/>
                            {/* mini fenêtre d'app */}
                            <div style={{width:"72%",height:"64%",background:"rgba(255,255,255,0.95)",borderRadius:8,boxShadow:"0 8px 20px rgba(0,0,0,0.18)",overflow:"hidden",display:"flex"}}>
                              <div style={{width:"26%",background:t.color+"18",borderRight:`1px solid ${t.color}22`,padding:5,display:"flex",flexDirection:"column",gap:3}}>{[...Array(4)].map((_,i)=><div key={i} style={{height:4,background:i===0?t.color:t.color+"40",borderRadius:2}}/>)}</div>
                              <div style={{flex:1,padding:6,display:"flex",flexDirection:"column",gap:4}}>
                                <div style={{height:5,width:"55%",background:t.color,borderRadius:2}}/>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>{[...Array(4)].map((_,i)=><div key={i} style={{height:11,background:"#EEF0F6",borderRadius:3}}/>)}</div>
                              </div>
                            </div>
                            {t.popular&&<span style={{position:"absolute",top:9,right:9,fontSize:9,fontWeight:800,color:t.color,background:"#fff",padding:"3px 8px",borderRadius:20,letterSpacing:"0.03em"}}>POPULAIRE</span>}
                          </div>
                          <div style={{padding:"12px 14px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}><span style={{fontSize:14,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY,letterSpacing:"-0.01em"}}>{t.name}</span></div>
                            <div style={{fontSize:10,fontWeight:700,color:t.color,background:t.color+"15",padding:"2px 8px",borderRadius:20,display:"inline-block",marginBottom:7}}>{t.cat}</div>
                            <div style={{fontSize:12,color:T.inkSoft,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{t.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* AARON — plan d'action du jour, le copilote qui fait revenir */}
                  {(aaronPlan||aaronBusy)&&(
                    <div style={{width:"100%",maxWidth:540,marginTop:8,background:`linear-gradient(135deg,${T.indigo}0D,${T.gold}0D)`,border:`1px solid ${T.indigo}22`,borderRadius:16,padding:"18px 20px",textAlign:"left"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                        <div style={{width:34,height:34,borderRadius:10,background:T.indigo,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,fontFamily:FONT_DISPLAY,flexShrink:0}}>A</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:800,color:T.ink,fontFamily:FONT_DISPLAY}}>Aaron · ton plan du jour</div>
                          <div style={{fontSize:11,color:T.inkSoft}}>Directeur Succes Client</div>
                        </div>
                        <button onClick={()=>loadAaron(true)} disabled={aaronBusy} title="Actualiser" style={{background:"none",border:"none",cursor:aaronBusy?"default":"pointer",color:T.inkFaint,fontSize:12,padding:4}}>{aaronBusy?"...":"\u21BB"}</button>
                      </div>
                      {aaronBusy&&!aaronPlan&&<div style={{fontSize:13,color:T.inkSoft}}>Aaron prepare ton plan...</div>}
                      {aaronPlan&&(<>
                        {aaronPlan.salut&&<div style={{fontSize:13,color:T.ink,marginBottom:13,fontStyle:"italic"}}>{aaronPlan.salut}</div>}
                        {(aaronPlan.actions||[]).map((a,i)=>(
                          <div key={i} style={{display:"flex",gap:11,marginBottom:11,alignItems:"flex-start"}}>
                            <div style={{width:22,height:22,borderRadius:8,background:T.indigo,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0,marginTop:1}}>{i+1}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:700,color:T.ink,lineHeight:1.4}}>{a.titre}</div>
                              {a.pourquoi&&<div style={{fontSize:12,color:T.inkSoft,marginTop:2,lineHeight:1.45}}>{a.pourquoi}</div>}
                            </div>
                          </div>
                        ))}
                        {(aaronPlan.opportunites||[]).length>0&&(
                          <div style={{marginTop:14,paddingTop:13,borderTop:`1px solid ${T.line}`}}>
                            <div style={{fontSize:11,fontWeight:800,color:T.gold,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Opportunites detectees</div>
                            {aaronPlan.opportunites.map((o,i)=>(
                              <div key={i} style={{fontSize:13,color:T.inkSoft,lineHeight:1.5,marginBottom:6,paddingLeft:14,position:"relative"}}><span style={{position:"absolute",left:0,color:T.gold}}>+</span>{o}</div>
                            ))}
                          </div>
                        )}
                        {businessMemory.isEmpty()&&(
                          <button onClick={()=>setView("business_memory")} style={{marginTop:13,width:"100%",padding:"10px",background:T.indigo,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT_DISPLAY}}>Remplir mon profil pour des conseils sur mesure</button>
                        )}
                      </>)}
                    </div>
                  )}
                </div>
              )}
              {phase==="generating"&&(
                <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                  {/* Barre de statut style Vercel */}
                  <div style={{padding:"10px 18px",background:T.indigoSoft,borderBottom:`1px solid ${T.indigo}22`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:T.indigo,animation:"pulse 1s ease infinite",flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:700,color:T.indigo}}>Génération en cours</span>
                    <span style={{fontSize:12,color:T.inkSoft,flex:1}}>{allJobs.find(j=>j.status===JOB_STATUS.RUNNING)?.log?.at(-1)||"Initialisation…"}</span>
                    <span style={{fontSize:12,fontWeight:700,color:T.indigo}}>{progress}%</span>
                  </div>
                  <div style={{flex:1,display:"flex",overflow:"hidden"}}>
                    {/* Zone streaming — le code apparaît en temps réel */}
                    <div style={{flex:1,overflow:"auto",padding:"16px 20px",background:"#0D1117"}}>
                      {streamText?(
                        <pre style={{margin:0,color:"#e6edf3",fontSize:12,fontFamily:FONT_MONO,lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>
                          <span style={{color:"#7ee787"}}>{"// Generation en cours - JENGA IA\n\n"}</span>
                          {streamText}
                          <span style={{display:"inline-block",width:8,height:16,background:T.gold,marginLeft:2,animation:"pulse .8s ease infinite",verticalAlign:"text-bottom"}}/>
                        </pre>
                      ):(
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:20}}>
                          <div style={{position:"relative",width:72,height:72}}><div style={{position:"absolute",inset:0,borderRadius:"50%",border:`2.5px solid ${T.line}`,borderTopColor:T.indigo,animation:"abspin 1s linear infinite"}}/><div style={{position:"absolute",inset:9,borderRadius:"50%",border:`2.5px solid ${T.line}`,borderTopColor:T.gold,animation:"abspin 1.5s linear infinite reverse"}}/><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><Logo size={32}/></div></div>
                          <div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:"#e6edf3",fontFamily:FONT_DISPLAY}}>Préparation…</div><div style={{fontSize:13,color:"#8b949e",marginTop:4}}>Le code va apparaître ici en temps réel</div></div>
                        </div>
                      )}
                    </div>
                    {isWide&&<div style={{width:260,background:T.surface,borderLeft:`1px solid ${T.line}`,overflow:"auto",flexShrink:0}}><AgentPanel logs={null} active={activeAgents}/></div>}
                  </div>
                </div>
              )}
              {phase==="error"&&(
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
                  <div style={{background:T.surface,border:`1px solid ${T.red}33`,borderRadius:16,padding:32,maxWidth:420,textAlign:"center"}}>
                    <div style={{width:52,height:52,borderRadius:"50%",background:T.redSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",color:T.red,fontSize:24,fontWeight:800}}>!</div>
                    <div style={{fontSize:16,fontWeight:700,color:T.ink,marginBottom:6,fontFamily:FONT_DISPLAY}}>Erreur de génération</div>
                    <div style={{fontSize:13,color:T.inkSoft,lineHeight:1.6,marginBottom:20}}>{error}</div>
                    <button onClick={()=>{setPhase("idle");setError("")}} style={{padding:"11px 24px",background:T.ink,color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:700}}>Réessayer</button>
                  </div>
                </div>
              )}
              {phase==="done"&&result&&(
                <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",animation:"abfade .3s ease"}}>
                  <div style={{padding:isWide?"10px 22px":"10px 14px",background:T.surface,borderBottom:`1px solid ${T.line}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                    <div style={{flex:1,minWidth:0}}><span style={{fontSize:14,fontWeight:700,color:T.ink}}>{result.title}</span>{isWide&&<span style={{fontSize:13,color:T.inkFaint,marginLeft:10}}>{result.tagline||result.description}</span>}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",background:T.surface,borderBottom:`1px solid ${T.line}`,flexShrink:0,overflow:"auto"}}>
                    {[["preview","Aperçu"],["code","Code"],...(fullstack?[["backend","Backend"],["schema","Base"],["apidocs","API"]]:[]),["agents","Agents"]].map(([id,l])=><button key={id} onClick={()=>setTab(id)} style={{padding:"12px 18px",background:"transparent",border:"none",borderBottom:`2px solid ${tab===id?T.ink:"transparent"}`,color:tab===id?T.ink:T.inkSoft,cursor:"pointer",fontSize:13,fontWeight:tab===id?700:500,whiteSpace:"nowrap"}}>{l}</button>)}
                    <div style={{flex:1}}/>
                    <div style={{display:"flex",gap:7,padding:"0 14px",alignItems:"center"}}>
                      {tab==="preview"&&isWide&&<div style={{display:"flex",background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:10,overflow:"hidden"}}>{[["desktop","Bureau"],["tablet","Tablette"],["mobile","Mobile"]].map(([m,l])=><button key={m} onClick={()=>setPreviewMode(m)} style={{padding:"5px 11px",background:previewMode===m?T.ink:"transparent",border:"none",color:previewMode===m?"#fff":T.inkSoft,cursor:"pointer",fontSize:11,fontWeight:previewMode===m?700:500}}>{l}</button>)}</div>}
                      <button onClick={downloadCode} title="Exporter le code .jsx" style={{width:36,height:36,background:T.surface,border:`1px solid ${T.line}`,borderRadius:10,color:T.inkSoft,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="download" size={16}/></button>
                      <button onClick={()=>setShowChat(c=>!c)} title="Modifier" style={{width:36,height:36,background:showChat?T.indigoSoft:T.surface,border:`1px solid ${showChat?T.indigo+"44":T.line}`,borderRadius:10,color:showChat?T.indigo:T.inkSoft,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="chat" size={16}/></button>
                      <button onClick={doBrand} title="Marque" style={{width:36,height:36,background:T.surface,border:`1px solid ${T.line}`,borderRadius:10,color:T.inkSoft,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="wand" size={16}/></button>
                      <button onClick={()=>setShowGithub(true)} title="Pousser sur GitHub" style={{width:36,height:36,background:T.surface,border:`1px solid ${T.line}`,borderRadius:10,color:T.inkSoft,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="code" size={16}/></button>
                      <button onClick={()=>{ if(spendCredits("buildApk")) setShowBuild(true); }} title={`Générer APK / IPA (${ACTION_COST.buildApk} crédits)`} style={{width:36,height:36,background:T.surface,border:`1px solid ${T.line}`,borderRadius:10,color:T.inkSoft,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="download" size={16}/></button>
                      <button onClick={()=>{ if(spendCredits("deployWeb")) setShowDeploy(true); }} style={{padding:"8px 16px",background:T.ink,border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6,fontFamily:FONT_DISPLAY}}><Icon name="rocket" size={15}/>{isWide?"Déployer":""}</button>
                    </div>
                  </div>
                  <div style={{flex:1,overflow:"hidden"}}>
                    {tab==="preview"&&(
                      <div style={{height:"100%",display:"flex",flexDirection:"column",background:T.surfaceAlt}}>
                        {previewError&&<div style={{padding:"8px 16px",background:T.redSoft,borderBottom:`1px solid ${T.red}33`,fontSize:13,color:T.red,display:"flex",alignItems:"center",gap:8,flexShrink:0}}><span>Erreur détectée — {autoFixing?"correction auto en cours…":"corrigée"}</span></div>}
                        <div style={{flex:1,display:"flex",justifyContent:"center",padding:previewMode!=="desktop"&&isWide?20:0}}>
                          <div style={{width:isWide?pw:"100%",maxWidth:"100%",height:"100%",transition:"width .3s",background:"#fff",borderRadius:previewMode!=="desktop"&&isWide?16:0,overflow:"hidden",boxShadow:previewMode!=="desktop"&&isWide?"0 12px 50px rgba(11,14,24,0.15)":"none"}}><LivePreview code={liveCode} plan={user?.plan} onError={msg=>{setPreviewError(msg);handlePreviewError(msg);}}/></div>
                        </div>
                      </div>
                    )}
                    {tab==="code"&&<CodeViewer code={liveCode} fileName={(result.title?.replace(/\s+/g,"-")||"App")+".jsx"}/>}
                    {tab==="backend"&&fullstack?.backend&&<CodeViewer code={fullstack.backend} fileName="server.js"/>}
                    {tab==="schema"&&fullstack?.schema&&<CodeViewer code={fullstack.schema} fileName="schema.sql"/>}
                    {tab==="apidocs"&&fullstack?.apiDocs&&<div style={{height:"100%",overflow:"auto",padding:24,background:T.surface}}><pre style={{fontFamily:FONT_MONO,fontSize:13,lineHeight:1.8,color:T.ink,whiteSpace:"pre-wrap"}}>{fullstack.apiDocs}</pre></div>}
                    {tab==="agents"&&<div style={{height:"100%",overflow:"auto",background:T.surfaceAlt}}><AgentPanel logs={agentLogs} active={[]}/></div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {noCreditsFor&&<Overlay onClose={()=>setNoCreditsFor(null)}>
        <div style={{background:T.surface,borderRadius:20,padding:32,width:420,maxWidth:"94vw",textAlign:"center"}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:T.goldSoft,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:T.goldDeep,fontSize:24}}>*</div>
          <div style={{fontSize:20,fontWeight:800,color:T.ink,marginBottom:8,fontFamily:FONT_DISPLAY}}>Crédits insuffisants</div>
          <div style={{fontSize:14,color:T.inkSoft,lineHeight:1.65,marginBottom:8}}>L'action « <strong>{ACTION_LABEL[noCreditsFor.action]}</strong> » coûte <strong>{noCreditsFor.cost} crédit{noCreditsFor.cost>1?"s":""}</strong>.</div>
          <div style={{fontSize:13,color:T.inkSoft,marginBottom:20}}>Il te reste <strong>{user?.credits||0} crédit{(user?.credits||0)>1?"s":""}</strong>. Recharge pour continuer.</div>
          <div style={{background:T.surfaceAlt,border:`1px solid ${T.line}`,borderRadius:12,padding:"12px 14px",marginBottom:20,fontSize:13,color:T.inkSoft,textAlign:"left"}}>
            <div style={{fontWeight:700,color:T.ink,marginBottom:8,fontSize:12,textTransform:"uppercase",letterSpacing:"0.05em"}}>Coût des actions</div>
            {Object.keys(ACTION_COST).map(a=><div key={a} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span>{ACTION_LABEL[a]}</span><span style={{fontWeight:600,color:T.ink}}>{ACTION_COST[a]} crédit{ACTION_COST[a]>1?"s":""}</span></div>)}
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setNoCreditsFor(null)} style={{flex:1,padding:"12px 15px",background:T.surface,border:`1.5px solid ${T.line}`,borderRadius:10,color:T.inkSoft,cursor:"pointer",fontSize:14,fontWeight:600}}>Plus tard</button>
            <button onClick={()=>{setNoCreditsFor(null);setShowBuyCredits(true);}} style={{flex:2,padding:"12px",background:T.ink,border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:FONT_DISPLAY}}>Recharger mes crédits</button>
          </div>
        </div>
      </Overlay>}
      <JobBanner jobs={allJobs} onOpen={()=>setShowJobs(true)}/>
      {showJobs&&<JobsPanel onClose={()=>setShowJobs(false)} onOpenResult={j=>{if(j.result){setResult(j.result);setLiveCode(j.result.code||j.result.frontend);setPhase("done");setView("builder");setShowJobs(false);}}}/>}
      {showOnboarding&&<OnboardingScreen onDone={()=>{setShowOnboarding(false);ls.set(ONBOARDING_KEY,true);}} onGenerate={(p)=>{setPrompt(p);setView("builder");setTimeout(()=>generate(p),100);}}/>}
      {legalDoc&&<LegalDocModal title={legalDoc} onClose={()=>setLegalDoc(null)}/>}
      {showBuyCredits&&<BuyCreditsModal onClose={()=>setShowBuyCredits(false)} onPurchased={(tab,qty)=>{ if(tab==="visuals") setUser(u=>({...u,images:(u?.images||0)+qty})); else setUser(u=>({...u,credits:(u?.credits||0)+qty})); }}/>}
      {showPricing&&<PricingModal currentPlan={user?.plan} onClose={()=>setShowPricing(false)} onSelectPlan={pid=>{const p=PLANS.find(x=>x.id===pid);setUser(u=>({...u,plan:pid,credits:p?p.credits:u.credits}));}}/>}
      {showChat&&result&&liveCode&&<IterativeChat code={liveCode} title={result.title} onUpdate={c=>setLiveCode(c)} onClose={()=>setShowChat(false)}/>}
      {showDeploy&&liveCode&&<DeployModal title={result?.title||"App"} code={liveCode} onClose={()=>setShowDeploy(false)} onDeployed={url=>setProjects(prev=>prev.map((p,i)=>i===0?{...p,deployUrl:url}:p))}/>}
      {showBrand&&<BrandModal brand={brandData} title={result?.title||"App"} onClose={()=>setShowBrand(false)}/>}
      {showBuild&&liveCode&&<BuildModal title={result?.title||"App"} code={liveCode} onClose={()=>setShowBuild(false)}/>}
      {showGithub&&liveCode&&<GithubModal title={result?.title||"App"} code={liveCode} fullstack={fullstack} token={githubToken} setToken={setGithubToken} onClose={()=>setShowGithub(false)}/>}
    </div>
  );
}