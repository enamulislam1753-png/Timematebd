import React, { useState, useEffect, useRef } from "react";
import {
  Brain,
  Sparkles,
  Send,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Users,
  CheckCircle,
  AlertTriangle,
  Play,
  Zap,
  Info,
  Lock,
  RotateCcw,
  User,
  Bot,
  Settings,
  Copy,
  Check
} from "lucide-react";
import { collection, doc, updateDoc, getDocs, query, where, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface AICopilotProps {
  orders: any[];
  allUsers: any[];
  addToast: (msg: string, type?: "success" | "error" | "info") => void;
  trans: (bn: string, en?: string) => string;
}

interface ChatMessage {
  id: string;
  sender: "admin" | "ai";
  text: string;
  timestamp: Date;
}

interface AICopilotChatFormProps {
  onSubmit: (val: string) => void;
  isAiModeOn: boolean;
  isLoading: boolean;
  prompt: string;
}

const AICopilotChatForm: React.FC<AICopilotChatFormProps> = ({
  onSubmit,
  isAiModeOn,
  isLoading,
  prompt
}) => {
  const [localVal, setLocalVal] = useState(prompt);

  useEffect(() => {
    setLocalVal(prompt);
  }, [prompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localVal.trim()) return;
    onSubmit(localVal);
    setLocalVal("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center p-3 bg-slate-900/90 border-t border-white/10 shrink-0">
      <input
        type="text"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        placeholder={isAiModeOn ? "মেসেঞ্জারে বার্তা লিখুন (উদাঃ ORD-109 এর মূল্য ৫০০ টাকা করুন)..." : "এআই মোড বন্ধ রয়েছে"}
        disabled={!isAiModeOn || isLoading}
        className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/10 rounded-full outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-semibold text-white placeholder-gray-400 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!isAiModeOn || isLoading || !localVal.trim()}
        className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all rounded-full text-white font-bold cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center justify-center shrink-0 active:scale-95 border-0"
        title="পাঠান"
      >
        <Send size={15} />
      </button>
    </form>
  );
};

export const AICopilot: React.FC<AICopilotProps> = ({
  orders,
  allUsers,
  addToast,
  trans
}) => {
  const [isAiModeOn, setIsAiModeOn] = useState<boolean>(() => {
    const saved = localStorage.getItem("timemate_ai_mode");
    return saved !== null ? saved === "true" : true;
  });

  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<Array<{ time: string; msg: string; type: "success" | "error" | "info" }>>([]);
  
  // Custom API key settings state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return localStorage.getItem("user_gemini_api_key") || "";
  });

  const handleCopyMessage = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      addToast("মেসেজ কপি করা হয়েছে!", "success");
      setTimeout(() => {
        setCopiedMsgId(null);
      }, 2000);
    } catch (e) {
      addToast("কপি করতে সমস্যা হয়েছে!", "error");
    }
  };
  
  // Conversational Chat History state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("timemate_ai_admin_chat_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: "welcome",
        sender: "ai",
        text: "আসসালামু আলাইকুম! আমি টাইমমেট বিডি এআই অ্যাডমিন কো-পাইলট। আপনি আমাকে সিস্টেম অ্যাডমিনিস্ট্রেশন কাজের নির্দেশ দিতে পারেন (যেমন: 'ORD-109 এর মূল্য ৫০০ টাকা করুন') বা সিস্টেম সম্পর্কে যেকোনো তথ্য জানতে চাইতে পারেন। আমি এখন একটি রিয়েল-টাইম চ্যাটবট হিসেবে আপনার সাথে আলোচনা করতে প্রস্তুত!",
        timestamp: new Date()
      }
    ];
  });

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem("timemate_ai_mode", String(isAiModeOn));
    logEvent(`এআই কন্ট্রোল মোড ${isAiModeOn ? "অন (ON)" : "অফ (OFF)"} করা হয়েছে।`, "info");
  }, [isAiModeOn]);

  useEffect(() => {
    localStorage.setItem("timemate_ai_admin_chat_history", JSON.stringify(chatHistory));
    // Scroll to bottom
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const logEvent = (msg: string, type: "success" | "error" | "info" = "info") => {
    const time = new Date().toLocaleTimeString();
    setExecutionLogs((prev) => [{ time, msg, type }, ...prev].slice(0, 50));
  };

  const handleClearHistory = () => {
    if (confirm("আপনি কি চ্যাট হিস্ট্রি রিসেট করতে চান?")) {
      const initialChat: ChatMessage[] = [
        {
          id: "welcome-reset",
          sender: "ai",
          text: "চ্যাট হিস্ট্রি সফলভাবে রিসেট করা হয়েছে। আমি আপনাকে সাহায্য করতে প্রস্তুত!",
          timestamp: new Date()
        }
      ];
      setChatHistory(initialChat);
      logEvent("অ্যাডমিন এআই চ্যাট হিস্ট্রি রিসেট করা হয়েছে।", "success");
    }
  };

  const handleSaveApiKey = () => {
    localStorage.setItem("user_gemini_api_key", userApiKey);
    addToast("Gemini API Key সফলভাবে ক্লায়েন্ট-সাইডে সংরক্ষণ করা হয়েছে।", "success");
    logEvent("ক্লায়েন্ট-সাইড জেমিনি এপিআই কি পরিবর্তন করা হয়েছে।", "success");
    setShowSettings(false);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem("user_gemini_api_key");
    setUserApiKey("");
    addToast("Gemini API Key মুছে ফেলা হয়েছে।", "success");
    logEvent("ক্লায়েন্ট-সাইড জেমিনি এপিআই কি রিমুভ করা হয়েছে।", "success");
    setShowSettings(false);
  };

  const executeAction = async (payload: any): Promise<string> => {
    if (!payload || !payload.action) {
      return "দুঃখিত, আমি এই অনুরোধটির কোনো সঠিক অ্যাকশন নির্ধারণ করতে পারিনি।";
    }

    const { action } = payload;
    logEvent(`অ্যাকশন সনাক্তকরণ: ${action}`, "info");

    // Block sensitive actions
    if (action === "REJECT_SENSITIVE") {
      const reason = payload.reason || "এটি একটি অতি স্পর্শকাতর অ্যাকশন যা শুধুমাত্র মানব এডমিন ম্যানুয়ালি সম্পন্ন করতে পারেন।";
      logEvent(`নিরাপত্তা ব্লক: স্পর্শকাতর কার্যকলাপ ব্লক করা হয়েছে।`, "error");
      return `🚨 নিরাপত্তা ব্লক: ${reason}`;
    }

    try {
      if (action === "SET_ORDER_PRICE") {
        const { orderId, price } = payload;
        if (!orderId) throw new Error("অর্ডার আইডি দেওয়া হয়নি।");
        const cleanOrderId = orderId.trim();
        const orderDocRef = doc(db, "orders", cleanOrderId);
        await updateDoc(orderDocRef, {
          charge: Number(price),
          status: "মূল্য নির্ধারণ"
        });
        const msg = `অর্ডার ${cleanOrderId}-এর নতুন মূল্য ৳${price} নির্ধারণ করা হয়েছে এবং গেটওয়ে ওপেন করা হয়েছে।`;
        logEvent(msg, "success");
        addToast(msg, "success");
        return `✓ সফলভাবে সম্পন্ন হয়েছে!\n${msg}`;
      } 
      
      else if (action === "UPDATE_ORDER_STATUS") {
        const { orderId, status } = payload;
        if (!orderId) throw new Error("অর্ডার আইডি দেওয়া হয়নি।");
        const cleanOrderId = orderId.trim();
        const orderDocRef = doc(db, "orders", cleanOrderId);
        await updateDoc(orderDocRef, { status });
        const msg = `অর্ডার ${cleanOrderId}-এর স্ট্যাটাস পরিবর্তন করে "${status}" করা হয়েছে।`;
        logEvent(msg, "success");
        addToast(msg, "success");
        return `✓ সফলভাবে সম্পন্ন হয়েছে!\n${msg}`;
      } 
      
      else if (action === "BAN_USER") {
        const { phone } = payload;
        if (!phone) throw new Error("মোবাইল নম্বর দেওয়া হয়নি।");
        const cleanPhone = phone.trim();
        
        // Find user by phone in allUsers
        const targetUser = allUsers.find(u => u.phone === cleanPhone || u.phoneNumber === cleanPhone);
        if (!targetUser) {
          throw new Error(`মোবাইল নম্বর ${cleanPhone} সহ কোনো কাস্টমার অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।`);
        }
        
        await updateDoc(doc(db, "users", targetUser.uid || targetUser.id), {
          role: "banned",
          isBanned: true
        });

        // Fire real security alert
        await addDoc(collection(db, "security_alerts"), {
          userPhone: cleanPhone,
          userName: targetUser.fullName || "Unknown",
          issue: "এআই এডমিন দ্বারা অ্যাকাউন্ট লক করা হয়েছে।",
          timestamp: new Date()
        });

        const msg = `গ্রাহক ${targetUser.fullName || "ব্যবহারকারী"} (${cleanPhone}) অ্যাকাউন্টটি ব্যান বা লক করা হয়েছে।`;
        logEvent(msg, "success");
        addToast(msg, "success");
        return `✓ সফলভাবে সম্পন্ন হয়েছে!\n${msg}`;
      }

      else if (action === "UNBAN_USER") {
        const { phone } = payload;
        if (!phone) throw new Error("মোবাইল নম্বর দেওয়া হয়নি।");
        const cleanPhone = phone.trim();
        
        const targetUser = allUsers.find(u => u.phone === cleanPhone || u.phoneNumber === cleanPhone);
        if (!targetUser) {
          throw new Error(`মোবাইল নম্বর ${cleanPhone} সহ কোনো কাস্টমার অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।`);
        }
        
        await updateDoc(doc(db, "users", targetUser.uid || targetUser.id), {
          role: "user",
          isBanned: false
        });

        const msg = `গ্রাহক ${targetUser.fullName || "ব্যবহারকারী"} (${cleanPhone}) অ্যাকাউন্টটি সফলভাবে আনলক করা হয়েছে।`;
        logEvent(msg, "success");
        addToast(msg, "success");
        return `✓ সফলভাবে সম্পন্ন হয়েছে!\n${msg}`;
      }

      else if (action === "SET_SECURITY_LEVEL") {
        const { level } = payload;
        const protectionRef = doc(db, "security_settings", "protection_level");
        await updateDoc(protectionRef, { mode: level });
        const msg = `সিস্টেম নিরাপত্তা ফায়ারওয়াল মোড পরিবর্তন করে "${level}" করা হয়েছে।`;
        logEvent(msg, "success");
        addToast(msg, "success");
        return `✓ সফলভাবে সম্পন্ন হয়েছে!\n${msg}`;
      }

      return "অনুরোধ করা কমান্ড অ্যাকশনটি সম্পন্ন করার কোনো উপায় খুঁজে পাওয়া যায়নি।";
    } catch (err: any) {
      const errMsg = err.message || err.toString();
      logEvent(`অ্যাকশন ব্যর্থ হয়েছে: ${errMsg}`, "error");
      addToast(`অ্যাকশন ব্যর্থ হয়েছে: ${errMsg}`, "error");
      return `❌ অ্যাকশন ব্যর্থ হয়েছে: ${errMsg}`;
    }
  };

  // Safe manual regex-based fallback parser in case API keys are missing/rate-limited or running as static Vercel build
  const parsePromptLocally = (text: string): any => {
    const clean = text.toLowerCase().trim();

    // Sensitive checks
    if (
      clean.includes("delete") || 
      clean.includes("ডিলিট") || 
      clean.includes("মুছে") || 
      clean.includes("payment setting") || 
      clean.includes("বিকাশ নাম্বার") || 
      clean.includes("নম্বর পরিবর্তন") ||
      clean.includes("credentials") ||
      clean.includes("পাসওয়ার্ড")
    ) {
      return {
        action: "REJECT_SENSITIVE",
        reason: "পেমেন্ট নম্বর পরিবর্তন, কাস্টমার মুছে ফেলা বা ডাটাবেজ ডিলিট করার মত স্পর্শকাতর কাজ এআই দিয়ে করা যাবে না। এটি ম্যানুয়ালি করুন।"
      };
    }

    // Ban user check
    const banMatch = clean.match(/(ban|ব্যান|ব্লক|block)\s*(user|ইউজার)?\s*([0-9]{11})/);
    if (banMatch) {
      return { action: "BAN_USER", phone: banMatch[3] };
    }

    // Unban user check
    const unbanMatch = clean.match(/(unban|আনব্যান|আনব্লক|unblock)\s*(user|ইউজার)?\s*([0-9]{11})/);
    if (unbanMatch) {
      return { action: "UNBAN_USER", phone: unbanMatch[3] };
    }

    // Set price check: "set price for order ORD-123 to 500" or "ORD-123 মূল্য ৫০০ টাকা"
    const priceMatch = clean.match(/(ord-[a-z0-9]+).*?(মূল্য|price|টাকা|charge|৳)\s*([0-9]+)/i) || 
                       clean.match(/([0-9]+).*?(টাকা|মূল্য).*?(ord-[a-z0-9]+)/i);
    if (priceMatch) {
      const ordId = priceMatch[1].startsWith("ord-") ? priceMatch[1] : priceMatch[3];
      const prc = priceMatch[1].startsWith("ord-") ? priceMatch[3] : priceMatch[1];
      return { action: "SET_ORDER_PRICE", orderId: ordId.toUpperCase(), price: Number(prc) };
    }

    // Status change check
    const statusMatch = clean.match(/(ord-[a-z0-9]+).*?(সম্পন্ন|complete|বাতিল|cancel|প্রসেসিং|process|verify|যাচাই)/i);
    if (statusMatch) {
      const ordId = statusMatch[1].toUpperCase();
      let status = "নতুন";
      if (clean.includes("সম্পন্ন") || clean.includes("complete")) status = "সম্পন্ন";
      else if (clean.includes("বাতিল") || clean.includes("cancel")) status = "বাতিল";
      else if (clean.includes("প্রসেসিং") || clean.includes("process") || clean.includes("প্রক্রিয়াধীন")) status = "প্রক্রিয়াধীন";
      else if (clean.includes("যাচাই") || clean.includes("verify") || clean.includes("পেমেন্ট যাচাই")) status = "পেমেন্ট যাচাই";
      return { action: "UPDATE_ORDER_STATUS", orderId: ordId, status };
    }

    // Security level
    if (clean.includes("security") || clean.includes("নিরাপত্তা")) {
      if (clean.includes("strict") || clean.includes("কঠোর")) return { action: "SET_SECURITY_LEVEL", level: "strict" };
      if (clean.includes("standard") || clean.includes("স্বাভাবিক")) return { action: "SET_SECURITY_LEVEL", level: "standard" };
      if (clean.includes("permissive") || clean.includes("নমনীয়")) return { action: "SET_SECURITY_LEVEL", level: "permissive" };
    }

    // Intelligent Bengali response matching for live system stats (Orders count)
    if (
      clean.includes("মোট অর্ডার") || 
      clean.includes("অর্ডার কত") || 
      clean.includes("টোটাল অর্ডার") || 
      clean.includes("অর্ডার সংখ্যা") || 
      clean.includes("সব অর্ডার") || 
      clean.includes("অর্ডারের সংখ্যা") || 
      clean.includes("how many orders") || 
      clean.includes("total orders") || 
      clean.includes("order statistics") || 
      clean.includes("অর্ডার স্ট্যাটিস্টিক")
    ) {
      const activeOrdersCount = orders?.length || 0;
      const oNew = orders?.filter(o => o.status === "নতুন").length || 0;
      const oPrice = orders?.filter(o => o.status === "মূল্য নির্ধারণ").length || 0;
      const oVerify = orders?.filter(o => o.status === "পেমেন্ট যাচাই").length || 0;
      const oProcess = orders?.filter(o => o.status === "প্রক্রিয়াধীন").length || 0;
      const oComplete = orders?.filter(o => o.status === "সম্পন্ন").length || 0;
      const oCancel = orders?.filter(o => o.status === "বাতিল").length || 0;

      return {
        action: "CHAT_REPLY",
        isMatchedLocal: true,
        reply: `📊 **টাইমমেট বিডি অর্ডার স্ট্যাটিস্টিকস (লাইভ ডাটাবেজ):**\n• **মোট অর্ডারের সংখ্যা:** ${activeOrdersCount} টি\n• 🆕 **নতুন বা আনপেইড অর্ডার:** ${oNew} টি\n• 💰 **মূল্য নির্ধারণ স্ট্যাটাস:** ${oPrice} টি\n• 🔍 **পেমেন্ট যাচাইকরণাধীন:** ${oVerify} টি\n• ⚙️ **প্রক্রিয়াধীন (Processing):** ${oProcess} টি\n• ✅ **সম্পন্ন বা সফল অর্ডার:** ${oComplete} টি\n• ❌ **বাতিলকৃত অর্ডার:** ${oCancel} টি\n\n*টিপস: আপনি সরাসরি যেকোনো অর্ডারের দাম সেট করতে পারেন। যেমন: "ORD-109 এর মূল্য ৫০০ টাকা সেট করুন"*`
      };
    }

    // Pending or Active Orders list
    if (
      clean.includes("পেন্ডিং") || 
      clean.includes("নতুন অর্ডারগুলো") || 
      clean.includes("চলতি অর্ডার") || 
      clean.includes("চলমান অর্ডার") || 
      clean.includes("সক্রিয় অর্ডার") || 
      clean.includes("pending order") || 
      clean.includes("new order") || 
      clean.includes("active order")
    ) {
      const pending = orders?.filter(o => o.status === "নতুন" || o.status === "প্রক্রিয়াধীন" || o.status === "পেমেন্ট যাচাই") || [];
      if (pending.length === 0) {
        return {
          action: "CHAT_REPLY",
          isMatchedLocal: true,
          reply: "📋 বর্তমানে কোনো পেন্ডিং বা চলমান অর্ডার নেই! ডাটাবেজের সকল অর্ডার সফলভাবে সম্পন্ন বা বাতিল করা হয়েছে।"
        };
      }
      const list = pending.slice(0, 6).map(o => "• **ID:** `" + o.id + "` | **কাস্টমার:** " + (o.customerName || "N/A") + " | **স্ট্যাটাস:** " + o.status + " | **চার্জ:** ৳" + (o.charge || 0)).join("\n");
      return {
        action: "CHAT_REPLY",
        isMatchedLocal: true,
        reply: `📋 **চলতি ও পেন্ডিং অর্ডারসমূহ (লাইভ ডাটা):**\n${list}\n${pending.length > 6 ? `\n*এবং আরও ${pending.length - 6}টি পেন্ডিং অর্ডার তালিকায় রয়েছে।*` : ""}\n\n*মোট পেন্ডিং অর্ডার সংখ্যা: ${pending.length} টি*`
      };
    }

    // Revenue / Earnings / Income
    if (
      clean.includes("মোট আয়") || 
      clean.includes("মোট টাকা") || 
      clean.includes("ইনকাম") || 
      clean.includes("আয় কত") || 
      clean.includes("রেভিনিউ") || 
      clean.includes("কত টাকা") || 
      clean.includes("total earnings") || 
      clean.includes("revenue") || 
      clean.includes("income")
    ) {
      const activeOrders = orders || [];
      const totalRevenue = activeOrders.filter(o => o.status === "সম্পন্ন").reduce((sum, o) => sum + (Number(o.charge) || 0), 0);
      const pendingRevenue = activeOrders.filter(o => o.status !== "সম্পন্ন" && o.status !== "বাতিল").reduce((sum, o) => sum + (Number(o.charge) || 0), 0);
      const avgOrder = activeOrders.length ? Math.round(totalRevenue / activeOrders.length) : 0;

      return {
        action: "CHAT_REPLY",
        isMatchedLocal: true,
        reply: `💰 **টাইমমেট বিডি আর্থিক ও রেভিনিউ রিপোর্ট (লাইভ):**\n• 💵 **সফল সম্পন্ন অর্ডার থেকে মোট আয়:** ৳${totalRevenue.toLocaleString()} BDT\n• ⏳ **চলতি ও পেন্ডিং অর্ডার থেকে সম্ভাব্য আয়:** ৳${pendingRevenue.toLocaleString()} BDT\n• 📈 **গড় অর্ডার রেভিনিউ:** ৳${avgOrder.toLocaleString()} BDT\n\n*তথ্যটি সরাসরি রিয়েল-টাইম ক্লাউড ফায়ারস্টোর ডাটাবেজ থেকে হিসেব করা হয়েছে।*`
      };
    }

    // Registered Users count & summary
    if (
      clean.includes("গ্রাহক") || 
      clean.includes("ইউজার") || 
      clean.includes("কাস্টমার") || 
      clean.includes("কতজন ইউজার") || 
      clean.includes("users count") ||
      clean.includes("total users")
    ) {
      const activeUsersCount = allUsers?.length || 0;
      const bannedUsers = allUsers?.filter(u => u.isBanned).length || 0;
      const normalUsers = activeUsersCount - bannedUsers;
      return {
        action: "CHAT_REPLY",
        isMatchedLocal: true,
        reply: `👥 **টাইমমেট বিডি কাস্টমার ডাটাবেজ তথ্য (লাইভ):**\n• 📊 **মোট নিবন্ধিত গ্রাহক সংখ্যা:** ${activeUsersCount} জন\n• 🟢 **সক্রিয় বা স্বাভাবিক ইউজার:** ${normalUsers} জন\n• 🔴 **ব্লক বা ব্যানকৃত ইউজার:** ${bannedUsers} জন\n\n*আপনি যেকোনো ইউজারকে ব্যান করতে পারেন। যেমন লিখুন: "ব্যান করো ০১৮২৩৭৭৪৬১২"*`
      };
    }

    // Coin/Recharge/Balance block
    if (
      clean.includes("কয়েন") || 
      clean.includes("কয়েন") || 
      clean.includes("রিচার্জ") || 
      clean.includes("coin") || 
      clean.includes("balance") || 
      clean.includes("ব্যালেন্স")
    ) {
      return {
        action: "CHAT_REPLY",
        isMatchedLocal: true,
        reply: `🪙 **টাইমমেট বিডি কয়েন ও রিচার্জ সিস্টেম:**\n• 🔄 **কয়েন কেন ব্যবহৃত হয়:** গ্রাহকদের ঘড়ির সময় সিঙ্ক করার সময় প্রতি ক্লিকে ২ কয়েন করে রিচার্জ বা ব্যালেন্স থেকে কাটা হয়।\n• 💳 **রিচার্জ ও পেমেন্ট রিকোয়েস্ট:** ইউজার কয়েন শেষ হয়ে গেলে নগদ বা বিকাশ পেমেন্ট রিকোয়েস্ট জমা দেয়। এডমিন প্যানেলের হোম স্ক্রিন থেকে তা এপ্রুভ করলে ইউজারের ব্যালেন্সে সরাসরি কয়েন যোগ হয়ে যায়!\n• 🛠️ **অ্যাডমিন কন্ট্রোল:** আপনি সরাসরি যেকোনো গ্রাহকের প্রোফাইল এডিট করে কয়েন ব্যালেন্স ম্যানুয়ালি পরিবর্তন করতে পারেন।`
      };
    }

    // Security Hub
    if (
      clean.includes("নিরাপত্তা") || 
      clean.includes("সিকিউরিটি") || 
      clean.includes("সুরক্ষা") || 
      clean.includes("ডিভাইস লক") || 
      clean.includes("অ্যান্টি ফ্রড") || 
      clean.includes("anti-fraud") || 
      clean.includes("strict")
    ) {
      return {
        action: "CHAT_REPLY",
        isMatchedLocal: true,
        reply: `🛡️ **টাইমমেট বিডি নিরাপত্তা প্রটেকশন ও অ্যান্টি-ফ্রড হাব:**\nআমাদের সিস্টেমে নিরাপত্তা রক্ষায় কয়েকটি অটোমেটেড লেয়ার রয়েছে:\n\n১. 📱 **মাল্টি-ডিভাইস ডিটেকশন (Multi-Device Control):** একই অ্যাকাউন্ট একাধিক ফোনে ব্যবহার করা হলে সিস্টেম রিয়েল-টাইমে তা সনাক্ত করে লক করে দেয়।\n২. 🔑 **মোবাইল ওটিপি ভেরিফিকেশন (OTP Login):** সুরক্ষিত লেনদেন ও অ্যাকাউন্ট সিকিউরিটির জন্য সাইনআপ এবং মোবাইল ব্যাংকিং পেমেন্ট উত্তোলনে ওটিপি বাধ্যতামূলক।\n৩. ⚡ **সিকিউরিটি মোডস (Security Modes):**\n   - **নমনীয় (Permissive):** সাধারণ সিকিউরিটি চেক সচল।\n   - **স্বাভাবিক (Standard):** ডিফল্ট সিকিউরিটি যেখানে ডিভাইস সিঙ্ক ও ফায়ারওয়াল সচল।\n   - **কঠোর (Strict):** যেকোনো আন-অথরাইজড অ্যাডমিন অ্যাকশন বা অতিরিক্ত রিকোয়েস্টের কারণে আইপি সাময়িকভাবে স্বয়ংক্রিয় ব্লক হয়।`
      };
    }

    // Office Location
    if (
      clean.includes("বাংলাদেশ") || 
      clean.includes("ঠিকানা") || 
      clean.includes("কোথায়") || 
      clean.includes("অফিস") || 
      clean.includes("অবস্থান") || 
      clean.includes("address") || 
      clean.includes("dhaka") || 
      clean.includes("office")
    ) {
      return {
        action: "CHAT_REPLY",
        isMatchedLocal: true,
        reply: "🏢 **টাইমমেট বিডি কার্যালয় ও অবস্থান:**\nআমাদের প্রধান কার্যালয় ঢাকা, বাংলাদেশে অবস্থিত। আমরা সারা দেশে ওয়্যারলেস জিপিএস টাইম-সিঙ্ক এবং অটোমেটিক সময় মিলানো ঘড়ি বিতরণ করি। বিস্তারিত সহায়তার জন্য অ্যাডমিন প্রোফাইলের সাপোর্ট সেন্টারে যোগাযোগ করুন।"
      };
    }

    // Payments
    if (
      clean.includes("বিকাশ") || 
      clean.includes("রকেট") || 
      clean.includes("নগদ") || 
      clean.includes("পেমেন্ট") || 
      clean.includes("টাকা") || 
      clean.includes("উত্তোলন") || 
      clean.includes("bkash") || 
      clean.includes("nagad") || 
      clean.includes("payment")
    ) {
      return {
        action: "CHAT_REPLY",
        isMatchedLocal: true,
        reply: "💳 **টাইমমেট পেমেন্ট ভেরিফিকেশন ও ট্র্যাকিং:**\nটাইমমেট বিডিতে বিকাশ ও নগদের মাধ্যমে সুরক্ষিত লেনদেন করা হয়। সকল মোবাইল পেমেন্ট টপআপ রিকোয়েস্ট সরাসরি আপনার লাইভ অ্যাডমিন প্যানেলে জমা হয়। কোনো পেমেন্ট সংক্রান্ত জটিলতা হলে ড্যাশবোর্ডের পেমেন্ট হিস্ট্রি চেক করুন।"
      };
    }

    // Today statistics
    if (
      clean.includes("আজকের") || 
      clean.includes("আজকে") || 
      clean.includes("today")
    ) {
      const activeOrders = orders || [];
      const todayStr = new Date().toISOString().split('T')[0];
      const todayOrders = activeOrders.filter(o => o.createdAt && o.createdAt.includes(todayStr));
      const todayRevenue = todayOrders.filter(o => o.status === "সম্পন্ন").reduce((sum, o) => sum + (Number(o.charge) || 0), 0);
      return {
        action: "CHAT_REPLY",
        isMatchedLocal: true,
        reply: `📅 **আজকের দিনচিত্র রিপোর্ট (লাইভ ডাটাবেজ):**\n• আজকের মোট অর্ডারের সংখ্যা: ${todayOrders.length} টি\n• সম্পন্ন অর্ডার থেকে আজকের রেভিনিউ: ৳${todayRevenue.toLocaleString()} BDT\n\n*সরাসরি ফায়ারস্টোর ডাটাবেজ ট্র্যাকার থেকে সংকলিত।*`
      };
    }

    // Smart Conversational fallback answers for common greetings
    const greetings = ["hi", "hello", "হাই", "হ্যালো", "হেই", "hey", "কেমন আছো", "salam", "সালাম", "আসসালামু আলাইকুম", "কেমন আছেন", "কেমন আছ", "কে তুমি", "তুমি কে", "who are you", "chatbot", "copilot", "কো-পাইলট", "এআই"];
    const isGreeting = greetings.some(g => clean.includes(g));
    if (isGreeting) {
      return {
        action: "CHAT_REPLY",
        isMatchedLocal: true,
        reply: "আসসালামু আলাইকুম! আমি টাইমমেট বিডি এআই অ্যাডমিন কো-পাইলট। আমি আপনার টাইমমেট এডমিন সিস্টেম পরিচালনা করতে সাহায্য করতে পারি। বলুন আজ আপনাকে কিভাবে সাহায্য করতে পারি?"
      };
    }

    // Thanks
    if (
      clean.includes("ধন্যবাদ") || 
      clean.includes("thanks") || 
      clean.includes("thank you") || 
      clean.includes("থ্যাংকস")
    ) {
      return {
        action: "CHAT_REPLY",
        isMatchedLocal: true,
        reply: "আপনাকেও অসংখ্য ধন্যবাদ! টাইমমেট বিডির যেকোনো প্রশাসনিক বা পরিচালনা সংক্রান্ত সমস্যায় আমাকে নির্দ্বিধায় জিজ্ঞেস করতে পারেন। আপনার দিনটি শুভ হোক! ❤️"
      };
    }

    // Help assistance
    const helpKeywords = ["help", "হেল্প", "সাহায্য", "কাজ", "কমান্ড", "কি করতে পারো", "সাপোর্ট", "ফিচার", "নির্দেশ"];
    const isHelp = helpKeywords.some(hk => clean.includes(hk));
    if (isHelp) {
      return {
        action: "CHAT_REPLY",
        isMatchedLocal: true,
        reply: `🤖 **টাইমমেট এআই অ্যাডমিন কো-পাইলট নির্দেশিকা:**\nআমি আপনার বাংলা বা ইংরেজি নির্দেশ বুঝে সরাসরি ডাটাবেজের ওপর কাজ করতে পারি। নিচে কিছু উদাহরণ দেওয়া হলো:\n\n১. 💰 **অর্ডারের চার্জ বা দাম সেট করতে:**\n   - লিখুন: "ORD-109 এর মূল্য ৫০০ টাকা সেট করো"\n   - অথবা: "set price of ord-105 to 250"\n\n২. ⚙️ **অর্ডারের স্ট্যাটাস পরিবর্তন করতে:**\n   - লিখুন: "ORD-112 সম্পন্ন করুন"\n   - অথবা: "ord-104 বাতিল করো"\n\n৩. 🔴 **কোনো ইউজার অ্যাকাউন্ট ব্যান বা লক করতে:**\n   - লিখুন: "ব্যান করো ০১৮২৩৭৭৪৬১২"\n   - অথবা: "block user 01712345678"\n\n৪. 🔓 **কোনো অ্যাকাউন্ট আনব্যান করতে:**\n   - লিখুন: "আনব্যান করো ০১৮২৩৭৭৪৬১২"\n\n৫. 🛡️ **নিরাপত্তা লেভেল পরিবর্তন করতে:**\n   - লিখুন: "নিরাপত্তা লেভেল strict করো"\n   - অথবা: "security standard করে দিন"\n\nএছাড়াও আপনি সিস্টেমের পরিসংখ্যান জানতে চাইতে পারেন। যেমন: "মোট অর্ডার কতটি?", "আজকের মোট ইনকাম কত?", "কয়েন সিস্টেম কি?" ইত্যাদি!`
      };
    }

    // fallback chat
    return {
      action: "CHAT_REPLY",
      isMatchedLocal: false,
      reply: `আমি আপনার বার্তাটি বুঝতে পেরেছি কিন্তু সরাসরি অ্যাকশন মডিউল খুঁজে পাইনি। আপনি যদি কোনো সাধারণ জিজ্ঞাসা বা কথোপকথন করতে চান, তাহলে আমার কাছে সরাসরি প্রশ্ন করতে পারেন। আমি উত্তর দেওয়ার চেষ্টা করব!`
    };
  };

  const handleCommandSubmit = async (eOrText: React.FormEvent | string) => {
    let text = "";
    if (typeof eOrText === "string") {
      text = eOrText.trim();
    } else {
      if (eOrText && typeof eOrText.preventDefault === "function") {
        eOrText.preventDefault();
      }
      text = prompt.trim();
    }

    if (!text) return;

    if (!isAiModeOn) {
      addToast("অনুগ্রহ করে আগে এআই মোডটি অন করুন!", "error");
      return;
    }

    const userPrompt = text;
    setPrompt("");

    // Append User's Message immediately to the thread
    const userMessage: ChatMessage = {
      id: Math.random().toString(),
      sender: "admin",
      text: userPrompt,
      timestamp: new Date()
    };
    setChatHistory((prev) => [...prev, userMessage]);

    setIsLoading(true);
    logEvent(`প্রম্পট ইনপুট: "${userPrompt}"`, "info");

    const getContextStr = () => {
      const activeUsersCount = allUsers?.length || 0;
      const activeOrdersCount = orders?.length || 0;
      
      const conciseOrders = orders?.slice(0, 40).map(o => ({
        id: o.id,
        customer: o.customerName || o.customerPhone || "N/A",
        status: o.status || "নতুন",
        charge: o.charge || 0,
        service: o.serviceType || o.service || "সাধারণ",
        date: o.createdAt || "N/A"
      }));

      const conciseUsers = allUsers?.slice(0, 45).map(u => ({
        name: u.fullName || u.name || "N/A",
        phone: u.phone || "N/A",
        banned: u.isBanned ? "Yes" : "No",
        coins: u.coins || u.balance || 0,
        role: u.role || "user"
      }));

      return `TimeMate BD Admin Panel Live Context:
- Total registered database users: ${activeUsersCount}
- Total registered customer orders: ${activeOrdersCount}

Detailed Recent Orders (Last 40):
${JSON.stringify(conciseOrders)}

Detailed Registered Users (Last 45):
${JSON.stringify(conciseUsers)}

Operational Stats:
- Completed Orders: ${orders?.filter(o => o.status === "সম্পন্ন").length || 0}
- Pending/Processing: ${orders?.filter(o => o.status === "প্রক্রিয়াধীন" || o.status === "নতুন" || o.status === "পেমেন্ট যাচাই").length || 0}
- Total Earnings: ${orders?.filter(o => o.status === "সম্পন্ন").reduce((sum, o) => sum + (Number(o.charge) || 0), 0)} BDT
- Total Banned Users: ${allUsers?.filter(u => u.isBanned).length || 0}
`;
    };

    try {
      // 1. Check local parser FIRST to see if we can execute local commands or answer common greetings/help requests immediately!
      const localParsed = parsePromptLocally(userPrompt);
      if (localParsed && localParsed.action !== "CHAT_REPLY") {
        // It's a structured admin command!
        const resultText = await executeAction(localParsed);
        setChatHistory((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: "ai",
            text: resultText,
            timestamp: new Date()
          }
        ]);
        setIsLoading(false);
        return;
      }

      // Build conversation history string to include in the context
      const chatContext = chatHistory
        .slice(-8)
        .map((m) => `${m.sender === "admin" ? "Human Admin" : "AI Co-Pilot"}: ${m.text}`)
        .join("\n");

      // 2. Not a simple local action. Proceed to Server-Side Gemini safety proxy
      const response = await fetch("/api/play-proxy-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `You are TimeMate BD's Admin AI Assistant.
Your task is to analyze the human administrator's instruction and convert it into a strictly formatted JSON action payload.

Conversation history for context:
${chatContext}

Current Human Admin Input: "${userPrompt}"

Available Actions to map:
- If the instruction is to set an order price/charge:
  { "action": "SET_ORDER_PRICE", "orderId": "ORD-XXXX", "price": 500 }
- If the instruction is to change an order status:
  { "action": "UPDATE_ORDER_STATUS", "orderId": "ORD-XXXX", "status": "status_value" } (allowed statuses: "নতুন", "মূল্য নির্ধারণ", "পেমেন্ট যাচাই", "প্রক্রিয়াধীন", "সম্পন্ন", "বাতিল")
- If the instruction is to ban/block a user:
  { "action": "BAN_USER", "phone": "01XXXXXXXXX" }
- If the instruction is to unban/unblock a user:
  { "action": "UNBAN_USER", "phone": "01XXXXXXXXX" }
- If the instruction is to set security level:
  { "action": "SET_SECURITY_LEVEL", "level": "strict" | "standard" | "permissive" }
- If the instruction requests deleting orders, changing checkout bKash numbers, altering credentials, bypassing security rules, or resetting admin keys (SENSITIVE):
  { "action": "REJECT_SENSITIVE", "reason": "এটি একটি স্পর্শকাতর কার্যকলাপ এবং নিরাপত্তা জনিত কারণে শুধুমাত্র একজন মানব প্রশাসক এই কাজটি সম্পন্ন করতে পারবেন।" }
- For general greetings, conversations, questions about users or systems, or chat (always reply in friendly, helpful, professional Bengali):
  { "action": "CHAT_REPLY", "reply": "Bengali chat reply here answering user's question with detail" }

Rules:
- Respond ONLY with the JSON object. Do NOT include markdown backticks (\`\`\`json), comments, or conversational text. This must be a clean parseable JSON string.
- Translate Bengali numerals (যেমন: ৫০০ to 500, ০১৮২৩৭৭৪৬১২ to 01823774612) into standard integers/strings.`
        })
      });

      if (!response.ok) {
        throw new Error("Gemini AI Proxy failed or returned error.");
      }

      const resData = await response.json();
      const rawText = resData.text || "";
      
      // Attempt to parse JSON response
      let parsedPayload;
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : rawText;
        parsedPayload = JSON.parse(cleanJson);
      } catch (parseErr) {
        console.warn("Gemini JSON parse failed, utilizing backup.", rawText);
        parsedPayload = { action: "CHAT_REPLY" };
      }

      let resultText = "";
      if (parsedPayload.action === "CHAT_REPLY") {
        logEvent("সার্ভার-সাইড গুগল এআই চ্যাট এবং সার্চ ক্লাউড একটিভ করা হচ্ছে...", "info");
        
        const contextStr = getContextStr();

        const historyParam = chatHistory.slice(-8).map(m => ({
          role: m.sender === "admin" ? "user" : "model",
          text: m.text
        }));

        const aiChatResponse = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userPrompt,
            history: historyParam,
            context: contextStr,
            isCustomerSupport: false,
            mode: "admin"
          })
        });

        if (aiChatResponse.ok) {
          const chatData = await aiChatResponse.json();
          resultText = chatData.text || "দুঃখিত, কোনো উত্তর পাওয়া যায়নি।";
          if (chatData.sources && chatData.sources.length > 0) {
            const sourceList = chatData.sources.map((s: any) => `• [${s.title}](${s.uri})`).join("\n");
            resultText += `\n\n**তথ্যসূত্র (Google Search):**\n${sourceList}`;
          }
        } else {
          resultText = parsedPayload.reply || "দুঃখিত, এআই চ্যাট সার্ভিস এখন সাড়া দিচ্ছে না। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।";
        }
      } else {
        resultText = await executeAction(parsedPayload);
      }
      
      // Append AI Response to the thread
      setChatHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "ai",
          text: resultText,
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      console.warn("AI routing exception, using fallback search chat.", err);
      try {
        const contextStr = getContextStr();

        const historyParam = chatHistory.slice(-8).map(m => ({
          role: m.sender === "admin" ? "user" : "model",
          text: m.text
        }));

        const aiChatResponse = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userPrompt,
            history: historyParam,
            context: contextStr,
            isCustomerSupport: false,
            mode: "admin"
          })
        });

        if (aiChatResponse.ok) {
          const chatData = await aiChatResponse.json();
          let resultText = chatData.text || "দুঃখিত, কোনো উত্তর পাওয়া যায়নি।";
          if (chatData.sources && chatData.sources.length > 0) {
            const sourceList = chatData.sources.map((s: any) => `• [${s.title}](${s.uri})`).join("\n");
            resultText += `\n\n**তথ্যসূত্র (Google Search):**\n${sourceList}`;
          }
          setChatHistory((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              sender: "ai",
              text: resultText,
              timestamp: new Date()
            }
          ]);
        } else {
          throw new Error("Fallback chat also failed");
        }
      } catch (fallbackErr) {
        let resultText = "";
        
        // Check if user has saved userApiKey in localStorage or has VITE_GEMINI_API_KEY for direct calls
        const apiKeyToUse = userApiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
        if (apiKeyToUse) {
          logEvent("ক্লায়েন্ট-সাইড জেমিনি এপিআই সংযোগ করা হচ্ছে...", "info");
          const modelsToTry = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b"];
          for (const modelName of modelsToTry) {
            try {
              const directResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKeyToUse}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: userPrompt }] }]
                })
              });
              if (directResponse.ok) {
                const directData = await directResponse.json();
                const text = directData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  resultText = text;
                  logEvent(`সফলভাবে ক্লায়েন্ট-সাইড মডেল (${modelName}) দিয়ে রেসপন্স জেনারেট করা হয়েছে।`, "success");
                  break;
                }
              }
            } catch (directErr) {
              console.warn(`Direct client model ${modelName} error:`, directErr);
            }
          }
        }

        if (!resultText) {
          const clean = userPrompt.toLowerCase().trim();
          
          // Let's check our local rule-based NLP assistant
          const localParsed = parsePromptLocally(userPrompt);
          if (localParsed && localParsed.reply && !localParsed.reply.includes("অ্যাকশন মডিউল খুঁজে পাইনি")) {
            resultText = localParsed.reply;
          } else {
            // Intelligent contextual matching for general/conversation inputs if AI keys are offline
            if (clean.includes("বাংলাদেশ") || clean.includes("ঠিকানা") || clean.includes("কোথায়") || clean.includes("অফিস") || clean.includes("অবস্থান") || clean.includes("কোথায়") || clean.includes("address") || clean.includes("dhaka") || clean.includes("office")) {
              resultText = "🏢 **টাইমমেট বিডি কার্যালয় ও অবস্থান:**\nআমাদের প্রধান কার্যালয় ঢাকা, বাংলাদেশে অবস্থিত। আমরা সারা দেশে ওয়্যারলেস জিপিএস টাইম-সিঙ্ক এবং অটোমেটিক সময় মিলানো ঘড়ি বিতরণ করি। বিস্তারিত সহায়তার জন্য অ্যাডমিন প্রোফাইলের সাপোর্ট সেন্টারে যোগাযোগ করুন।";
            } else if (clean.includes("বিকাশ") || clean.includes("রকেট") || clean.includes("নগদ") || clean.includes("পেমেন্ট") || clean.includes("টাকা") || clean.includes("উত্তোলন") || clean.includes("bKash") || clean.includes("nagad") || clean.includes("payment")) {
              resultText = "💳 **টাইমমেট পেমেন্ট ভেরিফিকেশন ও ট্র্যাকিং:**\nটাইমমেট বিডিতে বিকাশ ও নগদের মাধ্যমে সুরক্ষিত লেনদেন করা হয়। সকল মোবাইল পেমেন্ট টপআপ রিকোয়েস্ট সরাসরি আপনার লাইভ অ্যাডমিন প্যানেলে জমা হয়। কোনো পেমেন্ট সংক্রান্ত জটিলতা হলে ড্যাশবোর্ডের পেমেন্ট হিস্ট্রি চেক করুন।";
            } else if (clean.includes("ঘড়ি") || clean.includes("সময়") || clean.includes("সিঙ্ক") || clean.includes("টাইম") || clean.includes("sync") || clean.includes("clock") || clean.includes("time")) {
              resultText = "🕰️ **ডিভাইস ও সময় সমন্বয় (Time Synchronization):**\nআমাদের উন্নত ঘড়িগুলো অটোমেটিক ইন্টারনেট এনটিপি (NTP) টাইম প্রটোকল ব্যবহার করে সঠিক সময় দেখায়। প্রতিবার গ্রাহকের ঘড়ির সময় সিঙ্ক করতে ২ কয়েন করে রিচার্জ বা ব্যালেন্স থেকে কাটা হয়।";
            } else if (clean.includes("কো-পাইলট") || clean.includes("এআই") || clean.includes("assistant") || clean.includes("copilot") || clean.includes("chatbot") || clean.includes("তুমি কে") || clean.includes("কে তুমি") || clean.includes("who are you")) {
              resultText = "🤖 আমি টাইমমেট বিডি-র ডেডিকেটেড এআই অ্যাডমিন কো-পাইলট। আমি অ্যাডমিন প্যানেল থেকে অর্ডার মূল্য পরিবর্তন, স্ট্যাটাস আপডেট, ইউজার ব্লক/আনব্লক এবং রিয়েল-টাইম রিপোর্ট জেনারেট করতে পারি।";
            } else if (clean.includes("ধন্যবাদ") || clean.includes("thanks") || clean.includes("thank you") || clean.includes("থ্যাংকস")) {
              resultText = "আপনাকেও অসংখ্য ধন্যবাদ! টাইমমেট বিডির যেকোনো প্রশাসনিক বা পরিচালনা সংক্রান্ত সমস্যায় আমাকে নির্দ্বিধায় জিজ্ঞেস করতে পারেন। আপনার দিনটি শুভ হোক! ❤️";
            } else if (clean.includes("আজকের") || clean.includes("আজকে") || clean.includes("today")) {
              const activeOrders = orders || [];
              const todayStr = new Date().toISOString().split('T')[0];
              const todayOrders = activeOrders.filter(o => o.createdAt && o.createdAt.includes(todayStr));
              const todayRevenue = todayOrders.filter(o => o.status === "সম্পন্ন").reduce((sum, o) => sum + (Number(o.charge) || 0), 0);
              resultText = `📅 **আজকের দিনচিত্র রিপোর্ট (লাইভ ডাটাবেজ):**\n• আজকের মোট অর্ডারের সংখ্যা: ${todayOrders.length} টি\n• সম্পন্ন অর্ডার থেকে আজকের রেভিনিউ: ৳${todayRevenue.toLocaleString()} BDT\n\n*সরাসরি ফায়ারস্টোর ডাটাবেজ ট্র্যাকার থেকে সংকলিত।*`;
            } else {
              // General conversational answer with instructions on how to activate Gemini on Vercel
              const isVercel = window.location.hostname.includes("vercel.app");
              if (isVercel) {
                resultText = `⚠️ **এআই কো-পাইলট অ্যাক্টিভেশন নির্দেশনা (Vercel Host):**
আপনার টাইমমেট প্রজেক্টটি Vercel-এ হোস্ট করা আছে। Vercel একটি স্ট্যাটিক সাইট হিসেবে রান করায় এক্সপ্রেস ব্যাকএন্ড সার্ভার এপিআইগুলো সেখানে এভেইলেবল থাকে না।

**কিভাবে চ্যাটবটকে পুরোপুরি সক্রিয় করবেন:**
১. এই উইন্ডোর উপরে ডানদিকে থাকা **⚙️ এপিআই কি** বাটনে ক্লিক করুন।
২. আপনার গুগল জেমিনি এপিআই কি পেস্ট করে সংরক্ষণ করুন (এটি আপনার ব্রাউজারে সুরক্ষিত থাকবে)।
৩. অথবা Vercel ড্যাশবোর্ডে গিয়ে এই প্রজেক্টের Environment Variables এ **VITE_GEMINI_API_KEY** নাম দিয়ে আপনার জেমিনি কি সেট করুন।

*উল্লেখ্য: আপনি আমাদের সিস্টেমের পরিসংখ্যান সরাসরি বাংলায় জিজ্ঞাসা করতে পারেন (যেমন: 'মোট অর্ডার কতটি?', 'চলতি অর্ডারগুলো দেখাও', 'আজকের মোট ইনকাম কত?'), যা ক্লায়েন্ট সাইড থেকে নিখুঁতভাবে জবাব দেবে!*`;
              } else {
                resultText = `আমি আপনার বার্তাটি বুঝতে পেরেছি কিন্তু এআই মডেল সংযোগ সাময়িকভাবে ব্যাহত হয়েছে। 
আপনি আমাদের এডমিন প্যানেলের রিয়েল-টাইম পরিসংখ্যান বাংলায় জিজ্ঞাসা করতে পারেন। যেমন:
• "মোট অর্ডার কতটি?"
• "পেন্ডিং অর্ডার দেখাও"
• "আজকের মোট ইনকাম কত?"
• "নিরাপত্তা প্রটেকশন হাব কি?"`;
              }
            }
          }
        }

        setChatHistory((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: "ai",
            text: resultText,
            timestamp: new Date()
          }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#0b0c1e] to-[#12132d] text-white p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden">
      {/* Background glowing visual circles */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-600/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Top Banner & Mode Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-3xl ${isAiModeOn ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 animate-pulse" : "bg-white/5 text-gray-500"} transition-all duration-500 shadow-lg`}>
            <Brain size={34} className={isAiModeOn ? "animate-spin-slow" : ""} />
          </div>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
              TimeMate Admin AI Co-Pilot & Chatbot
              {isAiModeOn && <Sparkles size={16} className="text-yellow-400 animate-bounce" />}
            </h2>
            <p className="text-xs text-indigo-200/60 mt-1 font-medium">
              সিস্টেম ম্যানেজমেন্ট, চ্যাটবট অ্যাসিস্ট্যান্স ও রিয়েল-টাইম অটোমেটিক সিকিউরিটি কন্ট্রোল।
            </p>
          </div>
        </div>

        {/* AI Mode Toggle & Reset Chat Button */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 px-3 py-2 ${showSettings ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/50" : "bg-white/5 text-indigo-300 border-white/10"} hover:bg-white/10 border rounded-xl text-xs font-bold hover:text-white transition-all cursor-pointer`}
            title="এআই এপিআই কি সেটিংস"
          >
            <Settings size={13} className={showSettings ? "animate-spin-slow text-indigo-400" : ""} />
            <span>⚙️ এপিআই কি</span>
          </button>

          <button
            type="button"
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-indigo-300 hover:text-white transition-all cursor-pointer"
            title="চ্যাট হিস্ট্রি রিসেট করুন"
          >
            <RotateCcw size={13} />
            <span>রিসেট চ্যাট</span>
          </button>

          <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
            <span className={`text-[10px] uppercase font-black tracking-widest ${isAiModeOn ? "text-indigo-400" : "text-gray-500"}`}>
              {isAiModeOn ? "AI MODE ACTIVE" : "AI MODE INACTIVE"}
            </span>
            <button
              type="button"
              onClick={() => setIsAiModeOn(!isAiModeOn)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 cursor-pointer outline-none ${isAiModeOn ? "bg-indigo-600" : "bg-white/10"}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-300 ${isAiModeOn ? "translate-x-8" : "translate-x-1"}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* API Key configuration drawer */}
      {showSettings && (
        <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-indigo-500/30 text-xs text-indigo-100 transition-all duration-300">
          <div className="flex justify-between items-center mb-2.5">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Settings size={14} className="animate-spin-slow" />
              ক্লায়েন্ট-সাইড জেমিনি এপিআই কি সেটিংস (Vercel ও ব্যাকআপের জন্য)
            </span>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-white font-bold"
            >
              ✕
            </button>
          </div>
          <p className="mb-3 text-indigo-200/70 leading-relaxed text-[11px]">
            Vercel-এ হোস্ট করার সময় অথবা ব্যাকএন্ড সার্ভার ও কোটা সংক্রান্ত জটিলতা এড়াতে আপনি আপনার নিজস্ব **Gemini API Key** সংরক্ষণ করতে পারেন। কি-টি সম্পূর্ণ ক্লায়েন্ট-সাইডে আপনার ব্রাউজারের লোকাল স্টোরেজে সুরক্ষিত থাকবে।
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={userApiKey}
              onChange={(e) => setUserApiKey(e.target.value)}
              className="flex-1 bg-black/40 border border-indigo-500/20 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer text-xs"
              >
                সংরক্ষণ করুন
              </button>
              {userApiKey && (
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer text-xs"
                >
                  মুছে ফেলুন
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Layout Grid */}
      <div className="grid grid-cols-1 gap-8 mt-8">
        {/* Main Messenger Chat Bot Interface */}
        <div className="space-y-6">
          <div className="bg-slate-900/90 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[580px] max-w-4xl mx-auto">
            {/* Messenger Style Header */}
            <div className="bg-gradient-to-r from-indigo-900/90 via-slate-900 to-indigo-950 p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-md flex items-center justify-center text-white">
                    <Bot size={22} />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    টাইমমেট এআই কো-পাইলট
                    <Sparkles size={14} className="text-amber-400 fill-amber-400" />
                  </h3>
                  <p className="text-[10px] font-bold text-indigo-200/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    অনলাইন • মেসেঞ্জার চ্যাটবট মোড
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer border border-white/5"
                  title="চ্যাট হিস্ট্রি রিসেট"
                >
                  <RotateCcw size={13} />
                  <span className="hidden sm:inline text-[10px] uppercase font-black">রিসেট</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-indigo-300 hover:text-white transition-all cursor-pointer border border-white/5"
                  title="জেমিনি কি সেটিংস"
                >
                  <Settings size={15} />
                </button>
              </div>
            </div>

            {/* Scrollable Conversation History (Messenger Thread) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-950/70 scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent">
              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"} items-start gap-2.5`}
                >
                  {msg.sender === "ai" && (
                    <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 mt-1 shadow-md">
                      <Bot size={16} />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-xs font-medium leading-relaxed whitespace-pre-wrap shadow-md ${
                      msg.sender === "admin"
                        ? "bg-indigo-600 text-white rounded-tr-xs"
                        : "bg-slate-800/90 border border-white/10 text-gray-100 rounded-tl-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1 opacity-80 text-[8px] font-black uppercase tracking-wider">
                      <span>{msg.sender === "admin" ? "অ্যাডমিন (আপনি)" : "টাইমমেট এআই"}</span>
                      <div className="flex items-center gap-2">
                        <span>{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.text, msg.id)}
                          className="hover:text-white transition-all cursor-pointer flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/25 text-[8px] font-bold text-gray-200"
                          title="মেসেজ কপি করুন"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check size={10} className="text-emerald-400" />
                              <span className="text-emerald-400">কপি হয়েছে</span>
                            </>
                          ) : (
                            <>
                              <Copy size={10} />
                              <span>কপি</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {msg.text}
                  </div>
                  {msg.sender === "admin" && (
                    <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 mt-1 shadow-md">
                      <User size={16} />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 animate-pulse">
                    <Bot size={16} className="animate-spin-slow" />
                  </div>
                  <div className="bg-slate-800/90 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-xs text-xs font-semibold text-indigo-200 flex items-center gap-2 shadow-md">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    টাইমমেট এআই মেসেজ প্রসেস করছে...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Messenger Footer Input */}
            <AICopilotChatForm
              onSubmit={handleCommandSubmit}
              isAiModeOn={isAiModeOn}
              isLoading={isLoading}
              prompt={prompt}
            />
          </div>

          {/* Guidelines / Quick Actions */}
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
              <Info size={14} />
              এআই কুইক অ্যাকশন সাজেশন
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { label: "নতুন অর্ডারের মূল্য সেট", cmd: "ORD-109 এর মূল্য ৫০০ টাকা সেট করো" },
                { label: "সন্দেহজনক গ্রাহক ব্যান", cmd: "ব্যান করো ০১৮২৩৭৭৪৬১২" },
                { label: "গ্রাহক আনব্যান অ্যাকশন", cmd: "আনব্যান করো ০১৮২৩৭৭৪৬১২" },
                { label: "নিরাপত্তা লেভেল পরিবর্তন", cmd: "নিরাপত্তা লেভেল Strict বা কঠোর করে দাও" }
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={!isAiModeOn || isLoading}
                  onClick={() => setPrompt(item.cmd)}
                  className="px-4 py-3 bg-black/20 hover:bg-black/40 border border-white/5 rounded-xl text-left text-[11px] font-bold text-gray-300 hover:text-white transition-all flex justify-between items-center group cursor-pointer disabled:opacity-50"
                >
                  <span>{item.label}</span>
                  <span className="text-[9px] text-indigo-400 font-mono group-hover:translate-x-1 transition-all">»</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
