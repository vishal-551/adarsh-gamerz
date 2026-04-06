import React, { useEffect, useMemo, useState } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  Bell,
  Gamepad2,
  Play,
  Users,
  Video,
  TrendingUp,
  Mail,
  Shield,
  Star,
  Settings,
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
  LogIn,
  ArrowLeft,
  ExternalLink,
  Phone,
  Send,
  Save,
  Menu,
  Briefcase,
  Home,
  LayoutDashboard,
  Globe,
  MessageCircle,
} from "lucide-react";

const STORAGE_KEY = "adarsh_gamerz_static_admin_v1";
const DB_NAME = "adarsh_gamerz_db";
const STORE_NAME = "site_store";
const ALLOWED_ADMIN_EMAIL = "vishaldas571725@gmail.com";
const BRAND_FORM_EMAIL = "vishaldas571725@gmail.com";

function createId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function createDefaultData() {
  return {
    siteName: "ADARSH GAMERZ",
    tagline: "Level Up Your Gaming Experience — Watch, Upload, Connect with Brands & Dominate!",
    logoText: "ADARSH GAMERZ",
    heroTitle1: "ADARSH",
    heroTitle2: "GAMERZ",
    heroSubtitle:
      "🎮 Level Up Your Gaming Experience — Watch, Upload, Connect with Brands & Dominate!",
    youtubeLink: "https://youtube.com/@yourChannel",
    brandContactEmail: "brand@adarshgamerz.com",
    contactEmail: "adarshgamerz@example.com",
    contactPhone: "+91 90000 00000",
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    telegram: "https://t.me/",
    subscribers: "50K+",
    totalVideos: "200+",
    totalViews: "5M+",
    logoUrl: "",
    bannerUrl: "",
    adminEmail: "vishu011101@gmail.com",
    notifications: [
      {
        id: createId(),
        title: "New upload coming soon!",
        text: "Stay tuned for the next gaming video update.",
        link: "",
        date: "Today",
      },
    ],
    videos: [
      {
        id: createId(),
        title: "Featured Gaming Video 1",
        description: "Paste your first YouTube video link from admin panel.",
        thumbnail: "",
        thumbnails: ["", "", ""],
        videoUrl: "",
        views: "120K views",
        uploadTime: "2 days ago",
      },
      {
        id: createId(),
        title: "Featured Gaming Video 2",
        description: "Paste your second YouTube video link from admin panel.",
        thumbnail: "",
        thumbnails: ["", "", ""],
        videoUrl: "",
        views: "98K views",
        uploadTime: "5 days ago",
      },
      {
        id: createId(),
        title: "Featured Gaming Video 3",
        description: "Paste your third YouTube video link from admin panel.",
        thumbnail: "",
        thumbnails: ["", "", ""],
        videoUrl: "",
        views: "76K views",
        uploadTime: "1 week ago",
      },
    ],
    brands: [
      {
        id: createId(),
        icon: "growth",
        title: "Grow Together",
        text: "Partner with brands that boost your gaming career",
      },
      {
        id: createId(),
        icon: "verified",
        title: "Verified Deals",
        text: "All brand deals are verified and secure",
      },
      {
        id: createId(),
        icon: "premium",
        title: "Premium Rates",
        text: "Get the best rates based on your performance",
      },
    ],
    footerLine: "Gaming Content Creator | Streamer | Brand Partner",
  };
}

function isBrowser() {
  return typeof window !== "undefined";
}

function sanitizeList(list, fallbackFactory) {
  if (!Array.isArray(list) || list.length === 0) {
    return fallbackFactory();
  }
  return list.map((item) => ({ ...item, id: item?.id || createId() }));
}

function normalizeVideo(video, fallbackVideo) {
  const fallbackThumbs = Array.isArray(fallbackVideo?.thumbnails)
    ? fallbackVideo.thumbnails
    : ["", "", ""];
  const thumbnails = Array.isArray(video?.thumbnails)
    ? [...video.thumbnails, "", ""].slice(0, 3)
    : typeof video?.thumbnail === "string"
      ? [video.thumbnail, "", ""]
      : fallbackThumbs;

  return {
    ...fallbackVideo,
    ...video,
    id: video?.id || createId(),
    thumbnails,
    thumbnail: thumbnails.find(Boolean) || "",
  };
}

function normalizeData(raw) {
  const defaults = createDefaultData();
  if (!raw || typeof raw !== "object") {
    return {
      ...defaults,
      videos: defaults.videos.map((video, index) =>
        normalizeVideo(video, defaults.videos[index] || defaults.videos[0])
      ),
    };
  }

  const safeVideos = Array.isArray(raw.videos) && raw.videos.length > 0 ? raw.videos : defaults.videos;
  const normalizedVideos = safeVideos.map((video, index) =>
    normalizeVideo(video, defaults.videos[index] || defaults.videos[0])
  );

  while (normalizedVideos.length < 3) {
    const fallback = defaults.videos[normalizedVideos.length] || defaults.videos[0];
    normalizedVideos.push(normalizeVideo({}, fallback));
  }

  return {
    ...defaults,
    ...raw,
    notifications: sanitizeList(raw.notifications, () => defaults.notifications),
    videos: normalizedVideos,
    brands: sanitizeList(raw.brands, () => defaults.brands),
  };
}

