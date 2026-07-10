import React, { useState, useEffect } from "react";
import { Settings, Play, Users, RefreshCw, Sparkles, CheckCircle } from "lucide-react";
import { EncryptedField } from "./EncryptedField";


interface ServiceBooking {
  id: string;
  customerName: string;
  phone: string;
  serviceSelected: string;
  assignedTo: string;
  status: "Waiting" | "In Progress" | "Completed";
  timeScheduled: string;
}

export const OperationsControl: React.FC = () => {
  // Spin Wheel Probabilities State
  const [spinSettings, setSpinSettings] = useState({
    grandPrize: 0.5,
    megaReward: 4.5,
    mediumCoins: 15.0,
    smallReward: 50.0,
    tryAgain: 30.0,
  });

  const totalProb = Number(
    (
      spinSettings.grandPrize +
      spinSettings.megaReward +
      spinSettings.mediumCoins +
      spinSettings.smallReward +
      spinSettings.tryAgain
    ).toFixed(2)
  );

  // Lottery Draw Simulation State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawWinner, setDrawWinner] = useState<{ name: string; prize: string; id: string } | null>(null);

  // Active bookings list
  const [bookings, setBookings] = useState<ServiceBooking[]>([
    {
      id: "TM-401",
      customerName: "Kazi Nabil",
      phone: "01823774612",
      serviceSelected: "AC Complete Overhauling",
      assignedTo: "Milon Miah (PRO)",
      status: "In Progress",
      timeScheduled: "10:30 AM",
    },
    {
      id: "TM-402",
      customerName: "Mahbub Alam",
      phone: "01723114422",
      serviceSelected: "Apartment Sanitization",
      assignedTo: "Faruk Hossain",
      status: "Waiting",
      timeScheduled: "11:45 AM",
    },
    {
      id: "TM-403",
      customerName: "Sadia Sultana",
      phone: "01940992381",
      serviceSelected: "Professional Kitchen Deep Clean",
      assignedTo: "Rokeya Begum",
      status: "Waiting",
      timeScheduled: "12:15 PM",
    },
  ]);

  const handleProbChange = (field: keyof typeof spinSettings, value: string) => {
    const numericVal = parseFloat(value) || 0;
    setSpinSettings((prev) => ({
      ...prev,
      [field]: numericVal,
    }));
  };

  const handleLotteryDraw = () => {
    setIsDrawing(true);
    setDrawWinner(null);

    // Simulate lottery processing
    setTimeout(() => {
      const candidates = ["Imran Ahmed", "Nabila Rahman", "Sharif Rayhan", "Sabrina Yesmin", "Adnan Chowdhury"];
      const randomWinner = candidates[Math.floor(Math.random() * candidates.length)];
      const prizes = ["iPhone 15 Pro", "5,000 Coins Bonus", "৳1,500 Mobile Cash Back", "Free Home Spa Premium Coupon"];
      const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];

      setDrawWinner({
        id: `WIN-${Math.floor(1000 + Math.random() * 9000)}`,
        name: randomWinner,
        prize: randomPrize,
      });
      setIsDrawing(false);
    }, 2500);
  };

  // Live timer or status generator simulates active booking updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Pick a random Waiting booking and advance it to In Progress, or complete it
      setBookings((prev) =>
        prev.map((b) => {
          if (b.status === "Waiting" && Math.random() > 0.6) {
            return { ...b, status: "In Progress" };
          } else if (b.status === "In Progress" && Math.random() > 0.8) {
            return { ...b, status: "Completed" };
          }
          return b;
        })
      );
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div id="operations-control-panel" className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
      
      {/* Box A - Spin Wheel settings form */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-xl font-sans">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-500">
            <Settings size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-tight">
              Spin Wheel Settings • স্পিন প্রোবাবিলিটি
            </h3>
            <p className="text-xs text-gray-400 dark:text-slate-400">
              ফরচুন স্পিন হুইল এর বিভিন্ন কয়েন বা গিফটের সম্ভাবনা হার সেট করুন।
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-amber-550 block">🎉 Grand Prize (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={spinSettings.grandPrize}
                onChange={(e) => handleProbChange("grandPrize", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/5 bg-gray-55 dark:bg-slate-950 text-xs font-bold text-gray-950 dark:text-white rounded-xl outline-none"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-indigo-500 block">💎 Mega Reward (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={spinSettings.megaReward}
                onChange={(e) => handleProbChange("megaReward", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/5 bg-gray-55 dark:bg-slate-950 text-xs font-bold text-gray-950 dark:text-white rounded-xl outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-emerald-500 block">🪙 Medium-Coins (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={spinSettings.mediumCoins}
                onChange={(e) => handleProbChange("mediumCoins", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/5 bg-gray-55 dark:bg-slate-950 text-xs font-bold text-gray-950 dark:text-white rounded-xl outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-blue-500 block">⭐ Small Reward (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={spinSettings.smallReward}
                onChange={(e) => handleProbChange("smallReward", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/5 bg-gray-55 dark:bg-slate-950 text-xs font-bold text-gray-950 dark:text-white rounded-xl outline-none"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-[10px] uppercase font-black text-gray-400 block">❌ Try Again (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={spinSettings.tryAgain}
                onChange={(e) => handleProbChange("tryAgain", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-white/5 bg-gray-55 dark:bg-slate-950 text-xs font-bold text-gray-950 dark:text-white rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-slate-950/20 rounded-2xl border border-gray-100 dark:border-white/5">
            <div className="flex justify-between text-xs font-black mb-1.5">
              <span className="text-gray-500 dark:text-slate-400">সর্বমোট সম্ভাব্যতা সূচক (Total Sum)</span>
              <span className={totalProb === 100 ? "text-emerald-500" : "text-rose-500 animate-pulse"}>
                {totalProb}%
              </span>
            </div>
            
            {/* ProgressBar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
              <div style={{ width: `${spinSettings.grandPrize}%` }} className="bg-amber-400 h-full" title="Grand Prize" />
              <div style={{ width: `${spinSettings.megaReward}%` }} className="bg-indigo-500 h-full" title="Mega Reward" />
              <div style={{ width: `${spinSettings.mediumCoins}%` }} className="bg-emerald-500 h-full" title="Medium Coins" />
              <div style={{ width: `${spinSettings.smallReward}%` }} className="bg-blue-500 h-full" title="Small Reward" />
              <div style={{ width: `${spinSettings.tryAgain}%` }} className="bg-gray-450 h-full" title="Try Again" />
            </div>

            {totalProb !== 100.0 && (
              <p className="text-[10px] text-rose-500 font-bold mt-1.5">
                🛑 অবধান করুন: সঠিক কার্যক্রমের স্বার্থে মোট যোগফল ১০০% হওয়া বাঞ্ছনীয়।
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Box B - Trigger Lottery and Active service queues */}
      <div className="space-y-6">
        
        {/* Draw Controller Card */}
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-40px] opacity-10 pointer-events-none">
            <Sparkles size={160} />
          </div>
          
          <h4 className="text-base font-black uppercase tracking-widest flex items-center gap-1.5 mb-2">
            🎈 Real-Time Lottery Draw • লাইভ লটারি ড্র
          </h4>
          <p className="text-xs text-indigo-100 leading-relaxed max-w-sm mb-5">
            সক্রিয়ভাবে ক্যাম্পেইনে অংশগ্রহণকারী লাখো গ্রাহকদের থেকে সার্ভার-সাইড র‍্যান্ডম এলগরিদম ব্যবহার করে বিজয়ী নির্বাচন করুন।
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              type="button"
              disabled={isDrawing}
              onClick={handleLotteryDraw}
              className="w-full sm:w-auto px-6 py-3 bg-white text-indigo-700 font-black rounded-xl text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isDrawing ? (
                <>
                  <RefreshCw className="animate-spin" size={14} />
                  ড্র রানিং...
                </>
              ) : (
                <>
                  <Play size={14} fill="currentColor" />
                  ড্র শুরু করুন (Trigger Draw)
                </>
              )}
            </button>
          </div>

          {/* Winner Display Panel */}
          {drawWinner && (
            <div className="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 animate-fade-in text-xs">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                ⭐ অভিনন্দন! ড্র সম্পন্ন হয়েছে:
              </p>
              <div className="flex justify-between items-center mt-2">
                <div>
                  <p className="text-sm font-black">{drawWinner.name}</p>
                  <p className="text-[10px] text-indigo-250 mt-1 font-mono">{drawWinner.id}</p>
                </div>
                <div className="px-3 py-1 bg-amber-500/20 text-yellow-300 border border-amber-500/30 font-black rounded-lg">
                  🎁 {drawWinner.prize}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Active Bookings List */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-xl font-sans">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users size={16} className="text-indigo-500" />
              Active Bookings Queue • চলমান সার্ভিসেস
            </h4>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="divide-y divide-gray-150 dark:divide-white/5">
            {bookings.map((booking) => (
              <div key={booking.id} className="py-3.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[9px] font-black text-indigo-500 px-1.5 py-0.5 bg-indigo-500/10 rounded">
                      {booking.id}
                    </span>
                    <span className="font-extrabold text-[#111] dark:text-white">
                      <EncryptedField value={booking.customerName} type="text" />
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 font-bold mt-1">
                    {booking.serviceSelected}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-0.5 font-bold">
                    🛡️ নিযুক্ত টিম: {booking.assignedTo}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    booking.status === "Completed"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : booking.status === "In Progress"
                        ? "bg-blue-500/10 text-blue-500 animate-pulse"
                        : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {booking.status === "Completed" ? "সম্পন্ন" : booking.status === "In Progress" ? "চলমান" : "অপেক্ষমান"}
                  </span>
                  <p className="text-[9px] text-gray-400 mt-1 font-mono font-bold">{booking.timeScheduled}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
