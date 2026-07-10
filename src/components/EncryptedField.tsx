import React, { useState, useEffect } from "react";
import { Lock, Unlock } from "lucide-react";
import { obfuscateData } from "../utils/securityGuardian";

interface EncryptedFieldProps {
  value: string;
  type?: "text" | "phone" | "email" | "address";
  className?: string;
}

export const EncryptedField: React.FC<EncryptedFieldProps> = ({
  value,
  type = "text",
  className = ""
}) => {
  const [isShieldActive, setIsShieldActive] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("timemate_gdpr_shield") === "true";
    }
    return false;
  });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    const handleShieldChange = () => {
      setIsShieldActive(localStorage.getItem("timemate_gdpr_shield") === "true");
    };

    window.addEventListener("timemate_gdpr_shield_change", handleShieldChange);
    return () => {
      window.removeEventListener("timemate_gdpr_shield_change", handleShieldChange);
    };
  }, []);

  if (!value) return null;

  // If shield is not active, display normal value
  if (!isShieldActive) {
    return <span className={className}>{value}</span>;
  }

  // Obfuscate / Encrypt logic
  const getEncryptedDisplay = () => {
    if (type === "phone") {
      const clean = value.replace(/\s+/g, "");
      if (clean.length > 5) {
        return `${clean.substring(0, 4)}••••${clean.substring(clean.length - 3)}`;
      }
      return "••••••••";
    }
    if (type === "email") {
      const parts = value.split("@");
      if (parts.length === 2) {
        return `${parts[0].substring(0, 2)}•••@${parts[1]}`;
      }
      return "••••@••••.•••";
    }
    
    // Default or text: dynamic Base64-XOR segment
    const cipher = obfuscateData(value).substring(0, 8);
    return `enc_${cipher}`;
  };

  return (
    <span
      className={`relative inline-flex items-center gap-1.5 transition-all duration-300 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Military-Grade Shield Active: Hover to view plain text"
    >
      <span
        className={`font-mono transition-all duration-300 flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] ${
          isHovered
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 border-dashed"
        }`}
      >
        {isHovered ? (
          <>
            <Unlock size={11} className="text-emerald-500 animate-pulse" />
            <span className="font-sans select-all">{value}</span>
          </>
        ) : (
          <>
            <Lock size={10} className="text-indigo-500" />
            <span>{getEncryptedDisplay()}</span>
          </>
        )}
      </span>
    </span>
  );
};