function runSelfTests() {
  const normalized = normalizeData({ siteName: "TEST", videos: [], notifications: [], brands: [] });
  const migrated = normalizeData({ videos: [{ id: "a", title: "Old", thumbnail: "thumb-1" }] });

  if (normalized.siteName !== "TEST") {
    throw new Error("normalizeData should preserve provided scalar fields");
  }
  if (normalized.videos.length < 3) {
    throw new Error("There should always be at least 3 video cards");
  }
  if (!Array.isArray(migrated.videos[0].thumbnails) || migrated.videos[0].thumbnails.length !== 3) {
    throw new Error("Video thumbnails should always have 3 slots");
  }
  if (migrated.videos[0].thumbnails[0] !== "thumb-1") {
    throw new Error("Legacy thumbnail should migrate into first slot");
  }
}

runSelfTests();

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!isBrowser() || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

async function readStoredData() {
  if (!isBrowser()) {
    return createDefaultData();
  }

  try {
    const db = await openDatabase();
    if (db) {
      const value = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(STORAGE_KEY);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error("Failed to read IndexedDB"));
      });
      db.close();
      if (value) {
        return normalizeData(value);
      }
    }
  } catch {}

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return normalizeData(JSON.parse(saved));
    }
  } catch {}

  return createDefaultData();
}

async function writeStoredData(data) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}

  try {
    const db = await openDatabase();
    if (db) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(data, STORAGE_KEY);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error || new Error("Failed to write IndexedDB"));
      });
      db.close();
    }
  } catch {}
}

function useSiteData() {
  const [data, setData] = useState(() => createDefaultData());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    readStoredData().then((stored) => {
      if (!active) {
        return;
      }
      setData(stored);
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    writeStoredData(data);
  }, [data, loaded]);

  return [data, setData, loaded];
}

function SectionTitle({ emoji, title, glow = "green" }) {
  return (
    <div className="mb-8 space-y-2 text-center">
      <h2
        className={`text-3xl font-black uppercase tracking-wider md:text-5xl ${
          glow === "cyan" ? "neon-cyan text-cyan-400" : "neon-green text-lime-400"
        }`}
        style={{ fontFamily: "Orbitron, sans-serif" }}
      >
        <span className="mr-3">{emoji}</span>
        {title}
      </h2>
      <div className="mx-auto h-px w-28 bg-gradient-to-r from-transparent via-lime-400/60 to-transparent" />
    </div>
  );
}

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-950/75 px-6 py-7 text-center shadow-[0_0_25px_rgba(34,197,94,0.08)] backdrop-blur-sm">
      <Icon className="mx-auto mb-4 h-7 w-7 text-lime-400" />
      <div
        className="text-4xl font-black tracking-wider text-white"
        style={{ fontFamily: "Orbitron, sans-serif" }}
      >
        {value}
      </div>
      <div className="mt-1 text-slate-400">{label}</div>
    </div>
  );
}

function BrandIcon({ type }) {
  if (type === "verified") {
    return <Shield className="mx-auto mb-5 h-10 w-10 text-lime-400" />;
  }
  if (type === "premium") {
    return <Star className="mx-auto mb-5 h-10 w-10 text-lime-400" />;
  }
  return <TrendingUp className="mx-auto mb-5 h-10 w-10 text-lime-400" />;
}

function SocialIcon({ kind }) {
  if (kind === "youtube") {
    return <span className="flex h-5 w-5 items-center justify-center rounded-md bg-red-500/20 text-[10px] font-black text-red-400">YT</span>;
  }
  if (kind === "instagram") {
    return <span className="flex h-5 w-5 items-center justify-center rounded-md bg-pink-500/20 text-[10px] font-black text-pink-400">IG</span>;
  }
  if (kind === "facebook") {
    return <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/20 text-[10px] font-black text-blue-400">FB</span>;
  }
  if (kind === "telegram") {
    return <Send className="h-5 w-5 text-cyan-400" />;
  }
  return <Globe className="h-5 w-5 text-slate-300" />;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function Input({ label, className = "", ...props }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-300 md:text-base">{label}</span>
      <input
        {...props}
        className={`w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-white outline-none transition focus:border-lime-400 focus:shadow-[0_0_0_3px_rgba(57,255,20,0.12)] ${className}`}
      />
    </label>
  );
}

function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-300 md:text-base">{label}</span>
      <textarea
        {...props}
        className={`min-h-[110px] w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-white outline-none transition focus:border-lime-400 focus:shadow-[0_0_0_3px_rgba(57,255,20,0.12)] ${className}`}
      />
    </label>
  );
}

