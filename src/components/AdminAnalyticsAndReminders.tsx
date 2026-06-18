import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Clock, 
  Bell, 
  User, 
  Plus, 
  Trash2, 
  TrendingUp, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  Send, 
  Heart, 
  Zap,
  Check,
  Calendar,
  Layers,
  Search
} from "lucide-react";
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  where 
} from "firebase/firestore";
import { db } from "../lib/firebase";

interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  serviceId: string;
  serviceTitle: string;
  status: string;
  price?: number;
  timestamp: any;
  createdAt?: string;
}

interface AppUser {
  id: string;
  uid: string;
  name: string;
  phone: string;
  role: string;
  createdAt?: string;
  coins?: number;
}

interface Reminder {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  title: string;
  message: string;
  status: "pending" | "sent" | "read" | "dismissed";
  scheduledTime?: string;
  createdAt: string;
  triggeredCount?: number;
}

interface Props {
  orders: Order[];
  allUsers: AppUser[];
  addToast: (msg: string) => void;
  trans: (bn: string, en?: string) => string;
  onNavigateToChat?: (customerUid: string, customerName: string, customerPhone: string) => void;
  onNavigateToReminder?: (userId: string) => void;
  prefilledUserId?: string;
}

export function AdminAnalyticsPanel({ orders, allUsers, addToast, trans, onNavigateToChat, onNavigateToReminder }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserHabit, setSelectedUserHabit] = useState<string | null>(null);

  // 1. Calculate highest order counts per user
  const userOrderStats = React.useMemo(() => {
    const stats: Record<string, {
      userId: string;
      userName: string;
      userPhone: string;
      orderCount: number;
      completedCount: number;
      spentAmount: number;
      orderTimes: Date[];
      services: Record<string, number>;
    }> = {};

    orders.forEach((o) => {
      if (!o.userId) return;
      const uId = o.userId;
      
      if (!stats[uId]) {
        // Fallback name/phone from order if user profile doesn't have it
        const fallbackName = o.userName || "Unknown User";
        const fallbackPhone = o.userPhone || "N/A";
        const matchedProfile = allUsers.find(u => u.uid === uId || u.id === uId);
        
        stats[uId] = {
          userId: uId,
          userName: matchedProfile?.name || fallbackName,
          userPhone: matchedProfile?.phone || fallbackPhone,
          orderCount: 0,
          completedCount: 0,
          spentAmount: 0,
          orderTimes: [],
          services: {}
        };
      }

      stats[uId].orderCount += 1;
      if (o.status === "সম্পন্ন") {
        stats[uId].completedCount += 1;
        if (o.price && !isNaN(o.price)) {
          stats[uId].spentAmount += Number(o.price);
        }
      }

      // Track order hour
      if (o.timestamp) {
        try {
          const date = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp);
          stats[uId].orderTimes.push(date);
        } catch (_) {}
      }

      if (o.serviceTitle) {
        stats[uId].services[o.serviceTitle] = (stats[uId].services[o.serviceTitle] || 0) + 1;
      }
    });

    return Object.values(stats).sort((a, b) => b.orderCount - a.orderCount);
  }, [orders, allUsers]);

  const peakHourStats = React.useMemo(() => {
    const hours = Array(24).fill(0);
    orders.forEach((o) => {
      if (o.timestamp) {
        try {
          const date = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp);
          hours[date.getHours()] += 1;
        } catch (_) {}
      }
    });
    return hours;
  }, [orders]);

  const maxHour = React.useMemo(() => {
    let maxVal = -1;
    let maxHr = 18; // default to 6PM
    peakHourStats.forEach((v, index) => {
      if (v > maxVal) {
        maxVal = v;
        maxHr = index;
      }
    });
    return maxHr;
  }, [peakHourStats]);

  // Identify recurring patterns for users with > 2 orders
  const identifiedHabits = React.useMemo(() => {
    return userOrderStats
      .filter(stat => stat.orderCount >= 2)
      .map(stat => {
        const total = stat.orderTimes.length;
        let nightCount = 0; // 10 PM - 5 AM
        let morningCount = 0; // 5 AM - 12 PM
        let afternoonCount = 0; // 12 PM - 5 PM
        let eveningCount = 0; // 5 PM - 10 PM

        stat.orderTimes.forEach(d => {
          const hr = d.getHours();
          if (hr >= 22 || hr < 5) nightCount++;
          else if (hr >= 5 && hr < 12) morningCount++;
          else if (hr >= 12 && hr < 17) afternoonCount++;
          else eveningCount++;
        });

        let peakTimeLabel = trans("বিকালে (Afternoon)", "Afternoon");
        let cycleType = "afternoon";
        let maxC = afternoonCount;

        if (nightCount > maxC) {
          peakTimeLabel = trans("গভীর রাতে (Late Night)", "Late Night (10PM - 5AM)");
          cycleType = "night";
          maxC = nightCount;
        }
        if (morningCount > maxC) {
          peakTimeLabel = trans("সকালে (Morning)", "Morning (5AM - 12PM)");
          cycleType = "morning";
          maxC = morningCount;
        }
        if (eveningCount > maxC) {
          peakTimeLabel = trans("সন্ধ্যায় (Evening)", "Evening (5PM - 10PM)");
          cycleType = "evening";
          maxC = eveningCount;
        }

        // Get favorite service
        let favService = trans("বহুমুখী সেবা", "Multi-Service");
        let maxS = 0;
        Object.entries(stat.services).forEach(([svc, countVal]) => {
          const count = countVal as number;
          if (count > maxS) {
            maxS = count;
            favService = svc;
          }
        });

        // Generate psychological insight
        let psychologicalInsight = "";
        if (cycleType === "night") {
          psychologicalInsight = trans(
            `গভীর রাতে অর্ডার করার স্বভাব রয়েছে। এই সময়ে আকর্ষণীয় নাইট-বার্ড ছাড় বা অফার পুশ নোটিফিকেশন পাঠালে কনভার্সন রেট ৯০% বৃদ্ধি পাবে।`,
            `Typically orders late at night. Pushing a special "Night Owl" discount around 10:00 PM will trigger a high psychological conversion rate.`
          );
        } else if (cycleType === "morning") {
          psychologicalInsight = trans(
            `সকালের সতেজ সময়ে দ্রুত অর্ডার করতে ভালোবাসেন। তাকে সকাল ৮:৩০ মিনিটে একটি মোটিভেশনাল রিমাইন্ডার সেট করে দিন।`,
            `Fresh morning decisionmaker. A smart morning reminder around 8:30 AM will lock down repeat orders.`
          );
        } else {
          psychologicalInsight = trans(
            `নিয়মিত ও পরিমিত অর্ডার অভ্যাস রয়েছে। পছন্দের সেবা [${favService}] এর আপডেট ও রিওয়ার্ড কয়েনের জন্য কাস্টম রিমাইন্ডার পাঠানো অত্যন্ত কার্যকর হবে।`,
            `Highly reliable regular pattern. A customized engagement message centering around their favorite [${favService}] service is highly persuasive.`
          );
        }

        return {
          ...stat,
          peakTimeLabel,
          favService,
          cycleType,
          psychologicalInsight
        };
      });
  }, [userOrderStats, trans]);

  // Handle immediate auto-reminder push
  const sendAutoPatternReminder = async (userId: string, userName: string, textTitle: string, textMsg: string) => {
    try {
      // 1. Push to user notifications
      await addDoc(collection(db, "notifications"), {
        userId,
        title: textTitle,
        message: textMsg,
        type: "reminders",
        orderId: "",
        read: false,
        timestamp: new Date().toISOString()
      });

      // 2. Also log in reminders collection as sent
      await addDoc(collection(db, "reminders"), {
        userId,
        userName,
        userPhone: allUsers.find(u => u.uid === userId)?.phone || "N/A",
        title: textTitle,
        message: textMsg,
        status: "sent",
        createdAt: new Date().toISOString(),
        triggeredCount: 1
      });

      addToast(trans("স্মার্ট রিমাইন্ডার ও নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!", "Smart reminder push notification deployed successfully!"));
    } catch (e: any) {
      addToast(trans("রিমাইন্ডার পাঠাতে ব্যর্থ হয়েছে: " + e.message, "Failed to send reminder."));
    }
  };

  const filteredHabits = identifiedHabits.filter(h => 
    h.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.userPhone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Upper Psychological Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] relative overflow-hidden group shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest leading-none">CONSUMER HABIT</p>
              <h4 className="text-sm font-black text-indigo-400 dark:text-indigo-300 mt-1">{trans("অর্ডার অভ্যাস ট্র্যাকার", "Habit Tracker")}</h4>
            </div>
          </div>
          <p className="text-2xl font-black text-slate-100 font-mono tracking-tight">
            {identifiedHabits.length} {trans("ইউজার ট্র্যাকিং", "Users Analyzed")}
          </p>
          <p className="text-[11px] text-gray-400 font-medium leading-relaxed mt-2">
            {trans(
              "২ বা তার বেশি অর্ডার করা কাস্টমারদের আচরণ গাণিতিক নিয়মে বিশদ বিশ্লেষণ করে তাদের পছন্দের সময় ও মনস্তাত্ত্বিক প্যাটার্ন শনাক্ত করা হয়েছে।",
              "Pattern detection algorithm is live. Multi-order consumer trends are automatically captured with psychological suggestions."
            )}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] relative overflow-hidden group shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-all"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl animate-pulse">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest leading-none">PEAK ORDER HOUR</p>
              <h4 className="text-sm font-black text-amber-400 dark:text-amber-300 mt-1">{trans("সর্বোচ্চ অর্ডার সময়", "Peak System Hour")}</h4>
            </div>
          </div>
          <p className="text-2xl font-black text-slate-100 font-mono tracking-tight">
            {maxHour}:00 - {maxHour + 1}:00
          </p>
          <p className="text-[11px] text-gray-400 font-medium leading-relaxed mt-2">
            {trans(
              "আজ ২৪ ঘণ্টার পরিসংখ্যানে সর্বাধিক বুকিং লোড রেকর্ড করা হয়েছে এই সময়সীমায়। এই সময়ে সিস্টেম ও সার্ভার শতভাগ সচল রাখুন।",
              "Maximum transaction activity recorded during this hour. Push targeted campaigns during this timeframe for maximum conversions."
            )}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] relative overflow-hidden group shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest leading-none">HIGHEST ENGAGEMENT</p>
              <h4 className="text-sm font-black text-emerald-400 dark:text-emerald-300 mt-1">{trans("সেরা গ্রাহক প্যাটার্ন", "Top Customer Flow")}</h4>
            </div>
          </div>
          <p className="text-2xl font-black text-slate-100 font-mono tracking-tight truncate">
            {userOrderStats[0]?.userName || "N/A"}
          </p>
          <p className="text-[11px] text-gray-400 font-medium leading-relaxed mt-2">
            {userOrderStats[0] 
              ? trans(`মোট ${userOrderStats[0].orderCount} টি অর্ডার করে এবং মোট ৳${userOrderStats[0].spentAmount} খরচ করে সিস্টেমে শীর্ষস্থান ধরে রেখেছেন।`, `Top regular holds ${userOrderStats[0].orderCount} repeat orders. Focus client parameters are live.`)
              : trans("কোনো অর্ডার রেকর্ড করা হয়নি।", "No orders logged on database yet.")
            }
          </p>
        </div>
      </div>

      {/* Main Analytics Listing */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              📊 {trans("গ্রাহক অর্ডার অভ্যাস ও হাইইস্ট অর্ডার আইডি", "Highest Order ID & Pattern Analytics")}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {trans("ব্যবহারকারীদের অর্ডার ফ্রিকোয়েন্সি, সর্বোচ্চ সক্রিয় সময় এবং তাদের অবচেতন মনস্তাত্ত্বিক ক্রয় সক্ষমতা বিশ্লেষণ", "Analytical lookup engine for user booking cycles and repeat orders.")}
            </p>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              placeholder={trans("নাম বা ফোন নাম্বার খুঁজুন...", "Search by name or phone...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-indigo-500 outline-none text-xs"
            />
          </div>
        </div>

        {filteredHabits.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-white/5">
            <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
            <p className="text-xs font-bold text-gray-500">
              {trans("বিশ্লেষণ করার জন্য পর্যাপ্ত অর্ডার প্যাটার্ন পাওয়া যায়নি। ইউজারদের অন্তত ২টি কাস্টমার অর্ডার থাকতে হবে।", "No analytical insights found for multi-order clients.")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHabits.map((h, i) => {
              const isSelected = selectedUserHabit === h.userId;
              return (
                <div 
                  key={h.userId}
                  className="bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-all shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* User profile capsule with highest order ID rating */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center font-black text-indigo-600 shrink-0 text-sm">
                        #{i + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-950 dark:text-white capitalize leading-none">
                            {h.userName}
                          </h4>
                          {i === 0 && (
                            <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-md uppercase tracking-wide">
                              👑 {trans("হাইইস্ট অর্ডার আইডি", "Highest Order ID")}
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold rounded-full">
                            {h.orderCount} {trans("টি মোট অর্ডার", "total orders")}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 font-mono font-bold">
                          📱 {h.userPhone} | {trans("পছন্দের সেবা:", "Fav:")} <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{h.favService}</span>
                        </p>
                      </div>
                    </div>

                    {/* Numeric breakdown details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 shrink-0 lg:text-right">
                      <div>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{trans("মোট সম্পন্ন", "Completed Orders")}</p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                          {h.completedCount} {trans("টি", "units")}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{trans("ব্যয়কৃত মোট অর্থ", "Transaction Value")}</p>
                        <p className="text-sm font-black text-amber-500 dark:text-amber-400 font-mono mt-0.5">
                          ৳{h.spentAmount}
                        </p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{trans("সক্রিয় সময় প্যাটার্ন", "Peak Engagement")}</p>
                        <span className="inline-flex items-center gap-1 text-xs font-black text-indigo-600 dark:text-indigo-300 mt-1">
                          ⚡ {h.peakTimeLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle button to expand/collapse user orders and details */}
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => setSelectedUserHabit(isSelected ? null : h.userId)}
                      className="px-3.5 py-1.5 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] rounded-xl hover:bg-indigo-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                    >
                      {isSelected ? trans("বিস্তারিত বন্ধ করুন 🔼", "Hide Details") : trans("অর্ডার ইতিহাস ও কাস্টম অ্যাকশন দেখুন 🔽", "View Orders & Actions")}
                    </button>
                  </div>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-4"
                      >
                        {/* Psychological triggers / habit identifier drawer */}
                        <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-white/5">
                          <div className="bg-indigo-500/5 dark:bg-indigo-500/5 rounded-2xl p-4 border border-indigo-500/10 text-indigo-950 dark:text-indigo-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-2.5 flex-1">
                              <Sparkles className="text-indigo-500 shrink-0 mt-0.5" size={16} />
                              <div>
                                <p className="leading-relaxed font-bold">
                                  <strong className="text-indigo-600 dark:text-indigo-400">
                                    🧠 {trans("মনস্তাত্ত্বিক ট্রিগার সাজেশন্স (Trigger Insight):")}
                                  </strong>{" "}
                                  {h.psychologicalInsight}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 shrink-0 flex-wrap">
                              {onNavigateToChat && (
                                <button
                                  onClick={() => onNavigateToChat(h.userId, h.userName, h.userPhone)}
                                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-lg cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 uppercase tracking-wider shadow-md shadow-emerald-500/10"
                                >
                                  💬 {trans("লাইভ চ্যাট", "Live Chat")}
                                </button>
                              )}
                              
                              {onNavigateToReminder && (
                                <button
                                  onClick={() => onNavigateToReminder(h.userId)}
                                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] rounded-lg cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 uppercase tracking-wider shadow-md shadow-purple-500/10"
                                >
                                  ⏰ {trans("রিমাইন্ডার সেট", "Set Reminder")}
                                </button>
                              )}

                              <button
                                onClick={() => sendAutoPatternReminder(
                                  h.userId,
                                  h.userName,
                                  trans("আপনার বিশেষ ডিসকাউন্ট অফার প্রস্তুত! 🎁", "Your exclusive reward and offer is ready!"),
                                  trans(`প্রিয় ${h.userName}, আপনার ভালোবাসার সেরা সার্ভিস [${h.favService}] এ পান ১০০% গ্যারান্টিযুক্ত দ্রুত সেবা। এখনই বুকিং দিন।`, `Dear ${h.userName}, book your favorite [${h.favService}] and enjoy super priority queue access.`)
                                )}
                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] rounded-lg cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 uppercase tracking-wider shadow-md shadow-indigo-500/10"
                              >
                                <Send size={10} />
                                {trans("বিজ্ঞাপন পাঠান", "Send Promo")}
                              </button>
                              
                              <button
                                onClick={() => sendAutoPatternReminder(
                                  h.userId,
                                  h.userName,
                                  trans("রিওয়ার্ড রিমাইন্ডার এলার্ট! ⏰", "Priority Queue Warning Alert"),
                                  trans(`আপনার এক্টিভ কোয়েন রয়েছে। আপনার বুকিং বা অর্ডার রিওয়ার্ড আনলক করতে এখনই আমাদের সাথে যোগাযোগ করুন।`, `You have active priority coin bonuses waiting to be redeemed inside your account profile!`)
                                )}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[10px] rounded-lg cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 uppercase tracking-wider"
                              >
                                <Bell size={10} />
                                {trans("রিমাইন্ডার দিন", "Push Reminder")}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Order History Timeline Table */}
                        <div className="pt-2">
                          <h5 className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            📊 {trans("অর্ডার বুকিং ইতিহাস (Detailed Booking Ledger):", "Booking History:")}
                          </h5>
                          <div className="overflow-x-auto rounded-2xl border border-gray-150 dark:border-white/5 bg-white dark:bg-slate-950/40">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-white/5 text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-150 dark:border-white/5">
                                  <th className="p-3">অর্ডার আইডি (Order ID)</th>
                                  <th className="p-3">সার্ভিস নাম (Service Details)</th>
                                  <th className="p-3 text-right">মূল্য (Price)</th>
                                  <th className="p-3 text-center">স্ট্যাটাস (Status)</th>
                                  <th className="p-3 text-right">বুকিং সময় (Date & Time)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {orders.filter(o => o.userId === h.userId).map((ord) => {
                                  let oDateStr = "N/A";
                                  if (ord.timestamp) {
                                    try {
                                      const d = ord.timestamp?.toDate ? ord.timestamp.toDate() : new Date(ord.timestamp);
                                      oDateStr = d.toLocaleString();
                                    } catch (_) {}
                                  }
                                  return (
                                    <tr key={ord.id} className="border-b last:border-b-0 border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300 hover:bg-indigo-500/5 transition-colors">
                                      <td className="p-3 font-mono font-bold text-[10px] text-gray-400">
                                        #{ord.id.slice(0, 8)}...
                                      </td>
                                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                                        {ord.serviceTitle || "N/A"}
                                      </td>
                                      <td className="p-3 font-mono font-black text-slate-950 dark:text-white text-right">
                                        ৳{ord.price || "0"}
                                      </td>
                                      <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                          ord.status === "সম্পন্ন"
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400"
                                            : ord.status === "বাতিল"
                                            ? "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-450"
                                            : "bg-amber-100 text-amber-805 dark:bg-amber-500/15 dark:text-amber-400 animate-pulse"
                                        }`}>
                                          {ord.status}
                                        </span>
                                      </td>
                                      <td className="p-3 text-right text-[10px] text-gray-400 font-bold font-mono">
                                        {oDateStr}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminRemindersPanel({ allUsers, addToast, trans, prefilledUserId }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New Reminder Form State
  const [targetUserId, setTargetUserId] = useState("");
  const [remTitle, setRemTitle] = useState("");
  const [remMessage, setRemMessage] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Sync prefilled user ID when active from parent navigation
  useEffect(() => {
    if (prefilledUserId) {
      setTargetUserId(prefilledUserId);
    }
  }, [prefilledUserId]);

  useEffect(() => {
    // Sync reminders collection from Firestore using onSnapshot
    const q = query(collection(db, "reminders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Reminder[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Reminder);
      });
      setReminders(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle reminder submission
  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !remTitle || !remMessage) {
      addToast(trans("দয়া করে সকল বাধ্যতামূলক তথ্য পূরণ করুন।", "Please fill in all mandatory fields."));
      return;
    }

    setSubmitting(true);
    try {
      const selectedUserObj = allUsers.find(u => u.uid === targetUserId || hUserMatch(u.id, targetUserId));
      const uName = selectedUserObj?.name || "App Client";
      const uPhone = selectedUserObj?.phone || "N/A";

      // 1. Create document in reminders collection
      const remDocRef = await addDoc(collection(db, "reminders"), {
        userId: targetUserId,
        userName: uName,
        userPhone: uPhone,
        title: remTitle,
        message: remMessage,
        scheduledTime: scheduledTime ? new Date(scheduledTime).toISOString() : "",
        status: scheduledTime ? "pending" : "sent",
        createdAt: new Date().toISOString(),
        triggeredCount: scheduledTime ? 0 : 1
      });

      // 2. If scheduled time is not set, push to user notifications collection immediately!
      if (!scheduledTime) {
        await addDoc(collection(db, "notifications"), {
          userId: targetUserId,
          title: remTitle,
          message: remMessage,
          type: "reminders",
          orderId: "",
          read: false,
          timestamp: new Date().toISOString()
        });
        addToast(trans("রিমাইন্ডার বার্তা ব্যবহারকারীর ইন্টারফেসে পুশ করা হয়েছে!", "Custom psychological reminder sent instantly!"));
      } else {
        addToast(trans("রিমাইন্ডারটি সফলভাবে শিডিউল করা হয়েছে!", "Psychological reminder scheduled successfully!"));
      }

      // Reset Form
      setTargetUserId("");
      setRemTitle("");
      setRemMessage("");
      setScheduledTime("");
    } catch (err: any) {
      addToast(trans("রিমাইন্ডার সেট করতে ত্রুটি হয়েছে: " + err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const hUserMatch = (id: string, search: string) => id === search;

  // Manually trigger a pending reminder
  const triggerReminderNow = async (reminder: Reminder) => {
    try {
      // 1. Send live user notification
      await addDoc(collection(db, "notifications"), {
        userId: reminder.userId,
        title: reminder.title,
        message: reminder.message,
        type: "reminders",
        orderId: "",
        read: false,
        timestamp: new Date().toISOString()
      });

      // 2. Update status and count in reminders doc
      const count = (reminder.triggeredCount || 0) + 1;
      await updateDoc(doc(db, "reminders", reminder.id), {
        status: "sent",
        triggeredCount: count
      });

      addToast(trans("রিমাইন্ডার সফলভাবে ও তাৎক্ষণিকভাবে ব্যবহারকারীকে পুশ করা হয়েছে!", "Reminder instantly triggered and sent to user!"));
    } catch (err: any) {
      addToast(trans("রিমাইন্ডার পাঠাতে ত্রুটি হয়েছে: " + err.message));
    }
  };

  // Delete/Cancel a reminder
  const handleDeleteReminder = async (id: string) => {
    try {
      await deleteDoc(doc(db, "reminders", id));
      addToast(trans("রিমাইন্ডার সফলভাবে মুছে ফেলা হয়েছে।", "Reminder logged off successfully."));
    } catch (err: any) {
      addToast(trans("মুছে ফেলতে ত্রুটি: " + err.message));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Reminder Creator Form Box */}
      <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 p-6 rounded-[2rem] shadow-sm">
        <h3 className="text-md font-black text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <Clock className="text-indigo-600 dark:text-indigo-400" size={18} />
          {trans("নতুন রিমাইন্ডার সেট করুন", "Schedule Custom Reminder")}
        </h3>
        <p className="text-[11px] text-gray-500 mb-6">
          {trans("মনস্তাত্ত্বিক ট্রিগার বা শিডিউল মেসেজ কাস্টমারদের কাছে পাঠান", "Inject client triggers instantly or schedule them for automation.")}
        </p>

        <form onSubmit={handleCreateReminder} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
              {trans("টার্গেট কাস্টমার (Select User) *", "Select target user *")}
            </label>
            <select
              value={targetUserId}
              required
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full px-4 py-3 text-xs bg-gray-50 dark:bg-white/5 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-slate-900 dark:text-white"
            >
              <option value="" className="text-slate-950">
                -- {trans("ব্যবহারকারী নির্বাচন করুন", "Choose Client Profile")} --
              </option>
              {allUsers.map((u) => (
                <option key={u.uid || u.id} value={u.uid || u.id} className="text-slate-950">
                  {u.name || "N/A"} ({u.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
              {trans("রিমাইন্ডার শিরোনাম (Title) *", "Reminder Title *")}
            </label>
            <input
              type="text"
              placeholder={trans("উদাহরণ: বিশেষ অফার বা কার্ট পেন্ডিং এলার্ট", "e.g. Special promo cycle alert")}
              required
              value={remTitle}
              onChange={(e) => setRemTitle(e.target.value)}
              className="w-full px-4 py-3 text-xs bg-gray-50 dark:bg-white/5 border border-transparent focus:border-indigo-500 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
              {trans("বার্তা বিবরণ (Detailed Message) *", "Detailed message *")}
            </label>
            <textarea
              placeholder={trans("গ্রাহককে দ্রুত সিদ্ধান্ত নিতে প্রভাবিত করার মতো আকর্ষণীয় বাক্য লিখুন...", "Provide persuasive psychological copies...")}
              required
              rows={4}
              value={remMessage}
              onChange={(e) => setRemMessage(e.target.value)}
              className="w-full px-4 py-3 text-xs bg-gray-50 dark:bg-white/5 border border-transparent focus:border-indigo-500 rounded-xl outline-none resize-none font-bold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
              {trans("শিডিউল সময় (ঐচ্ছিক)", "Scheduled Time (Optional)")}
            </label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-4 py-3 text-xs bg-gray-50 dark:bg-white/5 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-slate-950 dark:text-white"
            />
            <span className="text-[9px] text-gray-400 mt-1 block">
              {trans("খালি রাখলে রিমাইন্ডারটি তাৎক্ষণিকভাবে নোটিফিকেশন হিসেবে চলে যাবে।", "Leave empty for instant dispatch to notification tray.")}
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-500/10 transition-all select-none active:scale-95 flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
          >
            {submitting ? (
              <RefreshCw className="animate-spin text-white" size={14} />
            ) : (
              <Plus size={14} />
            )}
            {trans("নতুন রিমাইন্ডার সাজান", "Schedule Reminder")}
          </button>
        </form>
      </div>

      {/* Reminders Listing Table */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 p-6 rounded-[2rem] shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-md font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="text-indigo-600 dark:text-indigo-400" size={18} />
            {trans("সক্রিয় রিমাইন্ডার তালিকা", "Deployment Schedule Registry")}
          </h3>
          <span className="px-3 py-1 bg-gray-100 dark:bg-white/5 text-gray-500 text-[10px] font-black rounded-lg">
            {reminders.length} {trans("টি মোট", "active")}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 mb-6">
          {trans("পূর্বে শিডিউল বা প্রেরিত রিমাইন্ডারগুলোর অবস্থান পর্যবেক্ষণ ও পরিচালনা করুন", "View real-time status and trigger history metrics.")}
        </p>

        {loading ? (
          <div className="p-12 text-center flex justify-center items-center flex-1">
            <RefreshCw className="animate-spin text-gray-400" size={24} />
          </div>
        ) : reminders.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-gray-150 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-white/5 flex-1 flex flex-col justify-center">
            <Bell className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-xs font-bold text-gray-400">
              {trans("সিস্টেমে কোনো রিমাইন্ডার খুঁজে পাওয়া যায়নি।", "Your scheduled reminder shelf is currently empty!")}
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 no-scrollbar flex-1">
            {reminders.map((r) => {
              const isScheduled = r.scheduledTime;
              const isPending = r.status === "pending";
              return (
                <div 
                  key={r.id} 
                  className="bg-gray-50 dark:bg-slate-950/30 border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-500/20 transition-all font-sans"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        {r.userName}
                      </span>
                      {isScheduled && (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                          <Calendar size={8} />
                          {trans("শিডিউলড", "Scheduled")}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        r.status === "sent" 
                          ? "bg-emerald-500/10 text-emerald-600" 
                          : r.status === "pending" 
                            ? "bg-amber-500/10 text-amber-600 animate-pulse" 
                            : "bg-gray-200/50 dark:bg-white/5 text-gray-500"
                      }`}>
                        {r.status === "sent" 
                          ? trans("প্রেরিত", "Sent") 
                          : r.status === "pending" 
                            ? trans("অপেক্ষমাণ", "Pending Time") 
                            : r.status === "read" 
                              ? trans("পঠিত", "Read") 
                              : trans("খারিজ", "Dismissed")
                        }
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        {r.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 whitespace-pre-wrap mt-1 font-bold">
                        {r.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-[9px] text-gray-400 font-mono">
                      <span>👤 {r.userPhone}</span>
                      {r.triggeredCount !== undefined && (
                        <span>🔥 {trans("ট্রিগার সংখ্যা:", "Triggers:")} {r.triggeredCount}</span>
                      )}
                      <span>📅 {new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center gap-2 shrink-0 self-end sm:self-center">
                    {isPending && (
                      <button
                        onClick={() => triggerReminderNow(r)}
                        className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-[10px] rounded-lg cursor-pointer flex items-center gap-1 transition-all active:scale-95"
                        title={trans("তাৎক্ষণিকভাবে পাঠান", "Trigger reminder right now")}
                      >
                        <Send size={10} />
                        {trans("এখনই পাঠান", "Push Now")}
                      </button>
                    )}
                    
                    {!isPending && (
                      <button
                        onClick={() => triggerReminderNow(r)}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-black text-[10px] rounded-lg cursor-pointer flex items-center gap-1 transition-all active:scale-95"
                        title={trans("আবার এক্টিভেট কার্বন নোটিশে দিন", "Re-trigger this psychological notification")}
                      >
                        <RefreshCw size={10} />
                        {trans("আবার ট্রিগার", "Re-Push")}
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteReminder(r.id)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/5 text-rose-500 rounded-lg cursor-pointer transition-colors active:scale-95 mt-1 sm:mt-0"
                      title={trans("মুছে ফেলুন", "Delete reminder log")}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
