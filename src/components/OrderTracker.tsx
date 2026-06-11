import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  MapPin, 
  Truck, 
  Navigation, 
  Compass, 
  Clock, 
  Phone, 
  User, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle 
} from "lucide-react";

interface OrderTrackerProps {
  order: any;
  language: "BN" | "EN";
  trans: (bn: string, en: string) => string;
}

export default function OrderTracker({ order, language, trans }: OrderTrackerProps) {
  // Coordinates and state simulation for the courier
  const [courierLocation, setCourierLocation] = useState({ lat: 23.8103, lng: 90.4125 }); // Dhaka Default
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0); // in minutes
  const [distanceRemaining, setDistanceRemaining] = useState(0); // in km
  const [noiseIndex, setNoiseIndex] = useState(0);

  const status = order.status || "নতুন";
  const isCancelled = status === "বাতিল";
  const isCompleted = status === "সম্পন্ন";

  // Hub definitions along the path
  const hubs = [
    { nameBN: "সেলার ওয়্যারহাউস", nameEN: "Seller Warehouse", percentage: 0, lat: 23.8103, lng: 90.4125 },
    { nameBN: "কাওরান বাজার সর্টিং হাব", nameEN: "Karwan Bazar Sorting Hub", percentage: 30, lat: 23.7509, lng: 90.3935 },
    { nameBN: "টঙ্গী সেন্ট্রাল হাব", nameEN: "Tongi Central Hub", percentage: 60, lat: 23.8821, lng: 90.4014 },
    { nameBN: "লোকাল ডিস্ট্রিবিউশন এজেন্ট", nameEN: "Local Distribution Agent", percentage: 85, lat: 23.7925, lng: 90.4078 },
    { nameBN: "গ্রাহকের দুয়ার", nameEN: "Customer Doorstep", percentage: 100, lat: 23.7771, lng: 90.3994 },
  ];

  // Helper function to map order active status to progress percentage
  const getProgressPercentage = () => {
    if (order.riderProgress !== undefined) {
      return order.riderProgress;
    }
    switch (status) {
      case "নতুন":
        return 5;
      case "মূল্য নির্ধারণ":
        return 15;
      case "পেমেন্ট যাচাই":
        return 35;
      case "প্রক্রিয়াধীন":
        return 70;
      case "সম্পন্ন":
        return 100;
      case "বাতিল":
        return 0;
      default:
        return 20;
    }
  };

  const progress = getProgressPercentage();

  // Simulated metrics according to progress
  useEffect(() => {
    let baseSpeed = 0;
    let baseEta = 0;
    let baseDist = 0;

    if (status === "নতুন") {
      baseSpeed = 0;
      baseEta = 90;
      baseDist = 12.4;
    } else if (status === "মূল্য নির্ধারণ") {
      baseSpeed = 0;
      baseEta = 75;
      baseDist = 12.4;
    } else if (status === "পেমেন্ট যাচাই") {
      baseSpeed = 5;
      baseEta = 60;
      baseDist = 10.8;
    } else if (status === "প্রক্রিয়াধীন") {
      baseSpeed = 42; // standard Dhaka traffic velocity
      baseEta = 25;
      baseDist = 3.6;
    } else if (status === "সম্পন্ন") {
      baseSpeed = 0;
      baseEta = 0;
      baseDist = 0;
    }

    setSpeed(baseSpeed);
    setEta(baseEta);
    setDistanceRemaining(baseDist);
  }, [status]);

  // Jitter coordinates to simulate active live tracking
  useEffect(() => {
    if (isCancelled || isCompleted || status === "নতুন" || status === "মূল্য নির্ধারণ") {
      return;
    }

    const interval = setInterval(() => {
      // Calculate interpolation coordinates along the path depending on progress
      const progressFactor = progress / 100;
      const startHub = hubs[0];
      const endHub = hubs[hubs.length - 1];
      
      const targetLat = startHub.lat + (endHub.lat - startHub.lat) * progressFactor;
      const targetLng = startHub.lng + (endHub.lng - startHub.lng) * progressFactor;

      // Add dynamic noise jitter representing live movement
      const jitterLat = targetLat + (Math.sin(noiseIndex) * 0.0006);
      const jitterLng = targetLng + (Math.cos(noiseIndex) * 0.0006);
      
      setCourierLocation({ lat: jitterLat, lng: jitterLng });
      setNoiseIndex((prev) => prev + 0.3);

      // Random speed fluctuation
      setSpeed((prev) => {
        if (prev === 0) return 0;
        const delta = Math.floor(Math.random() * 7) - 3;
        const nextSpeed = Math.max(25, Math.min(55, prev + delta));
        return nextSpeed;
      });

      // Random slow countdown of distance & ETA
      setDistanceRemaining((prev) => {
        if (prev <= 0.2) return 0;
        return parseFloat((prev - 0.01).toFixed(2));
      });
      setEta((prev) => {
        if (prev <= 1) return 0;
        return prev;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [progress, noiseIndex, isCancelled, isCompleted, status]);

  // Track map SVG definition representing delivery paths
  const routePoints = [
    { x: 40, y: 150 },   // Seller Warehouse
    { x: 120, y: 130 },  // Karwan Bazar
    { x: 220, y: 180 },  // Tongi Hub
    { x: 280, y: 100 },  // Local Distribution Agent
    { x: 360, y: 150 },  // Customer Doorstep
  ];

  // Map progress (0 to 100) to a coordinate on our simulated vector path
  const getCourierSVGPosition = () => {
    const factor = progress / 100;
    const numSegments = routePoints.length - 1;
    const segment = Math.min(Math.floor(factor * numSegments), numSegments - 1);
    const segmentFactor = (factor * numSegments) - segment;

    const pStart = routePoints[segment];
    const pEnd = routePoints[segment + 1];

    if (!pStart || !pEnd) return { x: 40, y: 150 };

    const x = pStart.x + (pEnd.x - pStart.x) * segmentFactor;
    const y = pStart.y + (pEnd.y - pStart.y) * segmentFactor;

    return { x, y };
  };

  const courierSVGPos = getCourierSVGPosition();

  // Courier representative profile list
  const couriers = [
    { name: "শাকিল আহমেদ", phone: "01783-925232", rating: "4.9", vehicle: "TVS Apache" },
    { name: "জাহিদুল ইসলাম", phone: "01944-884321", rating: "4.8", vehicle: "Suzuki Gixxer" },
    { name: "মোঃ ইমরান হোসেন", phone: "01511-925838", rating: "4.9", vehicle: "Hero Splendor" }
  ];

  // Choose courier based on order key
  const courierHash = (order.id ? order.id.charCodeAt(0) + order.id.charCodeAt(order.id.length - 1) : 0) % couriers.length;
  const courier = order.assignedEmployeeName
    ? {
        name: order.assignedEmployeeName,
        phone: order.assignedEmployeePhone || "N/A",
        rating: order.assignedEmployeeRating || "4.9",
        vehicle: order.assignedEmployeeVehicle || "Bike 🏍️",
        photo: order.assignedEmployeePhoto || "",
      }
    : {
        ...couriers[courierHash],
        photo: "",
      };

  return (
    <div id="realtime-order-tracking-dashboard" className="bg-slate-50 dark:bg-slate-900/40 rounded-3xl p-6 border border-gray-200/60 dark:border-white/5 space-y-6">
      {/* Upper Tracker Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
            <Compass className="animate-spin" size={24} style={{ animationDuration: "12s" }} />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
              {trans("রিয়েল-টাইম ট্র্যাকিং ড্যাশবোর্ড", "Real-Time Tracking Dashboard")}
            </h4>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
              {trans("লাইভ জিপিএস লোকেশন সচল আছে", "Live GPS Location Beacon Active")}
            </span>
          </div>
        </div>
        <div className="flex flex-row gap-3">
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-white/5 px-4 py-2.5 rounded-2xl flex items-center gap-2">
            <Clock size={16} className="text-indigo-500" />
            <div>
              <span className="text-[9px] block text-gray-400 uppercase font-bold tracking-wider">{trans("আনুমানিক সময়", "Est. Delivery")}</span>
              <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                {isCompleted ? trans("সম্পন্ন", "Delivered") : isCancelled ? "N/A" : `${eta} ${trans("মিনিট", "mins")}`}
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-white/5 px-4 py-2.5 rounded-2xl flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" />
            <div>
              <span className="text-[9px] block text-gray-400 uppercase font-bold tracking-wider">{trans("অবশিষ্ট দূরত্ব", "Distance Left")}</span>
              <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                {isCompleted ? "0.00 km" : isCancelled ? "N/A" : `${distanceRemaining} km`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern High-End Simulated Visual Map */}
      <div className="relative bg-[#ffffff] dark:bg-[#0b1329] border border-gray-150 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-inner h-64 sm:h-72 flex flex-col justify-between">
        {/* Dynamic Map Lines Overlay */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          {/* Simulated grid line */}
          <div className="w-full h-full bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>

        {/* Vector SVG Roadmap */}
        <div className="absolute inset-0">
          <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
            {/* Delivery route vector road path */}
            <path
              d="M 40 150 Q 80 120, 120 130 T 220 180 T 280 100 T 360 150"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="6"
              strokeLinecap="round"
              className="dark:stroke-slate-800 transition-colors"
            />
            {/* Animated active path line */}
            <path
              d="M 40 150 Q 80 120, 120 130 T 220 180 T 280 100 T 360 150"
              fill="none"
              stroke="url(#gradient-active)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="400"
              strokeDashoffset={400 - (400 * (progress / 100))}
              className="transition-all duration-1000 ease-out"
            />

            {/* Gradient fill */}
            <defs>
              <linearGradient id="gradient-active" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
            </defs>

            {/* Hub markers */}
            {hubs.map((hub, idx) => {
              const pt = routePoints[idx];
              const isActive = progress >= hub.percentage;
              return (
                <g key={idx} className="cursor-pointer">
                  {/* Subtle pulsing background for selected next destination hub */}
                  {isActive && progress < (hubs[idx+1]?.percentage || 101) && (
                    <circle cx={pt.x} cy={pt.y} r="14" fill="#6366f1" className="opacity-25 animate-ping" />
                  )}
                  {/* Primary hub marker */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="6"
                    fill={isActive ? (isCancelled ? "#ef4444" : "#4f46e5") : "#94a3b8"}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className="shadow-md transition-all duration-500"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Live Vector Courier Rider Animated Indicator */}
        {!isCancelled && (
          <motion.div
            style={{
              position: "absolute",
              left: `${(courierSVGPos.x / 400) * 100}%`,
              top: `${(courierSVGPos.y / 300) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
            animate={{ scale: [0.95, 1.05, 0.95] }}
            transition={{ repeat: Infinity, duration: 2.2 }}
            className="z-10 bg-indigo-600 dark:bg-indigo-500 text-white p-2.5 rounded-full shadow-2xl flex items-center justify-center cursor-grabbing group border border-white"
          >
            <Truck size={16} className="animate-bounce" style={{ animationDuration: "1s" }} />
            {/* Tiny live speed badge */}
            {speed > 0 && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-indigo-950 font-black text-[8px] uppercase tracking-wider text-indigo-300 px-2 py-1 rounded-md border border-indigo-500/20 shadow-md">
                ⚡ {speed} km/h
              </span>
            )}
          </motion.div>
        )}

        {/* Labels at different stops overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between gap-1 pointer-events-none text-[8px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-white/40 dark:bg-slate-950/20 p-2 rounded-xl backdrop-blur-xs">
          <div>📍 {trans("হাব", "Hub")} 1</div>
          <div>📍 {trans("ট্রান্সফার", "Transit")}</div>
          <div>📍 {trans("বন্টন", "Agent")}</div>
          <div className="text-right">🏁 {trans("ডেলিভারি", "Doorstep")}</div>
        </div>

        {/* Map Header Status Alert */}
        <div className="absolute top-3 left-3 p-2 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md rounded-xl border border-gray-150 dark:border-white/5 flex items-center gap-2">
          <Navigation className="text-indigo-500 animate-pulse" size={14} />
          <span className="text-[9px] font-black tracking-tight text-gray-750 dark:text-gray-300 uppercase">
            {trans("কুরিয়ার কো-অর্ডিনেটস", "Courier Coordinates")}: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">{courierLocation.lat.toFixed(4)}° N, {courierLocation.lng.toFixed(4)}° E</span>
          </span>
        </div>
      </div>

      {order.liveTrackingComment && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3 shadow-xs">
          <TrendingUp className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={16} />
          <div>
            <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider block">
              {trans("সর্বশেষ কাজের মন্তব্য / লাইভ আপডেট", "Latest Working Update / Live Comment")}:
            </span>
            <p className="text-xs text-slate-800 dark:text-slate-100 font-bold font-sans mt-1">
              "{order.liveTrackingComment}"
            </p>
          </div>
        </div>
      )}

      {/* Progress Timeline Tracker */}
      <div className="space-y-4">
        <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
          {trans("ডেলিভারি মাইলস্টোন", "Delivery Milestones")}
        </h5>
        
        {isCancelled ? (
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3">
            <AlertCircle className="text-rose-500 shrink-0" size={20} />
            <div>
              <p className="font-black text-rose-600 dark:text-rose-400 text-xs">
                {trans("অর্ডারটি বাতিল করা হয়েছে", "Order Cancelled")}
              </p>
              <p className="text-[10px] font-medium text-gray-500 mt-1">
                {trans("গ্রাহকের অনুরোধে অথবা অন্য কোনো কারণে অর্ডারটি স্থগিত করা হয়েছে।", "The order was cancelled as per customer request or processing reasons.")}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { labelBN: "অর্ডার গৃহিত", labelEN: "Order Placed", descBN: "নিশ্চিত হয়েছে", descEN: "Confirmed", stepPercent: 5 },
              { labelBN: "মূল্য নির্ধারণ", labelEN: "Pricing Set", descBN: "গেটওয়ে ওপেন", descEN: "Gateway Open", stepPercent: 15 },
              { labelBN: "পেমেন্ট যাচাই", labelEN: "Payment Checked", descBN: "ভেরিফিকেশন", descEN: "Verification", stepPercent: 35 },
              { labelBN: "প্রক্রিয়াধীন", labelEN: "In Progress", descBN: "শিপমেন্ট প্রস্তুতি", descEN: "In Delivery", stepPercent: 70 },
              { labelBN: "ডেলিভারড", labelEN: "Delivered", descBN: "হাতে পেয়েছেন", descEN: "Received", stepPercent: 100 },
            ].map((step, idx) => {
              const isPast = progress >= step.stepPercent;
              const isCurrent = progress === step.stepPercent;
              
              return (
                <div 
                  key={idx} 
                  className={`p-3 rounded-2xl border transition-all ${
                    isCurrent 
                      ? "bg-indigo-500/10 border-indigo-500/30 shadow-indigo-500/10 shadow-lg" 
                      : isPast 
                        ? "bg-slate-100/50 dark:bg-white/5 border-emerald-500/20" 
                        : "bg-white dark:bg-slate-900 border-gray-150 dark:border-white/5 opacity-55"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black uppercase tracking-tight text-indigo-500">
                      {trans(`ধাপ ${idx+1}`, `Step ${idx+1}`)}
                    </span>
                    {isPast ? (
                      <CheckCircle2 size={13} className="text-emerald-500" />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-800" />
                    )}
                  </div>
                  <h6 className="font-extrabold text-xs text-gray-950 dark:text-gray-100">
                    {language === "BN" ? step.labelBN : step.labelEN}
                  </h6>
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold mt-0.5">
                    {language === "BN" ? step.descBN : step.descEN}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Courier/Rider Information Card Section */}
      {!isCancelled && !isCompleted && progress >= 20 && (
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/15 overflow-hidden text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-black text-sm shrink-0 border border-gray-100 dark:border-white/10">
              {courier.photo ? (
                <img referrerPolicy="no-referrer" src={courier.photo} className="w-full h-full object-cover" alt={courier.name} />
              ) : (
                <User size={20} />
              )}
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 block">
                {trans("নিযুক্ত কুরিয়ার রাইডার", "Assigned Delivery Rider")}
              </span>
              <h5 className="font-black text-sm text-gray-900 dark:text-white mt-0.5">
                {courier.name}
              </h5>
              <span className="text-[10px] font-bold text-gray-400 mt-0.5 block">
                ⭐ {courier.rating} rating • {courier.vehicle} 🏍️
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={`tel:${courier.phone}`}
              className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all px-4 py-2.5 rounded-xl w-full sm:w-auto shadow-md"
            >
              <Phone size={14} /> {trans("ফোন করুন", "Call Rider")}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
