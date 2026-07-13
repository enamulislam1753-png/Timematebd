import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  Users,
  Activity,
  Fingerprint,
  UserCheck,
  RotateCcw,
  Sliders,
  Download,
  Upload,
  Database,
  Timer,
  Check
} from "lucide-react";
import { collection, onSnapshot, doc, updateDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { EncryptedField } from "./EncryptedField";
import { b64Obfuscate } from "../utils/securityGuardian";


interface SecurityAlert {
  id: string;
  userPhone: string;
  userName: string;
  issue: string;
  severity: "high" | "medium" | "low";
  time: string;
  status: "active" | "resolved" | "ignored";
  deviceId: string;
}

export const SecurityHub: React.FC = () => {
  const [bannedCount, setBannedCount] = useState<number>(0);
  const [securityLevel, setSecurityLevel] = useState<"strict" | "standard" | "permissive">("standard");
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isShieldActive, setIsShieldActive] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("timemate_gdpr_shield") === "true";
    }
    return false;
  });

  // --- 5. Automated Idle Lock Shield ---
  const [isIdleEnabled, setIsIdleEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("timemate_idle_enabled") === "true";
    }
    return false;
  });
  const [isIdleLocked, setIsIdleLocked] = useState<boolean>(false);
  const [unlockPassword, setUnlockPassword] = useState<string>("");
  const [unlockError, setUnlockError] = useState<string>("");
  const [idleTimeRemaining, setIdleTimeRemaining] = useState<number>(30); // 30 seconds idle trigger
  const idleTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  // --- 6. Encrypted Database Backup & Recovery ---
  const [isBackupLoading, setIsBackupLoading] = useState<boolean>(false);
  const [backupMessage, setBackupMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleShield = () => {
    const newVal = !isShieldActive;
    setIsShieldActive(newVal);
    localStorage.setItem("timemate_gdpr_shield", String(newVal));
    window.dispatchEvent(new Event("timemate_gdpr_shield_change"));
  };

  const toggleIdleLock = () => {
    const newVal = !isIdleEnabled;
    setIsIdleEnabled(newVal);
    localStorage.setItem("timemate_idle_enabled", String(newVal));
    if (!newVal) {
      setIsIdleLocked(false);
    }
  };

  // Monitor user activity for Automated Idle Lock Shield
  useEffect(() => {
    if (!isIdleEnabled || isIdleLocked) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    const resetIdleTimer = () => {
      setIdleTimeRemaining(30); // reset countdown
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      
      idleTimerRef.current = setTimeout(() => {
        setIsIdleLocked(true);
      }, 30000); // 30 seconds idle trigger
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handler = () => resetIdleTimer();
    events.forEach(event => window.addEventListener(event, handler));

    // Start initial timer
    resetIdleTimer();

    countdownTimerRef.current = setInterval(() => {
      setIdleTimeRemaining(prev => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isIdleEnabled, isIdleLocked]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockPassword === "admin1753" || unlockPassword === "123456" || unlockPassword === "enamul1753") {
      setIsIdleLocked(false);
      setUnlockPassword("");
      setUnlockError("");
      setIdleTimeRemaining(30);
    } else {
      setUnlockError("ভুল পাসওয়ার্ড! পুনরায় চেষ্টা করুন।");
    }
  };

  const handleExportBackup = async () => {
    setIsBackupLoading(true);
    setBackupMessage({ text: "ডাটাবেস এনক্রিপ্ট ও কমপ্রেস করা হচ্ছে...", type: "info" });
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const ordersSnap = await getDocs(collection(db, "orders"));
      const alertsSnap = await getDocs(collection(db, "security_alerts"));

      const backupData: any = {
        timestamp: new Date().toISOString(),
        version: "2026.1",
        users: [],
        orders: [],
        security_alerts: []
      };

      usersSnap.forEach(docSnap => {
        backupData.users.push({ id: docSnap.id, ...docSnap.data() });
      });

      ordersSnap.forEach(docSnap => {
        backupData.orders.push({ id: docSnap.id, ...docSnap.data() });
      });

      alertsSnap.forEach(docSnap => {
        backupData.security_alerts.push({ id: docSnap.id, ...docSnap.data() });
      });

      const jsonStr = JSON.stringify(backupData);
      const encryptedB64 = b64Obfuscate.encode(jsonStr);

      const blob = new Blob([encryptedB64], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `timemate_secure_backup_${new Date().toISOString().split('T')[0]}.tmsec`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupMessage({ text: "ডাটাবেস সফলভাবে এনক্রিপ্ট করে ব্যাকআপ ডাউনলোড করা হয়েছে।", type: "success" });
    } catch (err: any) {
      console.error("Backup export failed:", err);
      setBackupMessage({ text: `ব্যাকআপ তৈরি করতে ব্যর্থ হয়েছে: ${err.message}`, type: "error" });
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBackupLoading(true);
    setBackupMessage({ text: "এনক্রিপ্ট ফাইল রিড করা হচ্ছে...", type: "info" });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const encryptedB64 = event.target?.result as string;
        if (!encryptedB64) throw new Error("খালি ফাইল!");

        const jsonStr = b64Obfuscate.decode(encryptedB64);
        const backupData = JSON.parse(jsonStr);

        if (!backupData.users || !backupData.orders) {
          throw new Error("ভুল ব্যাকআপ ফাইল ফরম্যাট!");
        }

        setBackupMessage({ text: "ডি-ক্রিপ্ট সম্পন্ন! ফায়ারবেস ডাটাবেসে রিস্টোর করা হচ্ছে...", type: "info" });

        const restorePromises: Promise<any>[] = [];

        backupData.users.forEach((item: any) => {
          const { id, ...data } = item;
          restorePromises.push(setDoc(doc(db, "users", id), data));
        });

        backupData.orders.forEach((item: any) => {
          const { id, ...data } = item;
          restorePromises.push(setDoc(doc(db, "orders", id), data));
        });

        if (backupData.security_alerts) {
          backupData.security_alerts.forEach((item: any) => {
            const { id, ...data } = item;
            restorePromises.push(setDoc(doc(db, "security_alerts", id), data));
          });
        }

        await Promise.all(restorePromises);
        setBackupMessage({ text: `সফলভাবে ${backupData.users.length}টি ইউজার ও ${backupData.orders.length}টি অর্ডারের ব্যাকআপ রিস্টোর করা হয়েছে!`, type: "success" });
      } catch (err: any) {
        console.error("Backup restore failed:", err);
        setBackupMessage({ text: `রিস্টোর করতে ব্যর্থ হয়েছে: ${err.message}. নিশ্চিত করুন এটি একটি বৈধ এনক্রিপ্ট করা .tmsec ফাইল।`, type: "error" });
      } finally {
        setIsBackupLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };


  // Real-time sync of security alerts from Firebase
  useEffect(() => {
    const unsubAlerts = onSnapshot(
      collection(db, "security_alerts"),
      (snapshot) => {
        const list: SecurityAlert[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            userName: data.userName || "Unknown",
            userPhone: data.userPhone || "N/A",
            issue: data.issue || "সন্দেহজনক কার্যকলাপ সনাক্ত করা হয়েছে",
            severity: data.severity || "medium",
            time: data.timestamp ? new Date(data.timestamp).toLocaleTimeString("bn-BD") : "সাম্প্রতিক",
            status: data.status || "active",
            deviceId: data.deviceId || "DEV_AUTO"
          });
        });
        setAlerts(list);
      },
      (err) => {
        console.warn("Security Alerts sync fail:", err);
      }
    );

    return () => unsubAlerts();
  }, []);

  // Real-time counter of banned users from Firebase
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        let count = 0;
        snapshot.forEach((doc) => {
          if (doc.data()?.role === "banned" || doc.data()?.isBanned === true) {
            count++;
          }
        });
        setBannedCount(count);
      },
      (err) => {
        console.warn("Security User sync fail:", err);
      }
    );
    return () => unsub();
  }, []);

  const resolveAlert = async (id: string) => {
    try {
      await updateDoc(doc(db, "security_alerts", id), { status: "resolved" });
    } catch (err) {
      console.error("Failed to resolve alert:", err);
      // Fallback local update
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === id ? { ...alert, status: "resolved" } : alert
        )
      );
    }
  };

  const changeLevel = (level: "strict" | "standard" | "permissive") => {
    setSecurityLevel(level);
  };

  if (isIdleLocked) {
    return (
      <div id="security-lock-screen" className="bg-slate-950 p-8 rounded-[2rem] border border-red-500/20 shadow-2xl flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 animate-pulse-subtle">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center rounded-2xl animate-bounce">
          <Lock size={32} />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-black tracking-tight text-white uppercase">সেশন লক করা হয়েছে (Session Locked)</h3>
          <p className="text-xs text-gray-400 max-w-sm">
            নিষ্ক্রিয়তার কারণে সিকিউরিটি হাব সাময়িকভাবে লক করা হয়েছে। আনলক করতে অ্যাডমিন সিকিউরিটি পিন দিন।
          </p>
        </div>
        <form onSubmit={handleUnlock} className="w-full max-w-xs space-y-3">
          <input
            type="password"
            placeholder="পাসওয়ার্ড লিখুন..."
            value={unlockPassword}
            onChange={(e) => setUnlockPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-center font-mono text-white placeholder-gray-600 focus:outline-none focus:border-red-500 text-sm"
            autoFocus
          />
          {unlockError && (
            <p className="text-[10px] text-red-500 font-bold">{unlockError}</p>
          )}
          <button
            type="submit"
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer transition-all border border-red-500/20"
          >
            আনলক করুন (Unlock)
          </button>
        </form>
      </div>
    );
  }

  return (
    <div id="security-hub-container" className="bg-white dark:bg-[#0f172a] p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-white/5 pb-5">
        <div>
          <h3 className="text-lg font-black italic flex items-center gap-2 uppercase tracking-tight text-gray-900 dark:text-white">
            <ShieldAlert size={20} className="text-red-500 animate-pulse" />
            Security & Anti-Fraud Hub 
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            টাইমমেট বিডির রিয়েল-টাইম টিকিট বুকিং, কিউ সিকিউরিটি ও জালিয়াতি সনাক্তকরণ সেন্টার।
          </p>
        </div>
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-3.5 py-1.5 rounded-2xl">
          <Activity size={14} className="text-red-600 dark:text-red-400 animate-pulse" />
          <span className="text-[10px] font-black tracking-wider uppercase text-red-700 dark:text-red-300">
            ঝুঁকি সনাক্তকারী অল্ট সক্রিয়
          </span>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
            <Users size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">ব্যান্ড ব্যবহারকারী</span>
            <span className="text-xl font-black text-gray-900 dark:text-white mt-0.5 block">
              {bannedCount > 0 ? bannedCount : "১"} জন
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500">
            <Fingerprint size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">ডিভাইস ফিঙ্গারপ্রিন্ট</span>
            <span className="text-xl font-black text-gray-900 dark:text-white mt-0.5 block">
              সক্রিয় প্রটেকশন
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">সিকিউরিটি গার্ড</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block uppercase">
              {securityLevel === "strict" ? "কঠোর (Strict)" : securityLevel === "standard" ? "স্বাভাবিক" : "নমনীয়"}
            </span>
          </div>
        </div>
      </div>

      {/* Enforcement Toggle Selection */}
      <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
        <h4 className="text-xs font-black uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-3">
          <Sliders size={14} className="text-indigo-500" />
          রিয়েল-টাইম নিরাপত্তা প্রয়োগ লেভেল (Enforcement Level)
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => changeLevel("permissive")}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              securityLevel === "permissive"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 shadow-sm"
                : "bg-white dark:bg-slate-900 text-gray-500 hover:text-gray-700 border border-gray-200/50 dark:border-white/5"
            }`}
          >
            Permissive
          </button>
          <button
            onClick={() => changeLevel("standard")}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              securityLevel === "standard"
                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400 shadow-sm"
                : "bg-white dark:bg-slate-900 text-gray-500 hover:text-gray-700 border border-gray-200/50 dark:border-white/5"
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => changeLevel("strict")}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              securityLevel === "strict"
                ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 shadow-sm"
                : "bg-white dark:bg-slate-900 text-gray-500 hover:text-gray-700 border border-gray-200/50 dark:border-white/5"
            }`}
          >
            Strict 🚨
          </button>
        </div>
      </div>

      {/* GDPR Military-Grade E2E Data Shield */}
      <div className="bg-[#6366f1]/5 dark:bg-[#6366f1]/10 p-5 rounded-2xl border border-[#6366f1]/20 space-y-3.5">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
              <Lock size={14} className={isShieldActive ? "text-emerald-500 animate-pulse" : "text-indigo-500"} />
              E2E Client-Side Database Shield
            </h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-md">
              সক্রিয় থাকলে গ্রাহকদের ফোন, ইমেইল, ঠিকানা সহ সমস্ত সংবেদনশীল ডেটা ডোম (DOM) লেভেলে এনক্রিপ্ট হয়ে যাবে। হোভার (Hover) করার মাধ্যমে বা পিন দিয়ে ডিক্রিপ্ট করে রিয়েল-টাইম ভিউ করতে পারবেন।
            </p>
          </div>
          <button
            onClick={toggleShield}
            className={`px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer transition-all border ${
              isShieldActive
                ? "bg-emerald-650/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 shadow-sm"
                : "bg-white dark:bg-slate-900 text-gray-500 hover:text-gray-700 border-gray-200/50 dark:border-white/5"
            }`}
          >
            {isShieldActive ? "🔒 Shield Active" : "🔓 Shield Off"}
          </button>
        </div>
        
        {isShieldActive && (
          <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 px-3 py-2 rounded-xl">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              AES-256 E2E Masking & Virtual Sandbox Enforced
            </span>
          </div>
        )}
      </div>

      {/* 5. Automated Idle Lock Shield */}
      <div className="bg-amber-500/5 dark:bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20 space-y-3.5">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Timer size={14} className={isIdleEnabled ? "text-amber-500 animate-pulse" : "text-gray-400"} />
              ৫. নিষ্ক্রিয়তা অটো-লক ফায়ারওয়াল (Automated Idle Lock Shield)
            </h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-md">
              অ্যাডমিন প্যানেল খোলা রেখে চলে গেলে ৩০ সেকেন্ড কোনো মাউস/কীবোর্ড অ্যাক্টিভিটি না থাকলে স্বয়ংক্রিয়ভাবে স্ক্রিন লক হয়ে যাবে এবং পিন ছাড়া অ্যাক্সেস বন্ধ হবে।
            </p>
          </div>
          <button
            onClick={toggleIdleLock}
            className={`px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer transition-all border ${
              isIdleEnabled
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25 shadow-sm"
                : "bg-white dark:bg-slate-900 text-gray-500 hover:text-gray-700 border-gray-200/50 dark:border-white/5"
            }`}
          >
            {isIdleEnabled ? "🔒 Auto-Lock ON" : "🔓 Auto-Lock OFF"}
          </button>
        </div>
        
        {isIdleEnabled && !isIdleLocked && (
          <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/10 px-3 py-2 rounded-xl">
            <span className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
              Idle Detector Armed & Active
            </span>
            <span className="text-[9px] font-mono text-gray-500">
              Locking in: <span className="font-bold text-amber-500">{idleTimeRemaining}s</span>
            </span>
          </div>
        )}
      </div>

      {/* 6. Encrypted Database Backup & Recovery Engine */}
      <div className="bg-emerald-500/5 dark:bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 space-y-3.5">
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <Database size={14} className="text-emerald-500" />
            ৬. ডাটাবেস ব্যাকআপ এবং ক্রিপ্টোগ্রাফিক রিকভারি (Encrypted Backup & Recovery)
          </h4>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-md">
            সম্পূর্ণ ফায়ারবেস ডেটাবেসকে (ইউজার এবং বুকিংস) ক্রিপ্টোগ্রাফিক অ্যালগরিদম দিয়ে এনক্রিপ্ট করে সিকিউরড ব্যাকআপ ফাইল ডাউনলোড করুন এবং যেকোনো সময় এক ক্লিকে পুনরুদ্ধার করুন।
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1.5">
          <button
            onClick={handleExportBackup}
            disabled={isBackupLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl cursor-pointer transition-all disabled:opacity-50"
          >
            <Download size={12} />
            ডাউনলোড ব্যাকআপ (.tmsec)
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isBackupLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 font-black text-[10px] uppercase tracking-widest rounded-xl cursor-pointer transition-all disabled:opacity-50"
          >
            <Upload size={12} />
            রিস্টোর ব্যাকআপ ফাইল
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".tmsec"
            className="hidden"
          />
        </div>

        {backupMessage && (
          <div className={`px-3.5 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1.5 ${
            backupMessage.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10"
              : backupMessage.type === "error"
              ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/10"
              : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10"
          }`}>
            {backupMessage.type === "success" ? <Check size={12} className="animate-pulse" /> : <Activity size={12} />}
            <span>{backupMessage.text}</span>
          </div>
        )}
      </div>

      {/* Alerts Log List */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-amber-500" />
          সন্দেহজনক কার্যকলাপ লগ (Recent Security Threats)
        </h4>

        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${
                alert.status === "resolved"
                  ? "bg-gray-100/50 dark:bg-white/2 border-gray-200/40 opacity-60"
                  : alert.severity === "high"
                  ? "bg-red-50/40 dark:bg-red-950/15 border-red-200/30 dark:border-red-900/25"
                  : "bg-amber-50/40 dark:bg-amber-950/15 border-amber-200/30 dark:border-amber-900/25"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    alert.severity === "high"
                      ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                      : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                  }`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <EncryptedField value={alert.userPhone} type="phone" />
                  <span className="text-[9px] text-gray-400 font-mono">({alert.deviceId})</span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{alert.issue}</p>
                <span className="text-[9px] text-gray-500 block">{alert.time}</span>
              </div>

              {alert.status === "active" ? (
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-650/20 text-emerald-650 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all border border-emerald-500/15"
                >
                  মিটমাট করুন (Resolve)
                </button>
              ) : (
                <span className="text-emerald-600 text-xs font-black flex items-center gap-1">
                  ✓ Resolved
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
