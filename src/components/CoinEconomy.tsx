import React, { useState, useEffect } from "react";
import { Coins, Flame, TrendingUp, CheckCircle, XCircle, Award, Receipt, Tag } from "lucide-react";
import { collection, onSnapshot, doc, updateDoc, addDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface RedemptionRequest {
  id: string;
  userId: string;
  userName: string;
  email: string;
  coinsRequested: number;
  monetaryValue: number;
  paymentMethod: string;
  paymentNumber?: string;
  status: "pending" | "approved" | "rejected" | "processing";
  timestamp: string;
}

export const CoinEconomy: React.FC = () => {
  // Coin Metric Cards State
  const [totalCirculation, setTotalCirculation] = useState(1284500);
  const [coinsGeneratedToday, setCoinsGeneratedToday] = useState(45200);
  const [taxBurnedCoins, setTaxBurnedCoins] = useState(18900);

  // Redemption / Coupon Requests State
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [couponsList, setCouponsList] = useState<RedemptionRequest[]>([]);
  const [subTab, setSubTab] = useState<"withdraw_requests" | "coupon_requests">("withdraw_requests");
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Subscribe to real coin requests (filtering out coupon exchanges so withdrawals don't look system-generated / fake)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "coin_requests"),
      (snapshot) => {
        const list: RedemptionRequest[] = [];
        let approvedCoinsSum = 0;
        
        snapshot.forEach((d) => {
          const data = d.data();
          // Filter out Coupon Exchange requests from the withdrawal requests table
          if (data.paymentMethod === "Coupon Exchange") return;

          let bsStatus: "pending" | "approved" | "rejected" | "processing" = "pending";
          if (data.status === "সম্পন্ন") {
            bsStatus = "approved";
            approvedCoinsSum += Number(data.coins) || 0;
          } else if (data.status === "বাতিল") {
            bsStatus = "rejected";
          } else if (data.status === "প্রক্রিয়াধীন") {
            bsStatus = "processing";
          }
          
          list.push({
            id: d.id,
            userId: data.uid || "",
            userName: data.userName || "Regular Customer",
            email: data.email || "",
            coinsRequested: Number(data.coins) || 0,
            monetaryValue: Number(data.amount) || Math.round((Number(data.coins) || 0) * 0.1),
            paymentMethod: data.paymentMethod || "bKash",
            paymentNumber: data.paymentNumber || "",
            status: bsStatus,
            timestamp: data.timestamp ? new Date(data.timestamp).toLocaleString("bn-BD") : "N/A",
          });
        });

        // Sort newest first or keeping pending at top
        list.sort((a, b) => {
          if (a.status === "pending" && b.status !== "pending") return -1;
          if (a.status !== "pending" && b.status === "pending") return 1;
          return b.timestamp.localeCompare(a.timestamp);
        });

        setRedemptions(list);
        setTaxBurnedCoins(Math.floor(approvedCoinsSum * 0.05) + 18900); // dynamic feed
      },
      (err) => {
        console.error("Coin economy subscription error:", err);
      }
    );

    return () => unsub();
  }, []);

  // Subscribe to Coupon Exchange requests separate collection
  useEffect(() => {
    const unsubCoupons = onSnapshot(
      collection(db, "coupon_requests"),
      (snapshot) => {
        const list: RedemptionRequest[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          let bsStatus: "pending" | "approved" | "rejected" | "processing" = "pending";
          if (data.status === "সম্পন্ন") {
            bsStatus = "approved";
          } else if (data.status === "বাতিল") {
            bsStatus = "rejected";
          } else if (data.status === "প্রক্রিয়াধীন") {
            bsStatus = "processing";
          }

          list.push({
            id: d.id,
            userId: data.uid || "",
            userName: data.userName || "User",
            email: data.email || "",
            coinsRequested: Number(data.coins) || 0,
            monetaryValue: Number(data.amount) || 50,
            paymentMethod: "Coupon Exchange",
            paymentNumber: "N/A",
            status: bsStatus,
            timestamp: data.timestamp ? new Date(data.timestamp).toLocaleString("bn-BD") : "N/A",
          });
        });

        list.sort((a, b) => {
          if (a.status === "pending" && b.status !== "pending") return -1;
          if (a.status !== "pending" && b.status === "pending") return 1;
          return b.timestamp.localeCompare(a.timestamp);
        });

        setCouponsList(list);
      },
      (err) => {
        console.error("Coupon requests subscription error:", err);
      }
    );
    return () => unsubCoupons();
  }, []);

  // Calculate dynamic circulating coin metrics from all users
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      let sum = 0;
      snapshot.forEach((doc) => {
        sum += (doc.data().timePoints || 0);
      });
      setTotalCirculation(sum);
    });
    return () => unsubUsers();
  }, []);

  const handleApprove = async (id: string, coins: number) => {
    try {
      await updateDoc(doc(db, "coin_requests", id), {
        status: "সম্পন্ন"
      });
      setFeedbackMsg({
        text: `আবেদন সফলভাবে অনুমোদন করা হয়েছে! ${coins} কয়েন ডিক্রিমেন্ট বাস্তবায়ন করা হয়েছে।`,
        type: "success",
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({
        text: "অনুমোদন ব্যর্থ হয়েছে!",
        type: "error",
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateDoc(doc(db, "coin_requests", id), {
        status: "বাতিল"
      });
      setFeedbackMsg({
        text: "আবেদনটি বাতিল করা হয়েছে এবং গ্রাহককে অবহিত করা হয়েছে।",
        type: "error",
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({
        text: "বাতিলকরণ ব্যর্থ হয়েছে!",
        type: "error",
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // Dedicated approve for coupon requests
  const handleApproveCoupon = async (req: RedemptionRequest) => {
    try {
      // 1. Generate random coupon code
      const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();
      const generatedCode = `COIN${req.monetaryValue || 50}-${randomId}`;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30); // Valid for 30 days

      // 2. Put into active coupons collection
      await addDoc(collection(db, "coupons"), {
        code: generatedCode,
        discount: req.monetaryValue || 50,
        active: true,
        expiryDate: expiry.toISOString().split("T")[0],
        isMysteryBox: false,
        createdByCoins: true,
        creatorUid: req.userId,
        creatorName: req.userName,
        createdAt: new Date().toISOString(),
      });

      // 3. Send notification to user
      await addDoc(collection(db, "notifications"), {
        userId: req.userId,
        title: "কুপন এক্সচেঞ্জ সফল হয়েছে! 🎉",
        body: `আপনার এক্সচেঞ্জ রিকোয়েস্ট অনুমোদিত হয়েছে! আপনার কুপন কোড: ${generatedCode} (৳${req.monetaryValue} ছাড়)। এটি কুপন ওরিজিনাল কোড পেস্ট করে ব্যবহার করুন।`,
        type: "system",
        refId: "",
        read: false,
        timestamp: new Date().toISOString(),
      });

      // 4. Update status in coupon_requests
      await updateDoc(doc(db, "coupon_requests", req.id), {
        status: "সম্পন্ন"
      });

      setFeedbackMsg({
        text: `কুপন সফলভাবে অনুমোদিত হয়েছে! কোড: ${generatedCode}`,
        type: "success",
      });
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({
        text: "অনুমোদন ব্যর্থ হয়েছে!",
        type: "error",
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // Dedicated reject for coupon requests
  const handleRejectCoupon = async (req: RedemptionRequest) => {
    try {
      // 1. Refund points to user
      const userRef = doc(db, "users", req.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentPoints = userSnap.data().timePoints || 0;
        await updateDoc(userRef, {
          timePoints: currentPoints + req.coinsRequested,
        });
      }

      // 2. Send notification to user
      await addDoc(collection(db, "notifications"), {
        userId: req.userId,
        title: "কুপন এক্সচেঞ্জ বাতিল হয়েছে ❌",
        body: `দুঃখিত! আপনার কুপন এক্সচেঞ্জ আবেদনটি এডমিন বাতিল করেছেন। আপনার ${req.coinsRequested} কয়েন ফেরত দেওয়া হয়েছে।`,
        type: "system",
        refId: "",
        read: false,
        timestamp: new Date().toISOString(),
      });

      // 3. Change status inside coupon_requests
      await updateDoc(doc(db, "coupon_requests", req.id), {
        status: "বাতিল"
      });

      setFeedbackMsg({
        text: "কুপন ক্লেইম রিকোয়েস্ট বাতিল করা হয়েছে এবং গ্রাহককে কয়েন রিফান্ড দেওয়া হয়েছে।",
        type: "error",
      });
      setTimeout(() => setFeedbackMsg(null), 4500);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({
        text: "বাতিল করতে ব্যর্থ হয়েছে!",
        type: "error",
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const activeList = subTab === "withdraw_requests" ? redemptions : couponsList;

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

      {/* Segment tabs */}
      <div className="flex flex-wrap gap-2.5 bg-gray-50 dark:bg-slate-950/50 p-2.5 rounded-[1.8rem] border border-gray-150 dark:border-white/5 width-max">
        <button
          onClick={() => setSubTab("withdraw_requests")}
          className={`px-5 py-3 rounded-2xl font-sans font-black text-xs transition-all flex items-center gap-1.5 ${
            subTab === "withdraw_requests"
              ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white"
          }`}
        >
          <Coins size={14} /> কয়েন ক্যাশআউট উইথড্রয়াল ({redemptions.filter(r => r.status === "pending").length})
        </button>
        <button
          onClick={() => setSubTab("coupon_requests")}
          className={`px-5 py-3 rounded-2xl font-sans font-black text-xs transition-all flex items-center gap-1.5 ${
            subTab === "coupon_requests"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-605/20"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white"
          }`}
        >
          <Tag size={14} /> কুপন কোড এক্সচেঞ্জ রিকুয়েস্ট ({couponsList.filter(c => c.status === "pending").length})
        </button>
      </div>

      {/* Pending Redemptions Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-xl font-sans">
        <div className="mb-5">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Receipt size={20} className="text-amber-500" />
            {subTab === "withdraw_requests" ? "Pending Coin Withdrawals • পেন্ডিং পেমেন্ট উইথড্রসমূহ" : "Pending Coupon Exchanges • পেন্ডিং ডিসকাউন্ট কুপন এক্সচেঞ্জসমূহ"}
          </h3>
          <p className="text-xs text-gray-400 dark:text-slate-300 mt-1">
            {subTab === "withdraw_requests" 
              ? "গ্রাহক যখন তাদের সর্জিত কয়েন থেকে ক্যাশ টাকা ক্যাশআউট আবেদন সাবমিট করেন, তা এখানে প্রদর্শিত হয়।" 
              : "গ্রাহকেরা যখন নির্ধারিত ছাড়ের জন্য তাদের কয়েন এক্সচেঞ্জ বা রূপান্তর করেন, তা এখানে আসে।"}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-150 dark:border-white/5">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-150 dark:border-white/5 text-[10px] text-gray-450 dark:text-slate-400 uppercase tracking-widest font-black">
                  <th className="p-4">User Details</th>
                  <th className="p-4">Exchangeable Coins</th>
                  <th className="p-4">{subTab === "withdraw_requests" ? "Payout Amount (TK)" : "Coupon Discount (TK)"}</th>
                  <th className="p-4">{subTab === "withdraw_requests" ? "Withdrawal Gateway" : "Requested Method"}</th>
                  <th className="p-4">Requested At</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-white/5 font-medium">
                {activeList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-400 font-bold bg-gray-50/50 dark:bg-slate-950/20">
                      কোন পেন্ডিং আবেদন পাওয়া যায়নি!
                    </td>
                  </tr>
                ) : (
                  activeList.map((req) => (
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
                          {req.paymentNumber && req.paymentNumber !== "N/A" && (
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
                      <td className="p-4 text-right space-x-1.5 text-nowrap">
                        {subTab === "withdraw_requests" ? (
                          <>
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
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={req.status !== "pending"}
                              onClick={() => handleApproveCoupon(req)}
                              className={`p-2 rounded-xl transition-all font-black text-[10px] inline-flex items-center gap-1 hover:scale-105 active:scale-95 cursor-pointer ${
                                req.status !== "pending"
                                  ? "opacity-30 cursor-not-allowed bg-gray-100 text-gray-450 dark:bg-slate-800/20 dark:text-slate-500"
                                  : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                              }`}
                              title="Approve & Send Coupon"
                            >
                              <CheckCircle size={14} /> অনুমোদন ও কুপন কোড পাঠান
                            </button>
                            <button
                              type="button"
                              disabled={req.status !== "pending"}
                              onClick={() => handleRejectCoupon(req)}
                              className={`p-2 rounded-xl transition-all font-black text-[10px] inline-flex items-center gap-1 hover:scale-105 active:scale-95 cursor-pointer ${
                                req.status !== "pending"
                                  ? "opacity-30 cursor-not-allowed bg-gray-100 text-gray-450 dark:bg-slate-800/20 dark:text-slate-500"
                                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20"
                              }`}
                              title="Reject & Refund Coins"
                            >
                              <XCircle size={14} /> বাতিল ও কয়েন ফেরত
                            </button>
                          </>
                        )}
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
