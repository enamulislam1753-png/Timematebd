import React, { useState } from "react";
import { Ban, ShieldAlert, Smartphone, Clock, UserMinus, ShieldCheck } from "lucide-react";

interface SuspiciousActivity {
  id: string;
  userId: string;
  userName: string;
  deviceId: string;
  triggerReason: string;
  timestamp: string;
  severity: "high" | "medium" | "low";
  coinsEarned?: number;
}

export const SecurityHub: React.FC = () => {
  const [logs, setLogs] = useState<SuspiciousActivity[]>([]);

  const [bannedUsers, setBannedUsers] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleBanUser = (userId: string) => {
    setIsProcessing(userId);
    // Simulate real API latency
    setTimeout(() => {
      setBannedUsers((prev) => [...prev, userId]);
      setLogs((prev) => prev.filter((log) => log.userId !== userId));
      setIsProcessing(null);
    }, 800);
  };

  return (
    <div id="security-hub-panel" className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-xl font-sans text-slate-800 dark:text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight flex items-center gap-2">
            <ShieldAlert size={22} className="text-rose-600" />
            Security Hub & Fraud Patrol
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            রিয়েল-টাইম অস্বাভাবিক কয়েন বা স্পিন অ্যাক্টিভিটি ডিটেকশন এবং ইউজার সিকিউরিটি লক।
          </p>
        </div>
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 px-4 py-2 rounded-xl text-rose-600 dark:text-rose-450 text-xs font-black border border-rose-200/40">
          <span>🚨</span> {logs.length} Suspicious Events Detected
        </div>
      </div>

      {/* Main Suspicious Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-150 dark:border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-150 dark:border-white/5 text-[10px] text-gray-550 dark:text-slate-400 uppercase tracking-wider font-black">
                <th className="p-4">User ID / Username</th>
                <th className="p-4">Device ID</th>
                <th className="p-4">Trigger Reason</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-white/5">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 font-bold bg-gray-50/50 dark:bg-slate-950/20">
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <ShieldCheck size={40} className="text-emerald-500 animate-bounce" />
                      <p className="text-sm text-emerald-500">আপনার সিস্টেম সম্পূর্ণ নিরাপদ! কোন হ্যাক বা অস্বাভাবিক কার্যক্রম পাওয়া যায়নি।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isBanned = bannedUsers.includes(log.userId);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-red-50/40 dark:hover:bg-rose-950/10 transition-colors bg-red-50 dark:bg-rose-950/5"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            log.severity === "high" ? "bg-red-500 animate-ping" : log.severity === "medium" ? "bg-amber-550" : "bg-blue-500"
                          }`} />
                          <div>
                            <p className="font-extrabold text-gray-900 dark:text-white text-sm select-all">
                              {log.userId}
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                              {log.userName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-gray-700 dark:text-slate-300">
                          <Smartphone size={14} className="text-gray-400" />
                          {log.deviceId}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                          log.severity === "high"
                            ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20"
                            : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                        }`}>
                          ☠️ {log.triggerReason}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-extrabold text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-1 border-none">
                        <Clock size={13} className="text-gray-400" />
                        {log.timestamp}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          disabled={isBanned || isProcessing === log.userId}
                          onClick={() => handleBanUser(log.userId)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ml-auto cursor-pointer ${
                            isBanned
                              ? "bg-gray-200 text-gray-400 dark:bg-white/5 dark:text-slate-500 cursor-not-allowed"
                              : "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/10"
                          }`}
                        >
                          <Ban size={12} />
                          {isProcessing === log.userId ? "প্রসেস হচ্ছে..." : isBanned ? "ব্যান্ড করা হয়েছে" : "ব্যান করুন (Ban User)"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