function App() {
  const [data, setData, dataLoaded] = useSiteData();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPage, setAdminPage] = useState("settings");
  const [authMode, setAuthMode] = useState("login");
  const [loggedIn, setLoggedIn] = useState(false);
  const [toast, setToast] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ email: "", password: "" });
  const [brandForm, setBrandForm] = useState({ name: "", email: "", brand: "", phone: "", message: "" });
  const [brandFormOpen, setBrandFormOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoggedIn(Boolean(user && user.emailVerified));
      if (user && user.emailVerified) {
        setAuthMode("login");
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!adminOpen) {
      setMobileMenu(false);
    }
  }, [adminOpen]);

  const navItems = useMemo(
    () => [
      { id: "home", label: "Home", icon: Home },
      { id: "videos", label: "Videos", icon: Video },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "brands", label: "Brand Connect", icon: Briefcase },
      { id: "contact", label: "Contact", icon: Mail },
    ],
    []
  );

  const adminTabs = useMemo(
    () => [
      { id: "settings", label: "Settings", icon: Settings },
      { id: "videos", label: "Videos", icon: Video },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "brands", label: "Brands", icon: Briefcase },
      { id: "contact", label: "Contact", icon: MessageCircle },
    ],
    []
  );

  const scrollToId = (id) => {
    if (!isBrowser()) {
      return;
    }
    window.document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenu(false);
  };

  const saveData = (updater, message = "Settings saved! 🎮") => {
    setData((prev) => normalizeData(typeof updater === "function" ? updater(prev) : updater));
    setToast(message);
  };

  const openAdmin = () => {
    setAdminOpen(true);
    setMobileMenu(false);
  };

  const closeAdmin = () => {
    setAdminOpen(false);
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setLoggedIn(false);
      setToast("Logged out");
    } catch {
      setToast("Logout failed");
    }
  };

  const handleLogin = async () => {
    const email = loginForm.email.trim().toLowerCase();
    const password = loginForm.password;

    if (email !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
      setToast("Only your admin email is allowed");
      return;
    }

    if (!email || !password) {
      setToast("Enter email and password");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (!userCredential.user.emailVerified) {
        setToast("Please verify your email first");
        return;
      }

      setLoggedIn(true);
      setAdminPage("settings");
      setToast("Admin login successful");
    } catch (error) {
      setToast(error?.message || "Wrong email or password");
    }
  };

  const handleSignup = async () => {
    const email = signupForm.email.trim().toLowerCase();
    const password = signupForm.password;

    if (email !== ALLOWED_ADMIN_EMAIL.toLowerCase()) {
      setToast("Only your admin email can create admin account");
      return;
    }

    if (!email || !password) {
      setToast("Enter email and password");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      saveData(
        (prev) => ({
          ...prev,
          adminEmail: email,
        }),
        "Verification email sent"
      );
      setAuthMode("login");
      setLoginForm({ email, password: "" });
      setSignupForm({ email: "", password: "" });
      await signOut(auth);
    } catch (error) {
      setToast(error?.message || "Signup failed");
    }
  };

  const updateVideo = (id, patch) => {
    saveData(
      (prev) => ({
        ...prev,
        videos: prev.videos.map((video) => (video.id === id ? { ...video, ...patch } : video)),
      }),
      "Video saved"
    );
  };

  const updateNotification = (id, patch) => {
    saveData(
      (prev) => ({
        ...prev,
        notifications: prev.notifications.map((item) =>
          item.id === id ? { ...item, ...patch } : item
        ),
      }),
      "Notification saved"
    );
  };

  const updateBrand = (id, patch) => {
    saveData(
      (prev) => ({
        ...prev,
        brands: prev.brands.map((brand) => (brand.id === id ? { ...brand, ...patch } : brand)),
      }),
      "Brand card saved"
    );
  };

  const handleImageUpload = async (file, onSuccessMessage, applyUpdate) => {
    if (!file) {
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      if (!base64) {
        setToast("Image upload failed");
        return;
      }
      saveData(applyUpdate(base64), onSuccessMessage);
    } catch {
      setToast("Image upload failed");
    }
  };

  const clearStoredImage = (key, message) => {
    saveData((prev) => ({ ...prev, [key]: "" }), message);
  };

  const handleBrandFormChange = (field, value) => {
    setBrandForm((prev) => ({ ...prev, [field]: value }));
  };

  const openBrandForm = () => {
    setBrandFormOpen(true);
  };

  const closeBrandForm = () => {
    setBrandFormOpen(false);
  };

  const handleBrandSubmit = () => {
    setToast("Enquiry sent successfully");
    setBrandForm({ name: "", email: "", brand: "", phone: "", message: "" });
    window.setTimeout(() => {
      setBrandFormOpen(false);
    }, 300);
  };

  if (!dataLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#02060c] text-white">
        <div className="rounded-2xl border border-lime-400/30 bg-slate-950/80 px-6 py-4 text-xl font-bold text-lime-400">
          Loading site data...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02060c] text-white selection:bg-lime-400 selection:text-black">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;800;900&family=Rajdhani:wght@400;500;600;700&display=swap');
        html { scroll-behavior: smooth; }
        body { font-family: Rajdhani, sans-serif; background:#02060c; }
        .neon-green { text-shadow: 0 0 8px rgba(57,255,20,.85),0 0 16px rgba(57,255,20,.55),0 0 35px rgba(57,255,20,.2); }
        .neon-cyan { text-shadow: 0 0 8px rgba(34,211,238,.9),0 0 18px rgba(34,211,238,.45),0 0 35px rgba(34,211,238,.15); }
        .panel { background: linear-gradient(180deg, rgba(7,10,18,.94), rgba(4,8,16,.96)); border:1px solid rgba(67, 85, 112, 0.42); box-shadow: 0 0 0 1px rgba(57,255,20,.08), 0 0 30px rgba(0,255,128,.05); }
        .hero-grid::before { content:''; position:absolute; inset:0; background-image: linear-gradient(rgba(57,255,20,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,.04) 1px, transparent 1px); background-size: 32px 32px; mask-image: radial-gradient(circle at center, black 45%, transparent 92%); }
        .hero-lines::after { content:''; position:absolute; inset:0; background: repeating-linear-gradient(to bottom, rgba(0,255,128,.035), rgba(0,255,128,.035) 1px, transparent 2px, transparent 4px); opacity:.35; pointer-events:none; }
        .cyber-bg { background: radial-gradient(circle at top center, rgba(18,255,101,.12), transparent 32%), radial-gradient(circle at 60% 10%, rgba(34,211,238,.12), transparent 25%), linear-gradient(180deg, #030711 0%, #02060c 100%); }
      `}</style>

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <button type="button" onClick={() => scrollToId("home")} className="flex items-center gap-3">
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="logo" className="h-9 w-9 rounded-lg object-cover ring-1 ring-lime-400/40" />
            ) : (
              <Gamepad2 className="h-8 w-8 text-lime-400" />
            )}
            <span className="neon-green text-xl font-black tracking-wider text-lime-400 md:text-3xl" style={{ fontFamily: "Orbitron, sans-serif" }}>
              {data.logoText}
            </span>
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <button key={item.id} type="button" onClick={() => scrollToId(item.id)} className="text-lg font-semibold text-slate-300 transition hover:text-white">
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => scrollToId("notifications")} className="relative rounded-full p-2 text-slate-300 transition hover:bg-slate-900 hover:text-white">
              <Bell className="h-6 w-6" />
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-lime-400 shadow-[0_0_15px_rgba(57,255,20,1)]" />
            </button>
            <button type="button" onClick={() => setMobileMenu((value) => !value)} className="rounded-xl border border-slate-700 p-2 md:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="border-t border-slate-800 bg-black/95 px-4 py-3 md:hidden">
            <div className="grid gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" onClick={() => scrollToId(item.id)} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-left text-slate-200">
                    <Icon className="h-5 w-5 text-lime-400" />
                    {item.label}
                  </button>
                );
              })}
              <button type="button" onClick={openAdmin} className="flex items-center gap-3 rounded-xl bg-lime-500 px-4 py-3 font-bold text-black">
                <LayoutDashboard className="h-5 w-5" />
                Open Admin Panel
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section id="home" className="cyber-bg hero-grid hero-lines relative overflow-hidden border-b border-slate-900">
          {data.bannerUrl ? (
            <div className="absolute inset-0 opacity-20">
              <img src={data.bannerUrl} alt="banner" className="h-full w-full object-cover" />
            </div>
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.15),rgba(0,0,0,0.82))]" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="leading-none uppercase" style={{ fontFamily: "Orbitron, sans-serif" }}>
                <span className="neon-green block text-6xl font-black text-lime-400 md:text-[120px]">{data.heroTitle1}</span>
                <span className="neon-cyan mt-2 block text-5xl font-black text-cyan-400 md:text-[88px]">{data.heroTitle2}</span>
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-2xl text-slate-300 md:text-4xl">{data.heroSubtitle}</p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a href={data.youtubeLink || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 rounded-xl bg-lime-500 px-8 py-4 text-xl font-black uppercase tracking-wide text-black shadow-[0_0_30px_rgba(57,255,20,.25)] transition hover:scale-[1.02]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  <Play className="h-6 w-6" /> Watch Now
                </a>
                <button type="button" onClick={() => scrollToId("brands")} className="inline-flex items-center gap-3 rounded-xl border border-cyan-400/60 bg-slate-950/70 px-8 py-4 text-xl font-black uppercase tracking-wide text-cyan-400 shadow-[0_0_25px_rgba(34,211,238,.12)] transition hover:scale-[1.02]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  <Users className="h-6 w-6" /> Brand Connect
                </button>
              </div>
            </div>

            <div className="mx-auto mt-14 grid max-w-3xl gap-4 md:grid-cols-3">
              <StatCard icon={Users} value={data.subscribers} label="Subscribers" />
              <StatCard icon={Video} value={data.totalVideos} label="Videos" />
              <StatCard icon={Play} value={data.totalViews} label="Views" />
            </div>
          </div>
        </section>

        <section id="videos" className="border-b border-slate-900 px-4 py-20 md:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionTitle emoji="🎬" title="MY VIDEOS" />
            <p className="mb-12 text-center text-2xl text-slate-400">Latest gaming content — watch, like & share!</p>
            {data.videos.length === 0 ? (
              <div className="text-center text-3xl text-slate-500">Videos coming soon! 🎮</div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {data.videos.map((video) => (
                  <a key={video.id} href={video.videoUrl || "#"} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 transition hover:-translate-y-1 hover:border-lime-400/50 hover:shadow-[0_0_30px_rgba(57,255,20,.12)]">
                    <div className="relative aspect-video overflow-hidden bg-slate-900">
                      {video.thumbnails?.find(Boolean) || video.thumbnail ? (
                        <img src={video.thumbnails?.find(Boolean) || video.thumbnail} alt={video.title || "Video thumbnail"} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-500">
                          <ImageIcon className="h-14 w-14" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-black/75 px-3 py-1.5 text-sm font-semibold text-white">
                        <Play className="h-4 w-4 text-lime-400" /> Watch Video
                      </div>
                    </div>
                    <div className="space-y-2 p-5">
                      <h3 className="text-2xl font-bold text-white">{video.title}</h3>
                      <p className="min-h-[48px] text-lg text-slate-400">{video.description}</p>
                      <div className="flex items-center justify-between gap-3 text-base text-slate-500">
                        <span>{video.views}</span>
                        <span>{video.uploadTime}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="notifications" className="border-b border-slate-900 px-4 py-20 md:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionTitle emoji="🔔" title="NOTIFICATIONS" glow="cyan" />
            <div className="mx-auto grid max-w-4xl gap-4">
              {data.notifications.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_0_20px_rgba(34,211,238,.05)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{item.title}</h3>
                      <p className="text-lg text-slate-400">{item.text}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-base text-cyan-300">{item.date}</span>
                      {item.link ? (
                        <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/15 px-4 py-2 text-cyan-300 hover:bg-cyan-500/25">
                          Open <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="brands" className="border-b border-slate-900 px-4 py-20 md:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionTitle emoji="🤝" title="BRAND CONNECT" glow="cyan" />
            <p className="mb-12 text-center text-2xl text-slate-400">Collaborate with top gaming brands & earn!</p>
            <div className="grid gap-6 md:grid-cols-3">
              {data.brands.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-8 text-center shadow-[0_0_20px_rgba(57,255,20,.06)]">
                  <BrandIcon type={item.icon} />
                  <h3 className="text-3xl font-bold text-white">{item.title}</h3>
                  <p className="mx-auto mt-3 max-w-xs text-xl text-slate-400">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <button type="button" onClick={openBrandForm} className="inline-flex items-center gap-3 rounded-xl bg-lime-500 px-8 py-4 text-xl font-black uppercase tracking-wide text-black shadow-[0_0_30px_rgba(57,255,20,.25)]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                <Mail className="h-6 w-6" /> Contact For Brand Deals
              </button>
            </div>
          </div>
        </section>

        <section id="contact" className="px-4 py-20 md:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionTitle emoji="📩" title="CONTACT" />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8">
                <h3 className="mb-6 text-3xl font-bold text-white">Get in touch</h3>
                <div className="space-y-4 text-xl text-slate-300">
                  <a href={`mailto:${data.contactEmail}`} className="flex items-center gap-3 hover:text-lime-400"><Mail className="h-5 w-5" /> {data.contactEmail}</a>
                  <a href={`tel:${data.contactPhone}`} className="flex items-center gap-3 hover:text-lime-400"><Phone className="h-5 w-5" /> {data.contactPhone}</a>
                  <a href={data.youtubeLink || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-red-400"><SocialIcon kind="youtube" /> YouTube Channel</a>
                  <a href={data.instagram || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-pink-400"><SocialIcon kind="instagram" /> Instagram</a>
                  <a href={data.facebook || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-blue-400"><SocialIcon kind="facebook" /> Facebook</a>
                  <a href={data.telegram || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-cyan-400"><SocialIcon kind="telegram" /> Telegram</a>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8">
                <h3 className="mb-6 text-3xl font-bold text-white">Quick Links</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.id} type="button" onClick={() => scrollToId(item.id)} className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 text-left hover:border-lime-400/50">
                        <Icon className="mb-3 h-6 w-6 text-lime-400" />
                        <div className="text-2xl font-bold text-white">{item.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-900 bg-black/30 px-4 py-12 md:px-6">
        <div className="mx-auto max-w-7xl text-center">
          <div className="neon-green inline-flex items-center gap-3 text-2xl font-black uppercase tracking-wider text-lime-400" style={{ fontFamily: "Orbitron, sans-serif" }}>
            <Gamepad2 className="h-6 w-6" /> {data.siteName}
          </div>
          <p className="mt-4 text-xl text-slate-400">🎮 {data.footerLine}</p>
          <p className="mt-3 text-lg text-slate-500">© 2026 {data.siteName}. All rights reserved.</p>
          <div className="mt-4">
            <button type="button" onClick={openAdmin} className="text-slate-500 hover:text-lime-400">Admin</button>
          </div>
        </div>
      </footer>

      <button type="button" onClick={openAdmin} className="fixed bottom-5 right-5 z-20 inline-flex items-center gap-3 rounded-2xl border border-lime-400/40 bg-slate-950/90 px-5 py-3 text-lime-400 shadow-[0_0_30px_rgba(57,255,20,.15)] backdrop-blur-md transition hover:scale-[1.02]">
        <Settings className="h-5 w-5" />
        <span className="font-bold">Admin Panel</span>
      </button>

      {adminOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="panel w-full max-w-6xl rounded-[28px]">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 md:px-7">
                <div className="flex items-center gap-3">
                  <Settings className="h-6 w-6 text-lime-400" />
                  <div>
                    <div className="text-xl font-black text-white md:text-2xl" style={{ fontFamily: "Orbitron, sans-serif" }}>Admin Panel</div>
                    <div className="text-slate-400">Manage posts, thumbnails, links, stats and content</div>
                  </div>
                </div>
                <button type="button" onClick={closeAdmin} className="rounded-xl border border-slate-700 p-2 hover:bg-slate-900"><X className="h-5 w-5" /></button>
              </div>

              {!loggedIn ? (
                <div className="mx-auto max-w-md px-5 py-8 md:py-12">
                  <div className="rounded-[24px] border border-lime-400/50 bg-[#0b0f1a] p-6 shadow-[0_0_30px_rgba(57,255,20,.12)]">
                    <div className="mb-8 text-center">
                      <div className="neon-green inline-flex items-center gap-2 text-3xl font-black uppercase text-lime-400" style={{ fontFamily: "Orbitron, sans-serif" }}>
                        <Gamepad2 className="h-7 w-7" />
                        {authMode === "login" ? "ADMIN LOGIN" : "ADMIN SIGN UP"}
                      </div>
                    </div>

                    {authMode === "login" ? (
                      <div className="space-y-4">
                        <Input label="Admin Email" type="email" placeholder="Enter email" value={loginForm.email} onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))} />
                        <Input label="Password" type="password" placeholder="Enter password" value={loginForm.password} onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))} />
                        <button type="button" onClick={handleLogin} className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-600 px-4 py-3 text-lg font-black uppercase text-black hover:bg-lime-500" style={{ fontFamily: "Orbitron, sans-serif" }}>
                          <LogIn className="h-5 w-5" /> Please Wait...
                        </button>
                        <button type="button" onClick={() => setAuthMode("signup")} className="block w-full text-center text-lg text-slate-400 hover:text-white">Don&apos;t have account? Sign Up</button>
                        <button type="button" onClick={closeAdmin} className="flex w-full items-center justify-center gap-2 text-lg text-slate-500 hover:text-lime-400"><ArrowLeft className="h-4 w-4" /> Back to Website</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Input label="New Admin Email" type="email" placeholder="Enter email" value={signupForm.email} onChange={(event) => setSignupForm((prev) => ({ ...prev, email: event.target.value }))} />
                        <Input label="New Password" type="password" placeholder="Create password" value={signupForm.password} onChange={(event) => setSignupForm((prev) => ({ ...prev, password: event.target.value }))} />
                        <button type="button" onClick={handleSignup} className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-600 px-4 py-3 text-lg font-black uppercase text-black hover:bg-lime-500" style={{ fontFamily: "Orbitron, sans-serif" }}>
                          <Save className="h-5 w-5" /> Create Admin
                        </button>
                        <button type="button" onClick={() => setAuthMode("login")} className="block w-full text-center text-lg text-slate-400 hover:text-white">Already have account? Login</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid lg:grid-cols-[260px_1fr]">
                  <aside className="border-b border-slate-800 p-4 lg:border-b-0 lg:border-r">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      {adminTabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = adminPage === tab.id;
                        return (
                          <button key={tab.id} type="button" onClick={() => setAdminPage(tab.id)} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${active ? "bg-lime-500 text-black" : "border border-slate-800 bg-slate-950/80 text-slate-300 hover:border-lime-400/30"}`}>
                            <Icon className="h-5 w-5" />
                            <span className="font-bold">{tab.label}</span>
                          </button>
                        );
                      })}
                      <button type="button" onClick={logout} className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left font-bold text-red-300 hover:bg-red-500/20">Logout</button>
                    </div>
                  </aside>

                  <div className="max-h-[80vh] overflow-y-auto p-4 md:p-6">
                    {adminPage === "settings" && (
                      <div>
                        <h3 className="mb-6 text-4xl font-black text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>⚙️ Site Settings</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input label="Site Name" value={data.siteName} onChange={(event) => saveData((prev) => ({ ...prev, siteName: event.target.value }))} />
                          <Input label="Logo Text" value={data.logoText} onChange={(event) => saveData((prev) => ({ ...prev, logoText: event.target.value }))} />
                          <Input label="Hero Title 1" value={data.heroTitle1} onChange={(event) => saveData((prev) => ({ ...prev, heroTitle1: event.target.value }))} />
                          <Input label="Hero Title 2" value={data.heroTitle2} onChange={(event) => saveData((prev) => ({ ...prev, heroTitle2: event.target.value }))} />
                          <Input label="YouTube Channel Link" value={data.youtubeLink} onChange={(event) => saveData((prev) => ({ ...prev, youtubeLink: event.target.value }))} />
                          <Input label="Brand Email" value={data.brandContactEmail} onChange={(event) => saveData((prev) => ({ ...prev, brandContactEmail: event.target.value }))} />
                          <Input label="Contact Email" value={data.contactEmail} onChange={(event) => saveData((prev) => ({ ...prev, contactEmail: event.target.value }))} />
                          <Input label="Phone Number" value={data.contactPhone} onChange={(event) => saveData((prev) => ({ ...prev, contactPhone: event.target.value }))} />
                          <Input label="Instagram Link" value={data.instagram} onChange={(event) => saveData((prev) => ({ ...prev, instagram: event.target.value }))} />
                          <Input label="Facebook Link" value={data.facebook} onChange={(event) => saveData((prev) => ({ ...prev, facebook: event.target.value }))} />
                          <Input label="Telegram Link" value={data.telegram} onChange={(event) => saveData((prev) => ({ ...prev, telegram: event.target.value }))} />
                          <Input label="Subscribers Count" value={data.subscribers} onChange={(event) => saveData((prev) => ({ ...prev, subscribers: event.target.value }))} />
                          <Input label="Total Videos" value={data.totalVideos} onChange={(event) => saveData((prev) => ({ ...prev, totalVideos: event.target.value }))} />
                          <Input label="Total Views" value={data.totalViews} onChange={(event) => saveData((prev) => ({ ...prev, totalViews: event.target.value }))} />
                          <Input label="Admin Email" value={data.adminEmail} onChange={(event) => saveData((prev) => ({ ...prev, adminEmail: event.target.value }), "Admin email updated")} />
                        </div>
                        <div className="mt-4 grid gap-4">
                          <Textarea label="Tagline / Bio" value={data.tagline} onChange={(event) => saveData((prev) => ({ ...prev, tagline: event.target.value }))} />
                          <Textarea label="Hero Subtitle" value={data.heroSubtitle} onChange={(event) => saveData((prev) => ({ ...prev, heroSubtitle: event.target.value }))} />
                          <Textarea label="Footer Line" value={data.footerLine} onChange={(event) => saveData((prev) => ({ ...prev, footerLine: event.target.value }))} />
                        </div>

                        <div className="mt-6 grid gap-6 md:grid-cols-2">
                          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="text-xl font-bold text-white">Logo Upload</div>
                              <button type="button" onClick={() => clearStoredImage("logoUrl", "Logo deleted")} className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <input type="file" accept="image/*" onChange={(event) => handleImageUpload(event.target.files?.[0], "Logo updated", (base64) => (prev) => ({ ...prev, logoUrl: base64 }))} className="block w-full text-sm text-slate-400" />
                            {data.logoUrl ? (
                              <img src={data.logoUrl} alt="logo preview" className="mt-4 h-20 w-20 rounded-xl object-cover" />
                            ) : (
                              <div className="mt-4 flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-slate-700 text-xs text-slate-500">No logo</div>
                            )}
                          </div>
                          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="text-xl font-bold text-white">Banner Upload</div>
                              <button type="button" onClick={() => clearStoredImage("bannerUrl", "Banner deleted")} className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <input type="file" accept="image/*" onChange={(event) => handleImageUpload(event.target.files?.[0], "Banner updated", (base64) => (prev) => ({ ...prev, bannerUrl: base64 }))} className="block w-full text-sm text-slate-400" />
                            {data.bannerUrl ? (
                              <img src={data.bannerUrl} alt="banner preview" className="mt-4 h-24 w-full rounded-xl object-cover" />
                            ) : (
                              <div className="mt-4 flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">No banner</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {adminPage === "videos" && (
                      <div>
                        <div className="mb-6 flex items-center justify-between gap-3">
                          <h3 className="text-4xl font-black text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>🎬 Video Posts</h3>
                          <button type="button" onClick={() => saveData((prev) => ({ ...prev, videos: [{ id: createId(), title: "New Video", description: "Add video details", thumbnail: "", thumbnails: ["", "", ""], videoUrl: "", views: "0 views", uploadTime: "Now" }, ...prev.videos] }), "Video card added")} className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-4 py-3 font-bold text-black">
                            <Plus className="h-4 w-4" /> Add Video
                          </button>
                        </div>
                        <div className="space-y-4">
                          {data.videos.map((video) => (
                            <div key={video.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                              <div className="mb-4 flex items-center justify-between gap-4">
                                <div className="text-2xl font-bold text-white">{video.title || "Untitled Video"}</div>
                                <button type="button" onClick={() => saveData((prev) => ({ ...prev, videos: prev.videos.filter((item) => item.id !== video.id) }), "Video removed")} className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-300">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <Input label="Video Title" value={video.title} onChange={(event) => updateVideo(video.id, { title: event.target.value })} />
                                <Input label="YouTube / Video Link" value={video.videoUrl} onChange={(event) => updateVideo(video.id, { videoUrl: event.target.value })} />
                                <Input label="Views Text" value={video.views} onChange={(event) => updateVideo(video.id, { views: event.target.value })} />
                                <Input label="Upload Time" value={video.uploadTime} onChange={(event) => updateVideo(video.id, { uploadTime: event.target.value })} />
                              </div>
                              <div className="mt-4">
                                <Textarea label="Description" value={video.description} onChange={(event) => updateVideo(video.id, { description: event.target.value })} />
                              </div>
                              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                                <div className="mb-3 text-lg font-semibold text-white">Thumbnail Upload Sections</div>
                                <div className="grid gap-4 md:grid-cols-3">
                                  {[0, 1, 2].map((thumbIndex) => {
                                    const thumbValue = video.thumbnails?.[thumbIndex] || "";
                                    return (
                                      <div key={`${video.id}-thumb-${thumbIndex}`} className="rounded-2xl border border-slate-700 bg-slate-950/80 p-3">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                          <div className="text-sm font-bold text-slate-300">Thumbnail {thumbIndex + 1}</div>
                                          <button type="button" onClick={() => {
                                            const nextThumbs = [...(video.thumbnails || ["", "", ""]), "", ""].slice(0, 3);
                                            nextThumbs[thumbIndex] = "";
                                            updateVideo(video.id, { thumbnails: nextThumbs, thumbnail: nextThumbs.find(Boolean) || "" });
                                          }} className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20">
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                        <input type="file" accept="image/*" onChange={(event) => handleImageUpload(event.target.files?.[0], `Thumbnail ${thumbIndex + 1} uploaded`, (base64) => (prev) => ({
                                          ...prev,
                                          videos: prev.videos.map((item) => {
                                            if (item.id !== video.id) {
                                              return item;
                                            }
                                            const nextThumbs = [...(item.thumbnails || ["", "", ""]), "", ""].slice(0, 3);
                                            nextThumbs[thumbIndex] = base64;
                                            return { ...item, thumbnails: nextThumbs, thumbnail: nextThumbs.find(Boolean) || "" };
                                          }),
                                        }))} className="block w-full text-sm text-slate-400" />
                                        {thumbValue ? (
                                          <img src={thumbValue} alt={`thumb-${thumbIndex + 1}`} className="mt-3 aspect-video w-full rounded-xl object-cover" />
                                        ) : (
                                          <div className="mt-3 flex aspect-video items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">No thumbnail</div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {adminPage === "notifications" && (
                      <div>
                        <div className="mb-6 flex items-center justify-between gap-3">
                          <h3 className="text-4xl font-black text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>🔔 Notifications</h3>
                          <button type="button" onClick={() => saveData((prev) => ({ ...prev, notifications: [{ id: createId(), title: "New Notification", text: "Write update here", link: "", date: "Today" }, ...prev.notifications] }), "Notification added")} className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-4 py-3 font-bold text-black">
                            <Plus className="h-4 w-4" /> Add Notification
                          </button>
                        </div>
                        <div className="space-y-4">
                          {data.notifications.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                              <div className="mb-4 flex items-center justify-between gap-4">
                                <div className="text-2xl font-bold text-white">{item.title || "Notification"}</div>
                                <button type="button" onClick={() => saveData((prev) => ({ ...prev, notifications: prev.notifications.filter((entry) => entry.id !== item.id) }), "Notification removed")} className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-300">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <Input label="Title" value={item.title} onChange={(event) => updateNotification(item.id, { title: event.target.value })} />
                                <Input label="Date / Badge" value={item.date} onChange={(event) => updateNotification(item.id, { date: event.target.value })} />
                              </div>
                              <div className="mt-4 grid gap-4">
                                <Textarea label="Text" value={item.text} onChange={(event) => updateNotification(item.id, { text: event.target.value })} />
                                <Input label="Link (optional)" value={item.link} onChange={(event) => updateNotification(item.id, { link: event.target.value })} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {adminPage === "brands" && (
                      <div>
                        <div className="mb-6 flex items-center justify-between gap-3">
                          <h3 className="text-4xl font-black text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>🤝 Brand Cards</h3>
                          <button type="button" onClick={() => saveData((prev) => ({ ...prev, brands: [...prev.brands, { id: createId(), icon: "growth", title: "New Brand Benefit", text: "Write details here" }] }), "Brand card added")} className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-4 py-3 font-bold text-black">
                            <Plus className="h-4 w-4" /> Add Card
                          </button>
                        </div>
                        <div className="space-y-4">
                          {data.brands.map((brand) => (
                            <div key={brand.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                              <div className="mb-4 flex items-center justify-between gap-4">
                                <div className="text-2xl font-bold text-white">{brand.title || "Brand card"}</div>
                                <button type="button" onClick={() => saveData((prev) => ({ ...prev, brands: prev.brands.filter((entry) => entry.id !== brand.id) }), "Brand card removed")} className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-300">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <Input label="Card Title" value={brand.title} onChange={(event) => updateBrand(brand.id, { title: event.target.value })} />
                                <label className="block space-y-2">
                                  <span className="text-sm font-semibold text-slate-300 md:text-base">Icon Type</span>
                                  <select value={brand.icon} onChange={(event) => updateBrand(brand.id, { icon: event.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-white outline-none">
                                    <option value="growth">Growth</option>
                                    <option value="verified">Verified</option>
                                    <option value="premium">Premium</option>
                                  </select>
                                </label>
                              </div>
                              <div className="mt-4">
                                <Textarea label="Card Text" value={brand.text} onChange={(event) => updateBrand(brand.id, { text: event.target.value })} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {adminPage === "contact" && (
                      <div>
                        <h3 className="mb-6 text-4xl font-black text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>📩 Contact Links</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input label="Contact Email" value={data.contactEmail} onChange={(event) => saveData((prev) => ({ ...prev, contactEmail: event.target.value }), "Contact updated")} />
                          <Input label="Contact Phone" value={data.contactPhone} onChange={(event) => saveData((prev) => ({ ...prev, contactPhone: event.target.value }), "Contact updated")} />
                          <Input label="YouTube Link" value={data.youtubeLink} onChange={(event) => saveData((prev) => ({ ...prev, youtubeLink: event.target.value }), "Contact updated")} />
                          <Input label="Instagram Link" value={data.instagram} onChange={(event) => saveData((prev) => ({ ...prev, instagram: event.target.value }), "Contact updated")} />
                          <Input label="Facebook Link" value={data.facebook} onChange={(event) => saveData((prev) => ({ ...prev, facebook: event.target.value }), "Contact updated")} />
                          <Input label="Telegram Link" value={data.telegram} onChange={(event) => saveData((prev) => ({ ...prev, telegram: event.target.value }), "Contact updated")} />
                        </div>
                        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-slate-400">
                          Tip: yaha jo links aur details bharoge woh website me instantly update ho jayenge. Static website hone ke baad bhi yeh demo admin panel IndexedDB aur localStorage me data save karta hai.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {brandFormOpen ? (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-[28px] border border-slate-700 bg-[#08101d] p-6 shadow-[0_0_35px_rgba(34,211,238,.14)] md:p-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-black text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    Brand Deal Contact Form
                  </h3>
                  <p className="mt-2 text-slate-400">Fill the form and send your enquiry.</p>
                </div>
                <button type="button" onClick={closeBrandForm} className="rounded-xl border border-slate-700 p-2 hover:bg-slate-900">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <iframe name="brand-form-target" title="brand-form-target" className="hidden" />
              <form
                action={`https://formsubmit.co/${BRAND_FORM_EMAIL}`}
                method="POST"
                target="brand-form-target"
                onSubmit={handleBrandSubmit}
                className="grid gap-4 md:grid-cols-2"
              >
                <input type="hidden" name="_subject" value="New Brand Deal Inquiry" />
                <input type="hidden" name="_captcha" value="false" />
                <input type="hidden" name="_template" value="table" />

                <Input
                  label="Your Name"
                  name="name"
                  value={brandForm.name}
                  onChange={(event) => handleBrandFormChange("name", event.target.value)}
                  placeholder="Enter your name"
                  required
                />
                <Input
                  label="Your Email"
                  type="email"
                  name="email"
                  value={brandForm.email}
                  onChange={(event) => handleBrandFormChange("email", event.target.value)}
                  placeholder="Enter your email"
                  required
                />
                <Input
                  label="Brand Name"
                  name="brand"
                  value={brandForm.brand}
                  onChange={(event) => handleBrandFormChange("brand", event.target.value)}
                  placeholder="Enter brand/company name"
                  required
                />
                <Input
                  label="Contact Number"
                  name="phone"
                  value={brandForm.phone}
                  onChange={(event) => handleBrandFormChange("phone", event.target.value)}
                  placeholder="Enter contact number"
                  required
                />
                <div className="md:col-span-2">
                  <Textarea
                    label="Message"
                    name="message"
                    value={brandForm.message}
                    onChange={(event) => handleBrandFormChange("message", event.target.value)}
                    placeholder="Tell me about your brand deal or collaboration"
                    required
                  />
                </div>
                <div className="md:col-span-2 text-center">
                  <button type="submit" className="inline-flex items-center gap-3 rounded-xl bg-cyan-500 px-8 py-4 text-lg font-black uppercase tracking-wide text-black shadow-[0_0_30px_rgba(34,211,238,.2)] hover:scale-[1.02]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    <Send className="h-5 w-5" /> Send Enquiry
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-2xl border border-slate-700 bg-black/90 px-5 py-3 text-lg font-semibold text-white shadow-[0_0_25px_rgba(57,255,20,.14)]">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

export default App;
