import React, { useState, useEffect } from "react";
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
  Sliders
} from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

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
  const [alerts, setAlerts] = useState<SecurityAlert[]>([
    {
      id: "AL-109",
      userName: "Kazi Nabil",
      userPhone: "01823774612",
      issue: "একাধিক ভিন্ন ডিভাইস (৩টি আইপি) থেকে একই সাথে লগইনের চেষ্টা",
      severity: "high",
      time: "২ মিনিট আগে",
      status: "active",
      deviceId: "DEV_89AX99"
    },
    {
      id: "AL-108",
      userName: "Sabbir Ahmed",
      userPhone: "01918374821",
      issue: "অস্বাভাবিক স্পিন হুইল ও কয়েন রিকোয়েস্ট ফ্রিকোয়েন্সি (Rate Limit Trigger)",
      severity: "medium",
      time: "১০ মিনিট আগে",
      status: "active",
      deviceId: "DEV_33YY62"
    },
    {
      id: "AL-107",
      userName: "Unknown",
      userPhone: "01723114422",
      issue: "জিপিএস মক লোকেশন (Mock Location Detector) সক্রিয় রেখে টিকিট বুকিংয়ের চেষ্টা",
      severity: "high",
      time: "২৫ মিনিট আগে",
      status: "active",
      deviceId: "DEV_99JJ21"
    },
    {
      id: "AL-106",
      userName: "Mahbub Alam",
      userPhone: "01723114422",
      issue: "রুট করা ডিভাইস সনাক্ত করা হয়েছে (Device Integraty Fail)",
      severity: "low",
      time: "১ ঘন্টা আগে",
      status: "resolved",
      deviceId: "DEV_01PP39"
    }
  ]);

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

  const resolveAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, status: "resolved" } : alert
      )
    );
  };

  const changeLevel = (level: "strict" | "standard" | "permissive") => {
    setSecurityLevel(level);
  };

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
                  <span className="text-[11px] font-extrabold text-[#6366f1]">{alert.userPhone}</span>
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
