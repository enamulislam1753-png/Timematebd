/**
 * Security Guardian for TimeMate BD
 * Implements client-side defense patches to prevent source code cracking,
 * browser DevTools inspection, and casual reverse-engineering.
 */

export const initSecurityGuardian = () => {
  if (typeof window === "undefined") return;

  const isDev = 
    window.location.hostname === "localhost" || 
    window.location.hostname === "127.0.0.1" ||
    window.location.origin.includes("ais-dev-");

  // 1. Disable Right-Click Context Menu to block element inspection
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  }, false);

  // 2. Disable hotkeys commonly used for reverse-engineering and source extraction
  document.addEventListener("keydown", (e) => {
    // F12 Key (Inspecting tools)
    if (e.key === "F12" || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Ctrl + Shift + I (Inspect)
    // Ctrl + Shift + J (Console)
    // Ctrl + Shift + C (Inspect element inspector)
    if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C" || e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
      e.preventDefault();
      return false;
    }

    // Ctrl + U (View Source Code)
    if (e.ctrlKey && (e.key === "u" || e.key === "U" || e.keyCode === 85)) {
      e.preventDefault();
      return false;
    }

    // Ctrl + S (Save Page Offline)
    if (e.ctrlKey && (e.key === "s" || e.key === "S" || e.keyCode === 83)) {
      e.preventDefault();
      return false;
    }
  }, false);

  // 3. Anti-Debugger / DevTools Jammer
  // If DevTools are opened, this loop halts script inspection and freezes the inspection panels in production.
  if (!isDev) {
    const jammer = () => {
      try {
        (function anonymous() {
          (function anonymous2() {
            debugger;
          })();
        })();
      } catch (e) {}
    };

    setInterval(() => {
      jammer();
    }, 800);
  }

  // 4. Hide sensitive console statements in production
  if (!isDev) {
    setInterval(() => {
      console.clear();
    }, 3000);
  }

  console.log("%cTimeMate BD - Security Engine Active", "color: #10b981; font-weight: bold; font-size: 14px; padding: 4px; border: 1px solid #10b981; border-radius: 4px;");
};
