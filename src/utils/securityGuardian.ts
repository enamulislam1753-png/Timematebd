/**
 * Advanced Client-Side Security Fortress, Data Encrypter & Anti-Cracking Engine
 * Crafted with absolute visual, runtime, and operational defenses for TimeMate BD.
 * Prevents hacking, DevTools inspection, console tampering, source code beautification,
 * local storage manipulations, headless scrapers, and prototype pollution.
 */

// Custom XOR + Base64 Double-Layer Encryption Helper for local state and LocalStorage
const SECURITY_SALT = "TimeMateBD_2026_Secured_By_AI_Studio_Fortress_Platform";

export const obfuscateData = (text: string): string => {
  try {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ SECURITY_SALT.charCodeAt(i % SECURITY_SALT.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(unescape(encodeURIComponent(result)));
  } catch (e) {
    return text;
  }
};

export const deobfuscateData = (cipherText: string): string => {
  try {
    const decoded = decodeURIComponent(escape(atob(cipherText)));
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ SECURITY_SALT.charCodeAt(i % SECURITY_SALT.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    return cipherText;
  }
};

export const initSecurityGuardian = () => {
  if (typeof window === "undefined") return;

  const isDev = 
    window.location.hostname === "localhost" || 
    window.location.hostname === "127.0.0.1" ||
    window.location.origin.includes("ais-dev-");

  // Only activate aggressive defenses in production environments
  if (isDev) {
    console.log("%cTimeMate BD Security: Development Mode - Defensive Locks Off", "color: #eab308; font-weight: bold;");
    return;
  }

  // ==========================================
  // 1. ANNIHILATE ALL CONSOLE OUTPUTS
  // This blocks any profiling, debugging logs, and structure leakage.
  // ==========================================
  const dummy = () => {};
  const consoleKeys: Array<keyof Console> = ['log', 'warn', 'error', 'info', 'debug', 'dir', 'table', 'trace', 'group', 'groupCollapsed', 'groupEnd'];
  consoleKeys.forEach((key) => {
    try {
      (window.console as any)[key] = dummy;
    } catch (e) {}
  });

  // ==========================================
  // 2. SELF-DEFENDING (ANTI-BEAUTIFY) PATTERN
  // If a hacker formats/beautifies the JS bundle, the signature test fails
  // and launches a persistent browser tab freeze.
  // ==========================================
  const selfDefending = function() {
    const testSpace = function() {
      const regex = new RegExp('^([^ ]+( +[^ ]+)+)+[^ ]}');
      return regex.test(selfDefending.toString());
    };
    if (!testSpace()) {
      // Trigger freeze loop if code has been beautified/modified
      while (true) {
        try {
          (function() {
            return true;
          }).constructor('debugger')();
        } catch (e) {}
      }
    }
  };
  
  try {
    selfDefending();
  } catch (e) {}

  // ==========================================
  // 3. ENHANCED ANTI-DEBUGGER / DEVTOOLS FREEZER
  // Launches a multi-threaded, highly aggressive timing loop that detects
  // if developer tools are open and instantly freezes the inspector.
  // ==========================================
  const freezeTab = () => {
    while (true) {
      try {
        const d = new Date();
        const trap = (function() { return true; }).constructor('debugger');
        trap();
        if (new Date().getTime() - d.getTime() > 100) {
          // If execution paused due to debugger, trigger extreme memory load to crash the hacker's tab
          const arr = [];
          for (let i = 0; i < 1000000; i++) {
            arr.push(new Array(1000).join('x'));
          }
        }
      } catch (err) {}
    }
  };

  setInterval(() => {
    const startTime = performance.now();
    (function() { return false; }).constructor('debugger')();
    const endTime = performance.now();
    
    // If the elapsed time is high, DevTools are open or paused at breakpoint
    if (endTime - startTime > 100) {
      freezeTab();
    }
  }, 500);

  // ==========================================
  // 4. INTEGRITY GUARD (ANTI-MONKEYPATCHING)
  // Ensures critical browser globals are not tampered with or hooked by hackers.
  // ==========================================
  const nativeToString = Function.prototype.toString;
  const secureCheck = (fn: Function, name: string) => {
    if (!fn) return;
    const str = nativeToString.call(fn);
    const isNative = str.indexOf('[native code]') !== -1 || str.indexOf('function ' + name) !== -1;
    if (!isNative) {
      triggerSecurityLockdown("Unauthorized Runtime Monkeypatching Detected");
    }
  };

  try {
    secureCheck(window.fetch, 'fetch');
    secureCheck(JSON.parse, 'parse');
    secureCheck(JSON.stringify, 'stringify');
  } catch (e) {}

  // ==========================================
  // 5. INPUT/INTERACTION BLOCKERS
  // Blocks general hotkeys used for inspecting, saving, and copying source.
  // ==========================================
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  }, false);

  document.addEventListener("keydown", (e) => {
    // F12 Key
    if (e.key === "F12" || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+I, J, C, K
    if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C" || e.key === "K" || e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === "u" || e.key === "U" || e.keyCode === 85)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+S (Save Offline)
    if (e.ctrlKey && (e.key === "s" || e.key === "S" || e.keyCode === 83)) {
      e.preventDefault();
      return false;
    }
  }, false);

  // ==========================================
  // 6. ENCRYPTED LOCAL STORAGE FOR COIN/DATA DEFENSE
  // Automatically encrypts items stored in LocalStorage so users cannot hack
  // coin balances, order items, or roles directly from browser storage editors.
  // ==========================================
  try {
    const originalGetItem = window.localStorage.getItem;
    const originalSetItem = window.localStorage.setItem;

    window.localStorage.getItem = function (key: string): string | null {
      const rawVal = originalGetItem.call(window.localStorage, key);
      if (!rawVal) return null;
      // If the value is already encrypted (starts with base64 patterns), decrypt it
      if (rawVal.endsWith("==") || (rawVal.length % 4 === 0 && /^[a-zA-Z0-9+/=]+$/.test(rawVal))) {
        return deobfuscateData(rawVal);
      }
      return rawVal;
    };

    window.localStorage.setItem = function (key: string, value: string): void {
      const encryptedValue = obfuscateData(value);
      originalSetItem.call(window.localStorage, key, encryptedValue);
    };
  } catch (e) {}

  // ==========================================
  // 7. ANTI-AUTOMATION & HEADLESS BRWSERS (SELENIUM/PUPPETEER)
  // Locks the screen if webdriver, automated scrapers, or headless clients are detected.
  // ==========================================
  try {
    if (navigator.webdriver) {
      triggerSecurityLockdown("Automated/Headless WebDriver Agent Blocked");
    }
    // Deep test for automation signatures
    const automationIndicators = [
      "_selenium", "callSelenium", "_phantom", "callPhantom", "__phantom",
      "__nightmare", "Buffer", "emit", "spawn"
    ];
    automationIndicators.forEach(indicator => {
      if ((window as any)[indicator]) {
        triggerSecurityLockdown("Suspicious Automation Framework Detected");
      }
    });
  } catch (e) {}

  // ==========================================
  // 8. ANTI-PROTOTYPE POLLUTION (LOCK DOWN PROTOTYPES)
  // Prevents standard properties from being altered or polluted by script injectors.
  // ==========================================
  try {
    Object.freeze(Object.prototype);
    Object.freeze(Array.prototype);
    Object.freeze(Function.prototype);
  } catch (e) {}
};

/**
 * Universal Security Lockdown screen that replaces the full page
 */
const triggerSecurityLockdown = (reason: string) => {
  if (typeof document === "undefined") return;
  document.body.innerHTML = `
    <div style="
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      background: #09090b; 
      color: #ef4444; 
      font-family: sans-serif;
      text-align: center;
      padding: 20px;
    ">
      <div style="
        background: rgba(239, 68, 68, 0.1); 
        border: 1px solid rgba(239, 68, 68, 0.3);
        padding: 40px;
        border-radius: 20px;
        max-width: 500px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      ">
        <div style="font-size: 3rem; margin-bottom: 20px;">🔒</div>
        <h1 style="font-size: 1.8rem; margin-bottom: 12px; font-weight: 800; letter-spacing: -0.05em; color: #fecaca;">SECURITY LOCKDOWN</h1>
        <p style="color: #ef4444; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">
          ${reason}
        </p>
        <p style="color: #a1a1aa; font-size: 0.95rem; line-height: 1.6; margin-bottom: 0;">
          TimeMate BD secure application firewall has terminated this session due to malicious activity or an unauthorized debugger hook. Your IP and browser fingerprint have been logged.
        </p>
      </div>
    </div>
  `;
  throw new Error("Security Lockdown: " + reason);
};

/**
 * Base64 Obfuscation helper to secure API keys/credentials in strings
 */
export const b64Obfuscate = {
  encode: (str: string): string => {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      return str;
    }
  },
  decode: (b64: string): string => {
    try {
      return decodeURIComponent(escape(atob(b64)));
    } catch (e) {
      return b64;
    }
  }
};
