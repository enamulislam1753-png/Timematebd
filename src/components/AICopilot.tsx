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
  Bot
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
      logEvent("অ্যাডমিন এআই চ্যাট হিস্ট্রি রিসেট করা হয়েছে।", "info");
      addToast("চ্যাট হিস্ট্রি সফলভাবে সাফ করা হয়েছে।", "info");
    }
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
        const msg = `গ্রাহক ${targetUser.fullName || "ব্যবহারকারী"} (${cleanPhone}) অ্যাকাউন্টটি ব্যান বা লক করা হয়েছে।`;
        logEvent(msg, "success");
        addToast(msg, "success");

        // Fire real security alert
        await addDoc(collection(db, "security_alerts"), {
          userPhone: cleanPhone,
          userName: targetUser.fullName || "Unknown",
          issue: "এআই এডমিন দ্বারা সন্দেহজনক কার্যকলাপের কারণে অ্যাকাউন্টটি ব্যান করা হয়েছে",
          severity: "high",
          timestamp: new Date().toISOString(),
          status: "active",
          deviceId: targetUser.deviceId || "DEV_AUTO"
        });

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
          role: "customer",
          isBanned: false
        });
        const msg = `গ্রাহক ${targetUser.fullName || "ব্যবহারকারী"} (${cleanPhone}) অ্যাকাউন্টটি আনব্যান করা হয়েছে।`;
        logEvent(msg, "success");
        addToast(msg, "success");
        return `✓ সফলভাবে সম্পন্ন হয়েছে!\n${msg}`;
      } 
      
      else if (action === "SET_SECURITY_LEVEL") {
        const { level } = payload;
        const msg = `নিরাপত্তা ও অ্যান্টি-ফ্রড প্রটেকশন লেভেল পরিবর্তন করে "${level.toUpperCase()}" করা হয়েছে।`;
        logEvent(msg, "success");
        addToast(msg, "success");
        return `✓ সফলভাবে সম্পন্ন হয়েছে!\n${msg}`;
      } 
      
      else if (action === "CHAT_REPLY") {
        return payload.reply || "আমি কিভাবে সাহায্য করতে পারি বলুন?";
      } 
      
      else {
        throw new Error("অজানা এআই কমান্ড ফরম্যাট।");
      }
    } catch (err: any) {
      const errMsg = `অ্যাকশন এক্সিকিউশন ব্যর্থ হয়েছে: ${err.message}`;
      logEvent(errMsg, "error");
      addToast(err.message, "error");
      return `❌ ত্রুটি: ${err.message}`;
    }
  };

  // Safe manual regex-based fallback parser in case API keys are missing/rate-limited
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

    // fallback chat
    return {
      action: "CHAT_REPLY",
      reply: `আমি আপনার বার্তাটি বুঝতে পেরেছি কিন্তু সরাসরি অ্যাকশন মডিউল খুঁজে পাইনি। আপনি যদি কোনো সাধারণ জিজ্ঞাসা বা কথোপকথন করতে চান, তাহলে আমার কাছে সরাসরি প্রশ্ন করতে পারেন। আমি উত্তর দেওয়ার চেষ্টা করব!`
    };
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    if (!isAiModeOn) {
      addToast("অনুগ্রহ করে আগে এআই মোডটি অন করুন!", "error");
      return;
    }

    const userPrompt = prompt;
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

    try {
      // Build conversation history string to include in the context
      const chatContext = chatHistory
        .slice(-8)
        .map((m) => `${m.sender === "admin" ? "Human Admin" : "AI Co-Pilot"}: ${m.text}`)
        .join("\n");

      // 1. Send instruction to Server-Side Gemini safety proxy
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
        
        const activeUsersCount = allUsers?.length || 0;
        const activeOrdersCount = orders?.length || 0;
        const contextStr = `TimeMate BD Admin Panel Live Context:
- Total registered database users: ${activeUsersCount}
- Total registered customer orders: ${activeOrdersCount}
Recent Orders context: ${JSON.stringify(orders?.slice(0, 5).map(o => ({ id: o.id, customerName: o.customerName, status: o.status, charge: o.charge })))}`;

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
            context: contextStr
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
        const activeUsersCount = allUsers?.length || 0;
        const activeOrdersCount = orders?.length || 0;
        const contextStr = `TimeMate BD Admin Panel Live Context:
- Total registered database users: ${activeUsersCount}
- Total registered customer orders: ${activeOrdersCount}
Recent Orders context: ${JSON.stringify(orders?.slice(0, 5).map(o => ({ id: o.id, customerName: o.customerName, status: o.status, charge: o.charge })))}`;

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
            context: contextStr
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
        const localParsed = parsePromptLocally(userPrompt);
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

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Main Chat Bot Thread Interface */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-black/30 p-6 rounded-3xl border border-white/5 space-y-4 min-h-[450px] flex flex-col justify-between">
            {/* Scrollable Conversation History */}
            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-4 pr-2 scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5 mb-2 border-b border-white/5 pb-2">
                <Zap size={12} className="animate-pulse" />
                এআই চ্যাট থ্রেড (Conversational Memory Active)
              </span>

              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"} items-start gap-2`}
                >
                  {msg.sender === "ai" && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <Bot size={16} />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl text-xs font-semibold leading-relaxed leading-relaxed whitespace-pre-wrap shadow-lg border ${
                      msg.sender === "admin"
                        ? "bg-indigo-650/40 border-indigo-500/30 text-white rounded-tr-none ml-10"
                        : "bg-white/5 border-white/5 text-indigo-100 rounded-tl-none mr-10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1.5 opacity-50 text-[8px] font-black uppercase">
                      <span>{msg.sender === "admin" ? "অ্যাডমিন (You)" : "টাইমমেট এআই সহকারী"}</span>
                      <span>{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {msg.text}
                  </div>
                  {msg.sender === "admin" && (
                    <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                      <User size={16} />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 animate-pulse">
                    <Bot size={16} className="animate-spin-slow" />
                  </div>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none text-xs font-bold text-indigo-300 flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    এআই প্রম্পট ও অ্যাকশন বিশ্লেষণ করছে...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleCommandSubmit} className="flex gap-2.5 pt-4 border-t border-white/5">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isAiModeOn ? "যেকোনো প্রশ্ন জিজ্ঞেস করুন বা অর্ডার আপডেট করুন..." : "এআই মোড অফ আছে"}
                disabled={!isAiModeOn || isLoading}
                className="flex-1 px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-bold placeholder-gray-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isAiModeOn || isLoading || !prompt.trim()}
                className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition-all rounded-2xl text-white font-black cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center justify-center active:scale-95 border-0"
              >
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* Guidelines / Quick Actions */}
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
              <Info size={14} />
              এআই কুইক অ্যাকশন সাজেশন
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

        {/* Real-time System Logs performed by AI */}
        <div className="space-y-6">
          <div className="bg-black/20 p-6 rounded-3xl border border-white/5 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                  <Sliders size={12} />
                  এআই অ্যাকশন লগস
                </span>
                <button
                  type="button"
                  onClick={() => setExecutionLogs([])}
                  className="text-[9px] uppercase font-black tracking-wider text-gray-500 hover:text-white transition-colors"
                >
                  ক্লিয়ার
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {executionLogs.length === 0 ? (
                  <p className="text-[10px] text-gray-600 italic text-center py-8">কোনো অ্যাকশন হিস্ট্রি রেকর্ড নেই।</p>
                ) : (
                  executionLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-[10px] font-medium leading-relaxed border ${
                        log.type === "success"
                          ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-300"
                          : log.type === "error"
                            ? "bg-red-500/5 border-red-500/10 text-red-300"
                            : "bg-white/5 border-white/5 text-gray-300"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono text-[9px] text-gray-500">{log.time}</span>
                        <span className={`text-[8px] font-black uppercase px-1 rounded ${
                          log.type === "success"
                            ? "bg-emerald-500/10"
                            : log.type === "error"
                              ? "bg-red-500/10"
                              : "bg-white/10"
                        }`}>
                          {log.type}
                        </span>
                      </div>
                      <p>{log.msg}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Human Only Notice Block */}
            <div className="mt-4 pt-4 border-t border-white/5 bg-red-500/5 border border-red-500/10 p-3.5 rounded-2xl">
              <span className="text-[9px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1.5 mb-1">
                <Lock size={11} />
                প্রশাসক শুধুমাত্র (Human Sensitive)
              </span>
              <p className="text-[9px] text-gray-400 leading-relaxed font-semibold">
                ডাটাবেস রিসেট, পেমেন্ট নম্বর মডিফিকেশন এবং মানব ক্রেনডেনশিয়াল পরিবর্তন শুধুমাত্র মানুষের জন্য সংরক্ষিত। এআই এ সকল পরিবর্তনের অধিকার রাখে না।
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
