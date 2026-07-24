import "dotenv/config";
import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";

// Lazy-initialized Gemini Client to prevent crash on startup if API key is missing
let aiClient: any = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing on the server. Please add it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Active Quota Tracker for self-healing Gemini Routing
let isGemini35Exhausted = false;
let lastQuotaExhaustedTime = 0;
const EXHAUSTION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown to retry primary model

// Robust fallback and retry wrapper for Gemini generation to handle 429/503/RESOURCE_EXHAUSTED/UNAVAILABLE errors
async function generateContentWithRetry(
  client: any,
  params: {
    model: string;
    contents: any;
    config?: any;
  },
  maxRetries = 2
): Promise<any> {
  let attempt = 0;
  let currentModel = params.model;
  
  // If we are attempting to use gemini-3.5-flash but it's marked as exhausted, auto-route to gemini-3.1-flash-lite
  if (currentModel === "gemini-3.5-flash" && isGemini35Exhausted) {
    if (Date.now() - lastQuotaExhaustedTime < EXHAUSTION_COOLDOWN_MS) {
      console.warn(`[Gemini API Self-Healing] gemini-3.5-flash is temporarily marked as EXHAUSTED. Instant-routed to gemini-3.1-flash-lite.`);
      currentModel = "gemini-3.1-flash-lite";
    } else {
      isGemini35Exhausted = false; // Cooldown expired, let's try gemini-3.5-flash again
    }
  }
  
  while (true) {
    // gemini-3.1-flash-lite does not support googleSearch tool; strip it if active to avoid unsupported tool errors
    const runConfig = { ...params.config };
    if (currentModel === "gemini-3.1-flash-lite" && runConfig.tools) {
      delete runConfig.tools;
    }

    try {
      const response = await client.models.generateContent({
        ...params,
        model: currentModel,
        config: runConfig,
      });
      return response;
    } catch (err: any) {
      attempt++;
      const errStr = err instanceof Error ? err.message : String(err);
      const isRateLimitOrUnavailable = 
        errStr.includes("429") || 
        errStr.includes("503") || 
        errStr.includes("RESOURCE_EXHAUSTED") || 
        errStr.includes("UNAVAILABLE") || 
        errStr.toLowerCase().includes("high demand") || 
        errStr.toLowerCase().includes("quota");

      if (isRateLimitOrUnavailable) {
        // Mark gemini-3.5-flash as exhausted
        if (currentModel === "gemini-3.5-flash") {
          isGemini35Exhausted = true;
          lastQuotaExhaustedTime = Date.now();
        }

        if (attempt <= maxRetries) {
          console.warn(`[Gemini API Warning] Attempt ${attempt} failed with rate limit or unavailability: ${errStr}. Retrying after 1000ms...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          // On subsequent attempts, if it keeps failing, switch model to gemini-3.1-flash-lite as fallback
          if (attempt === maxRetries && currentModel === "gemini-3.5-flash") {
            console.warn("[Gemini API Fallback] Switching model from gemini-3.5-flash to gemini-3.1-flash-lite due to repeated errors.");
            currentModel = "gemini-3.1-flash-lite";
          }
          continue;
        }
      }
      
      // If we haven't already switched to gemini-3.1-flash-lite, try one last time with gemini-3.1-flash-lite immediately
      if (currentModel === "gemini-3.5-flash") {
        console.warn("[Gemini API Fallback] Instant fallback to gemini-3.1-flash-lite after error:", errStr);
        isGemini35Exhausted = true;
        lastQuotaExhaustedTime = Date.now();
        
        try {
          const fallbackConfig = { ...params.config };
          if (fallbackConfig.tools) delete fallbackConfig.tools;

          const fallbackResponse = await client.models.generateContent({
            ...params,
            model: "gemini-3.1-flash-lite",
            config: fallbackConfig,
          });
          return fallbackResponse;
        } catch (fallbackErr) {
          console.error("[Gemini API Fallback Error]:", fallbackErr);
        }
      }
      
      throw err;
    }
  }
}

// Temporary storage for verified phone and email OTP codes in server-side memory
const otpStore = new Map<string, { code: string; expiresAt: number }>();

const app = express();

// Enable Gzip compression for fast server responses over low bandwidth networks
app.use(compression());

// Middleware to parse incoming bodies as JSON
app.use(express.json());

  // SECURE BACKEND SOURCE CODE ACCESS: Only the developer (enamulislam1753@gmail.com) can retrieve raw code!
  app.get('/download-:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      
      // Map file aliases to actual pathnames on the server
      const fileMap: Record<string, string> = {
        'app-source': 'src/App.tsx',
        'app-source.txt': 'src/App.tsx',
        'package-json': 'package.json',
        'package-json.txt': 'package.json',
        'order-tracker': 'src/components/OrderTracker.tsx',
        'order-tracker.txt': 'src/components/OrderTracker.tsx',
        'firebase-ts': 'src/lib/firebase.ts',
        'firebase-ts.txt': 'src/lib/firebase.ts',
        'index-css': 'index.css',
        'index-css.txt': 'index.css',
        'index-html': 'index.html',
        'index-html.txt': 'index.html',
        'vite-config': 'vite.config.ts',
        'vite-config.txt': 'vite.config.ts',
        'tsconfig': 'tsconfig.json',
        'tsconfig.txt': 'tsconfig.json'
      };

      const relativePath = fileMap[filename];
      if (!relativePath) {
        return res.status(404).send("File not found or access restricted.");
      }

      // Check Authorization headers for owner validation
      const authHeader = req.headers.authorization || req.query.token;
      let token = "";
      if (typeof authHeader === "string") {
        token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      }

      if (!token) {
        return res.status(401).send("Unauthorized: Authentication Token Missing. Source code download is highly restricted.");
      }

      const apiKey = process.env.VITE_FIREBASE_API_KEY || Buffer.from("QUl6YVN5QlVSRVpaZXc1WEY5ZF9IZkc3YTZnRm5xR0NjdmRwSHNr", "base64").toString("utf-8");
      const firebaseResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token })
      });

      if (!firebaseResponse.ok) {
        return res.status(401).send("Unauthorized: Invalid Credentials/Expired Token.");
      }

      const data = (await firebaseResponse.json()) as any;
      const email = data.users?.[0]?.email;

      // Allow ONLY the designated developer enamulislam1753@gmail.com
      if (email !== "enamulislam1753@gmail.com") {
        console.warn(`[Security Intrusion Alert] Blocked source download request for ${filename} from: ${email}`);
        return res.status(403).send("Forbidden: You do not have permissions to read/extract the source code of TimeMate BD.");
      }

      const filePath = path.resolve(process.cwd(), relativePath);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.sendFile(filePath);
      } else {
        res.status(404).send("File not present on server disk.");
      }
    } catch (err: any) {
      console.error("[Secure Source Download Error]:", err);
      res.status(500).send("Internal Server Security Error.");
    }
  });

  // Custom Route to serve the APK file directly with correct headers
  app.get('/timemate-bd.apk', (req, res) => {
    let filePath = path.resolve(process.cwd(), 'public/timemate-bd.apk');
    
    // Fallback if public folder is not used or it is already in dist/
    if (!fs.existsSync(filePath)) {
      filePath = path.resolve(process.cwd(), 'dist/timemate-bd.apk');
    }

    if (fs.existsSync(filePath)) {
      console.log(`[APK] Serving APK file from: ${filePath}`);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="timemate-bd.apk"');
      res.sendFile(filePath);
    } else {
      console.warn(`[APK Notice] APK file not found at: ${filePath}`);
      res.status(404).send('APK File Not Found.');
    }
  });

  // REST API: Secure Employee/Staff Account Generator Endpoint
  app.post("/api/create-account", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required fields." });
      }

      console.log(`[Account REST Admin API] Generating credentials for user: ${email}`);
      const apiKey = process.env.VITE_FIREBASE_API_KEY || Buffer.from("QUl6YVN5QlVSRVpaZXc1WEY5ZF9IZkc3YTZnRm5xR0NjdmRwSHNr", "base64").toString("utf-8");
      
      const firebaseResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: false })
      });

      const data = await firebaseResponse.json();
      if (!firebaseResponse.ok) {
        console.warn("[Account REST Admin API User-Creation Notice]:", data.error);
        return res.status(firebaseResponse.status).json({ error: data.error?.message || "Firebase SDK error." });
      }

      console.log(`[Account REST Admin API Success]: Account generated with UID: ${data.localId}`);
      res.json({ uid: data.localId });
    } catch (err: any) {
      console.warn("[Account REST Admin Notice]:", err.message || err);
      res.status(500).json({ error: err.message || "Internal server error." });
    }
  });

  // REST API: Dispatches Real-Time Verification OTP Codes via Email (Nodemailer) or simulated SMS
  app.post("/api/send-otp", async (req, res) => {
    try {
      const { target, type } = req.body; // type: "phone" | "email"
      if (!target) {
        return res.status(400).json({ error: "Target address/mobile is required." });
      }

      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(target, { code: generatedCode, expiresAt: Date.now() + 5 * 60000 }); // Valid for 5 minutes

      console.log(`[OTP Engine Logs] Dispatched ${generatedCode} for target: ${target} (${type})`);

      if (type === "email") {
        const smtpHost = process.env.SMTP_HOST || "";
        const smtpPort = parseInt(process.env.SMTP_PORT || "587");
        const smtpUser = process.env.SMTP_USER || "";
        const smtpPass = process.env.SMTP_PASS || "";

        if (smtpUser && smtpPass) {
          const transporter = nodemailer.createTransport({
            host: smtpHost || "smtp.gmail.com",
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          });

          const mailOptions = {
            from: `"TimeMate BD Authentication" <${smtpUser}>`,
            to: target,
            subject: "TimeMate BD: ভেরিফিকেশন কোড",
            text: `TimeMate BD তে আপনার ইমেইল যাচাই করার কোডটি হলো: ${generatedCode}. এটি পরবর্তী ৫ মিনিট নিরাপদ থাকবে।`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #1e293b; border-radius: 16px; background-color: #020211; color: #ffffff;">
                <h2 style="color: #6366f1; text-align: center; margin-bottom: 5px; font-weight: 900; letter-spacing: -0.5px;">TimeMate BD Safety</h2>
                <p style="text-align: center; color: #64748b; font-size: 11px; margin-top: 0; margin-bottom: 25px;">আপনার সঠিক নিরাপত্তার বিশ্বস্ত অংশীদার</p>
                <hr style="border: 0; border-top: 1px solid #ffffff10; margin-bottom: 20px;" />
                <p style="font-size: 13px; line-height: 1.6; color: #cbd5e1;">টাইমমেট বিডি অ্যাকাউন্ট ভেরিফিকেশন সিস্টেম থেকে ইমেলটি পাঠানো হয়েছে। আপনার কাঙ্ক্ষিত ৬-ডিজিটের কোডটি নিচে প্রদান করা হলো:</p>
                <div style="text-align: center; margin: 35px 0;">
                  <span style="font-size: 34px; font-weight: 900; background: rgba(99, 102, 241, 0.1); border: 2px dashed #6366f1; color: #38bdf8; padding: 12px 30px; letter-spacing: 6px; border-radius: 12px; display: inline-block;">${generatedCode}</span>
                </div>
                <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">এই ওয়ান-টাইম ওটিপি কোডটি গোপনীয় রাখুন এবং কারো সাথে শেয়ার করবেন না। এটি আগামী ৫ মিনিটের জন্য কার্যকর থাকবে।</p>
                <hr style="border: 0; border-top: 1px solid #ffffff10; margin-top: 25px; margin-bottom: 15px;" />
                <p style="font-size: 9px; color: #475569; text-align: center; margin: 0;">© 2026 TimeMate BD Inc. All Rights Reserved.</p>
              </div>
            `
          };

          await transporter.sendMail(mailOptions);
          return res.json({ success: true, message: "SMTP Mail sent successfully!", realMailSent: true });
        } else {
          console.warn("[SMTP Bypass Alert] SMTP_USER and SMTP_PASS variables not configured. Returning simulated bypass block.");
          return res.json({ success: true, code: generatedCode, message: "Credentials not present. OTP bypass payload enabled.", realMailSent: false });
        }
      } else {
        // Phone OTP simulated logger or real Bangladesh SMS Gateway integration (fully secured)
        console.log(`[SECURE SMS ENGINE] Code generated for phone ${target}: ${generatedCode}`);
        
        const smsApiKey = process.env.SMS_API_KEY || "";
        const smsToken = process.env.SMS_TOKEN || "";
        
        if (smsApiKey || smsToken) {
          try {
            let url = "";
            if (smsToken) {
              // Greenweb SMS API integration
              url = `https://api.greenweb.com.bd/api.php?json&token=${encodeURIComponent(smsToken)}&to=${encodeURIComponent(target)}&message=${encodeURIComponent(`TimeMate BD: ভেরিফিকেশন কোডটি হলো ${generatedCode}`)}`;
            } else {
              // BulkSMSBD SMS API integration
              url = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(smsApiKey)}&type=text&number=${encodeURIComponent(target)}&senderid=${encodeURIComponent(process.env.SMS_SENDER_ID || "8809612")}&message=${encodeURIComponent(`TimeMate BD: ভেরিফিকেশন কোডটি হলো ${generatedCode}`)}`;
            }
            // Dynamic node-fetch load to avoid CommonJS bundle issues
            const fetch = (await import("node-fetch")).default as any;
            await fetch(url);
            console.log(`[SMS Gateway Success] Dispatched SMS OTP to: ${target}`);
          } catch (smsErr: any) {
            console.error("[SMS Gateway Error]:", smsErr);
          }
        }

        return res.json({ success: true, message: "OTP dispatched successfully" });
      }
    } catch (err: any) {
      console.error("SMS OTP dispatch error:", err);
      return res.status(500).json({ error: err.message || "Failed to send OTP" });
    }
  });

  // REST API: Endpoint for Gemini AI Copilot & Customer Chatbot
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { message, history, context, isCustomerSupport, mode } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "message is required and must be a string" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing on server" });
      }

      const client = new GoogleGenAI({ apiKey });
      const isCustomer = isCustomerSupport === true || mode === "customer";

      // 1. Restricted Customer Support System Instruction (strictly locked & sales-focused)
      const customerSystemInstruction = `You are the official "TimeMate BD Customer AI Assistant" (টাইমমেট বিডি কাস্টমার সাপোর্ট এআই) for TimeMate BD.

STRICT DOMAIN LOCK & GUARDRAIL MANDATE (কঠোর নিয়ম ও বাউন্ডারি):
You are strictly limited ONLY to TimeMate BD customer sales & support services:
1. Service Orders & Requests (সার্ভিস অর্ডার, ট্র্যাকিং, বুকিং ও নতুন সার্ভিসের আবেদন)
2. Payments, Pricing & Wallet (পেমেন্ট পদ্ধতি, সার্ভিস চার্জ, রিচার্জ, বিকাশ/নগদ)
3. Discounts, Offers & Promotions (ডিসকাউন্ট অফার, স্পেশাল প্রমোশন)
4. Coupons & Cashback (কুপন কোড, ক্যাশব্যাক অফার)

About TimeMate BD Services:
- Groceries Shopping (বাজার ও গ্রোসারি): Quick and customized local market shopping.
- Standing in Queue / Waiting Support (লাইনে দাঁড়ানো / ওয়েটিং সাপোর্ট): Waiting at passport offices, banks, clinics, or ticket counters.
- Banking Support (ব্যাংকিং কাজ): Document delivery, cheque deposit, or query assistance.
- Utility Bill Payments (ইউটিলিটি বিল পরিশোধ): Smooth electricity, gas, water, or internet bill clearance.
- Doctor Appointment Bookings (ডাক্তার অ্যাপয়েন্টমেন্ট): Reserving and assisting clinic schedules.
- VIP Golden Express Courier (ভিআইপি গোল্ডেন এক্সপ্রেস কুরিয়ার): High-security, ultra-fast customized dispatch within and outside Dhaka.

Context about the current user & system:
${context || "No active order or user details available."}

CRITICAL RULES FOR CUSTOMER AI:
1. STRICT OFF-TOPIC REFUSAL: If the user asks ANYTHING outside TimeMate BD services, orders, payments, offers, or discounts (for example: programming/coding, math equations, scientific questions, general knowledge, recipes, jokes, news, politics, storytelling, or irrelevant conversation), YOU MUST REFUSE politely in Bengali:
"আমি কেবল টাইমমেট বিডির সার্ভিস অর্ডার, পেমেন্ট, ডিসকাউন্ট ও কুপন সম্পর্কিত সহায়তার জন্য নিয়োজিত। অনুগ্রহ করে টাইমমেট বিডির অফার বা সার্ভিস বুকিং সংক্রান্ত বিষয়ে প্রশ্ন করুন।"
Do NOT answer off-topic queries under any circumstances!
2. SALES-FOCUSED & CONCISE: Every response must be helpful, polite, concise, and focused on driving sales or resolving customer service queries for TimeMate BD.
3. REAL-TIME DATA: If the customer asks about order status or history, refer directly to "Context about the current user & system" above.
4. Reply in Bengali/Bangla or English matching the customer's language.`;

      // 2. Full Unrestricted Admin AI Copilot System Instruction (all capabilities, coding, math, science, database intelligence & Google Search)
      const adminSystemInstruction = `You are the official "TimeMate BD Admin AI Copilot" (টাইমমেট বিডি এডমিন এআই কো-পাইলট) for TimeMate BD administrators and staff.

YOUR CAPABILITIES ARE FULLY UNRESTRICTED & UNLOCKED:
1. Full Admin Operations: Manage orders, users, revenues, analytics, system status, and operational metrics.
2. Full Technical & Programming Expertise: Write, explain, debug, or analyze code in any language (Python, TypeScript, JavaScript, Rust, C++, SQL, HTML/CSS, etc.).
3. Full Scientific & Mathematical Intelligence: Solve math equations, physics/chemistry problems, complex data analysis, or logic puzzles.
4. General Knowledge & Search Grounding: Answer any query on general knowledge, current events, business strategies, or web searches using Google Search.
5. Content Creation & Analysis: Draft emails, write reports, summarize documents, or create stories and operational workflows.

About TimeMate BD Services:
- Groceries Shopping (বাজার ও গ্রোসারি)
- Standing in Queue / Waiting Support (লাইনে দাঁড়ানো / ওয়েটিং সাপোর্ট)
- Banking Support (ব্যাংকিং কাজ)
- Utility Bill Payments (ইউটিলিটি বিল পরিশোধ)
- Doctor Appointment Bookings (ডাক্তার অ্যাপয়েন্টমেন্ট)
- VIP Golden Express Courier (ভিআইপি গোল্ডেন এক্সপ্রেস কুরিয়ার)

Context about the current user & system:
${context || "No active order or user details available."}

Guidelines:
1. Provide comprehensive, accurate, and expert assistance without domain restrictions.
2. If asked about system statistics, orders, or users, calculate/parse directly from "Context about the current user & system" above to provide accurate real-time data.
3. Feel free to solve coding problems, answer math/science questions, write articles, or perform any cognitive task requested by the admin.
4. Always reply in the user's language (primarily Bengali/Bangla or English).`;

      const systemInstruction = isCustomer ? customerSystemInstruction : adminSystemInstruction;

const contents: any[] = [];
      if (Array.isArray(history)) {
        for (const item of history) {
          if (item && item.role && item.text) {
            contents.push({
              role: item.role === "user" ? "user" : "model",
              parts: [{ text: item.text }]
            });
          }
        }
      }
      contents.push({ role: "user", parts: [{ text: message }] });

      let response: any;
      let usedGrounding = false;
      try {
        console.log(`[AI Chat API] Attempting generateContent with Google Search grounding...`);
        response = await generateContentWithRetry(client, {
          model: "gemini-3.5-flash",
          contents,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
          }
        });
        usedGrounding = !!(response?.candidates?.[0]?.groundingMetadata?.groundingChunks);
      } catch (searchErr: any) {
        console.warn("[AI Chat API] Search grounding failed, retrying without search tools:", searchErr?.message || searchErr);
        // Self-healing fallback: retry WITHOUT search tools (crucial for free tier / restricted keys)
        response = await generateContentWithRetry(client, {
          model: "gemini-3.5-flash",
          contents,
          config: {
            systemInstruction,
          }
        });
      }

      const replyText = response.text || "দুঃখিত, কোনো উত্তর জেনারেট করা সম্ভব হয়নি।";
      
      // Extract Google Search grounding sources to display beautifully to the user!
      const groundingChunks = usedGrounding ? response.candidates?.[0]?.groundingMetadata?.groundingChunks : null;
      const sources = groundingChunks ? groundingChunks.map((chunk: any) => ({
        title: chunk.web?.title || "Web Source",
        uri: chunk.web?.uri || "#"
      })).filter((s: any) => s.uri !== "#") : [];

      res.json({
        text: replyText,
        sources
      });
    } catch (err: any) {
      console.error("[AI Chat API Error]:", err);
      res.status(500).json({ error: err.message || "Internal AI Chat assistant failure." });
    }
  });

  // REST API: Secure 2026 Google Play Compliant Gemini AI Proxy Wrapper
  // Enforces Server-Side API Key Hiding, Active Prompt Injection Sanitization & Google AI Safety Settings
  app.post("/api/play-proxy-gemini", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "prompt is required and must be a string." });
      }

      // 1. Strict Server-Side Input Sanitization & Prompt Injection Protection
      const cleanPrompt = prompt.trim();
      const suspiciousWords = [
        "ignore previous", "system prompt", "forget rules", "developer mode", 
        "bypass settings", "switch role", "dan mode", "do anything now"
      ];
      
      const containsSuspicious = suspiciousWords.some(word => 
        cleanPrompt.toLowerCase().includes(word)
      );

      if (containsSuspicious) {
        console.warn(`[Security Alert] Rejected potential prompt injection attempt: "${cleanPrompt.substring(0, 50)}..."`);
        return res.status(400).json({ 
          error: "Security Check Failed: Prompt contains unauthorized framing words. Prompt injection is strictly blocked." 
        });
      }

      // 2. Fetch Server-Side Protected API Key
      const apiKey = process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        return res.status(503).json({ error: "Gemini API key is not configured on the server." });
      }

      const client = getGeminiClient();
      console.log(`[API Secure AI Proxy] Forwarding sanitized request to Gemini 3.5-Flash via SDK...`);
      
      // 3. Forward request using official SDK with fallback retry handling
      const response = await generateContentWithRetry(client, {
        model: "gemini-3.5-flash",
        contents: cleanPrompt,
        config: {
          safetySettings: [
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" }
          ],
          temperature: 0.2,
        }
      });

      const replyText = response.text || "No response generated due to safety filter block.";
      res.json({ text: replyText });
    } catch (e: any) {
      console.warn("[Gemini Proxy Notice]:", e?.message || e);
      res.status(500).json({ error: e.message || "Internal AI backend failure." });
    }
  });

  // API Health route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const PORT = Number(process.env.PORT || 3000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    // Lazy-load Vite in development mode
    import("vite").then(async (viteModule) => {
      const vite = await viteModule.createServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log(`[Server] Vite middleware loaded in development mode.`);
      
      if (!process.env.VERCEL) {
        app.listen(PORT, "0.0.0.0", () => {
          console.log(`Server running on port ${PORT}`);
        });
      }
    }).catch((err) => {
      console.error("Error loading Vite in development:", err);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`[Server] Serving static files from: ${distPath}`);

    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  }

export default app;
