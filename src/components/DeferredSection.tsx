import React, { useState, useEffect } from "react";
import { motion } from "motion/react";

interface DeferredSectionProps {
  children: React.ReactNode;
  delay?: number;
}

export const DeferredSection: React.FC<DeferredSectionProps> = ({
  children,
  delay = 35,
}) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Schedule rendering after the main paint/state update finishes
    const timer = setTimeout(() => {
      setIsReady(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center py-20 w-full min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-extrabold uppercase tracking-widest animate-pulse">
            লোড হচ্ছে (Loading)...
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="w-full will-change-[transform,opacity]"
    >
      {children}
    </motion.div>
  );
};
