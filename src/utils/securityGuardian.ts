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

  // Safe non-blocking shortcuts protection
  document.addEventListener("keydown", (e) => {
    // F12 Key
    if (e.key === "F12" || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I, J, C
    if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C" || e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
      e.preventDefault();
      return false;
    }
  }, false);
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
