import React, { useState } from "react";
import { Coins, Flame, TrendingUp, CheckCircle, XCircle, Award, Receipt } from "lucide-react";

interface RedemptionRequest {
  id: string;
  userId: string;
  userName: string;
  email: string;
  coinsRequested: number;
  monetaryValue: number;
  paymentMethod: "bKash" | "Nagad" | "Rocket" | "Coupon Exchange";
  paymentNumber?: string;
  status: "pending" | "approved" | "rejected";
  timestamp: string;
}

export const CoinEconomy: React.FC = () => {
  // Coin Metric Cards State
  const [totalCirculation, setTotalCirculation] = useState(1284500);
  const [coinsGeneratedToday, setCoinsGeneratedToday] = useState(45200);
  const [taxBurnedCoins, setTaxBurnedCoins] = useState(18900);

  // Redemption Requests State
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([
    {
      id: "red_001",
      userId: "u_shakil",
      userName: "Shakil Khan",
      email: "shakil.mate@gmail.com",
      coinsRequested: 500,
      monetaryValue: 50,
      paymentMethod: "bKash",
      paymentNumber: "01788736452",
      status: "pending",
      timestamp: new Date(Date.now() - 30 * 60000).toLocaleString("bn-BD"),
    },
    {
      id: "red_002",
      userId: "u_mumu",
      userName: "Nusrat Mumu",
      email: "mumu123@yahoo.com",
      coinsRequested: 1000,
      monetaryValue: 100,
      paymentMethod: "Nagad",
      paymentNumber: "01944723910",
      status: "pending",
      timestamp: new Date(Date.now() - 90 * 60000).toLocaleString("bn-BD"),
    },
    {
      id: "red_003",
      userId: "u_jamil",
      userName: "Jamil Chowdhury",
      email: "jamil_chowdhury@outlook.com",
      coinsRequested: 300,
      monetaryValue: 30,
      paymentMethod: "Coupon Exchange",
      status: "pending",
      timestamp: new Date(Date.now() - 150 * 60000).toLocaleString("bn-BD"),
    },
  ]);

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleApprove = (id: string, coins: number) => {
    // Smoothly update state
    setRedemptions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" as const } : r))
    );
    
    // Animate out row after action
    setTimeout(() => {
      setRedemptions((prev) => prev.filter((r) => r.id !== id));
    }, 1500);

    // Sync metrics (burning/reducing total circulation)
    setTotalCirculation((prev) => prev - coins);
    setTaxBurnedCoins((prev) => prev + Math.floor(coins * 0.05)); // 5% coin tax/burn on withdrawals

    setFeedbackMsg({
      text: `আবেদন সফলভাবে অনুমোদন করা হয়েছে! ${coins} কয়েন ডিক্রিমেন্ট করা হয়েছে।`,
      type: "success",
    });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleReject = (id: string) => {
    setRedemptions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" as const } : r))
    );

    setTimeout(() => {
      setRedemptions((prev) => prev.filter((r) => r.id !== id));
    }, 1500);

    setFeedbackMsg({
      text: "আবেদনটি বাতিল করা হয়েছে এবং গ্রাহককে অবহিত করা হয়েছে।",
      type: "error",
    });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div id="coin-economy-panel" className="space-y-6 font-sans">
      {/* 3 Metric cards for Coins */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Circulation */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden border border-amber-400/20">
          <div className="absolute right-[-10px] bottom-[-20px] opacity-15 pointer-events-none">
            <Coins size={140} />
          </div>
          <p className="text-[10px] text-amber-100 font-extrabold uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Coins size={14} /> Circulating Coins • মোট কয়েন
          </p>
          <h4 className="text-3xl font-black">{totalCirculation.toLocaleString()}</h4>
          <p className="text-[10px] text-amber-50/70 mt-2 font-bold">
            গ্রাহকদের অল-টাইম ইনকাম করা সচল ভার্চুয়াল কয়েন সংখ্যা
          </p>
        </div>

        {/* Coins Generated Today */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden border border-indigo-400/20">
          <div className="absolute right-[-10px] bottom-[-20px] opacity-15 pointer-events-none">
            <TrendingUp size={140} />
          </div>
          <p className="text-[10px] text-indigo-100 font-extrabold uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} /> Generated Today • আজ জেনারেট হয়েছে
          </p>
          <h4 className="text-3xl font-black">+{coinsGeneratedToday.toLocaleString()}</h4>
          <p className="text-[10px] text-indigo-50/70 mt-2 font-bold">
            আজকে গ্রাহকেরা কাজ সম্পন্ন করে জেনারেট করেছেন
          </p>
        </div>

        {/* Tax / Burned Coins */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden border border-rose-400/20">
          <div className="absolute right-[-10px] bottom-[-20px] opacity-15 pointer-events-none">
            <Flame size={140} />
          </div>
          <p className="text-[10px] text-rose-100 font-extrabold uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Flame size={14} /> Burned & Taxed • উইথড্রয়াল ভ্যাট বা বার্ন
          </p>
          <h4 className="text-3xl font-black">{taxBurnedCoins.toLocaleString()}</h4>
          <p className="text-[10px] text-rose-50/70 mt-2 font-bold">
            কয়েন এক্সচেঞ্জ ফি, ট্যাক্স ও চিরস্থায়ীভাবে বার্নড কয়েন সংখ্যা
          </p>
        </div>
      </div>

      {/* Floating feedback alert */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-black transition-all flex items-center gap-2 ${
          feedbackMsg.type === "success" 
            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-200" 
            : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border-rose-200"
        }`}>
          <span>🔔</span> {feedbackMsg.text}
        </div>
      )}

      {/* Pending Redemptions Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-xl font-sans">
        <div className="mb-5">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Receipt size={20} className="text-amber-500" />
            Pending Redemptions • পেন্ডিং পেমেন্ট আবেদনসমূহ
          </h3>
          <p className="text-xs text-gray-400 dark:text-slate-300 mt-1">
            গ্রাহক যখন টাকা বা ডিসকাউন্ট কুপনের বিনিময়ে কয়েন ক্যাশ আউটের আবেদন সাবমিট করেন, তা এখানে আসে।
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-150 dark:border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-150 dark:border-white/5 text-[10px] text-gray-450 dark:text-slate-400 uppercase tracking-widest font-black">
                  <th className="p-4">User Details</th>
                  <th className="p-4">Exchangeable Coins</th>
                  <th className="p-4">Paid Amount (TK)</th>
                  <th className="p-4">Withdrawal Gateway</th>
                  <th className="p-4">Requested At</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-white/5 font-medium">
                {redemptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-400 font-bold bg-gray-50/50 dark:bg-slate-950/20">
                      কোন পেন্ডিং কয়েন ক্যাশআউট রিকোয়েস্ট নেই!
                    </td>
                  </tr>
                ) : (
                  redemptions.map((req) => (
                    <tr
                      key={req.id}
                      className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all ${
                        req.status === "approved"
                          ? "bg-emerald-500/10 opacity-60 text-emerald-600"
                          : req.status === "rejected"
                            ? "bg-rose-500/10 opacity-60 text-rose-600"
                            : ""
                      }`}
                    >
                      <td className="p-4">
                        <p className="font-extrabold text-gray-900 dark:text-white text-sm">
                          {req.userName}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {req.email}
                        </p>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-500 dark:text-amber-400 font-black rounded-lg">
                          🪙 {req.coinsRequested} Coins
                        </span>
                      </td>
                      <td className="p-4 font-black text-gray-900 dark:text-white text-sm">
                        ৳{req.monetaryValue}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold rounded text-[9px] uppercase tracking-wider">
                            {req.paymentMethod}
                          </span>
                          {req.paymentNumber && (
                            <span className="font-mono font-black text-xs text-gray-800 dark:text-white select-all">
                              {req.paymentNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-400 font-bold">{req.timestamp}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            req.status === "approved"
                              ? "bg-emerald-500/20 text-emerald-500"
                              : req.status === "rejected"
                                ? "bg-rose-500/20 text-rose-500"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse"
                          }`}
                        >
                          {req.status === "approved" ? "সফল" : req.status === "rejected" ? "বাতিল" : "পেন্ডিং"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1.5">
                        <button
                          type="button"
                          disabled={req.status !== "pending"}
                          onClick={() => handleApprove(req.id, req.coinsRequested)}
                          className={`p-2 rounded-xl transition-all font-black text-[10px] inline-flex items-center gap-1 hover:scale-105 active:scale-95 cursor-pointer ${
                            req.status !== "pending"
                              ? "opacity-30 cursor-not-allowed bg-gray-100 text-gray-450 dark:bg-slate-800/20 dark:text-slate-500"
                              : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                          }`}
                          title="Approve Cash Out"
                        >
                          <CheckCircle size={14} /> অনুমোদন
                        </button>
                        <button
                          type="button"
                          disabled={req.status !== "pending"}
                          onClick={() => handleReject(req.id)}
                          className={`p-2 rounded-xl transition-all font-black text-[10px] inline-flex items-center gap-1 hover:scale-105 active:scale-95 cursor-pointer ${
                            req.status !== "pending"
                              ? "opacity-30 cursor-not-allowed bg-gray-100 text-gray-450 dark:bg-slate-800/20 dark:text-slate-500"
                              : "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20"
                          }`}
                          title="Reject Cash Out"
                        >
                          <XCircle size={14} /> বাতিল
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
