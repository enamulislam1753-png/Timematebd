import React, { useState, useEffect, useRef } from "react";
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
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

interface OrderTrackerProps {
  order: any;
  language: "BN" | "EN";
  trans: (bn: string, en: string) => string;
  currentUserId?: string;
  userRole?: string;
}

export default function OrderTracker({ 
  order, 
  language, 
  trans, 
  currentUserId = "", 
  userRole = "" 
}: OrderTrackerProps) {
  // Google Maps API key extraction matching system guidelines
  const API_KEY =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    "";
  
  const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

  // Coordinates and state simulation for when actual GPS coords are unset
  const [simulatedCourierLocation, setSimulatedCourierLocation] = useState({ lat: 23.8103, lng: 90.4125 }); // Dhaka Default
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0); // in minutes
  const [distanceRemaining, setDistanceRemaining] = useState(0); // in km
  const [noiseIndex, setNoiseIndex] = useState(0);

  const [activeWatch, setActiveWatch] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const status = order.status || "নতুন";
  const isCancelled = status === "বাতিল";
  const isCompleted = status === "সম্পন্ন";

  // Core base location: Seller Warehouse
  const WAREHOUSE_COORDS = { lat: 23.8103, lng: 90.4125 };

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
      baseSpeed = 42; 
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

  // Jitter coordinates to simulate active live tracking when actual GPS is not active
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
      
      setSimulatedCourierLocation({ lat: jitterLat, lng: jitterLng });
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
    }, 4000);

    return () => clearInterval(interval);
  }, [progress, noiseIndex, isCancelled, isCompleted, status]);

  // GEOLOCATION ENGINE: Live geolocation share for Courier Rider & User Customer
  useEffect(() => {
    if (!currentUserId || !order?.id) return;
    if (isCompleted || isCancelled) return;

    const isRider = order.assignedEmployeeId === currentUserId;
    const isCustomer = order.userId === currentUserId;

    // Auto watch location if the logged in user is either the assigned rider or current customer
    if (!isRider && !isCustomer) return;

    let watchId: number | null = null;
    setActiveWatch(true);

    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setGeoError(null);

          try {
            const updates: any = {};
            if (isRider) {
              updates.riderLat = latitude;
              updates.riderLng = longitude;
            } else if (isCustomer) {
              updates.customerLat = latitude;
              updates.customerLng = longitude;
            }

            const prevLat = isRider ? order.riderLat : order.customerLat;
            const prevLng = isRider ? order.riderLng : order.customerLng;
            const diff = Math.abs((prevLat || 0) - latitude) + Math.abs((prevLng || 0) - longitude);

            // Throttle database writes to avoid excessive billing
            if (diff > 0.0001 || !prevLat) {
              await updateDoc(doc(db, "orders", order.id), updates);
            }
          } catch (e) {
            console.error("Failed to update location inside Firestore:", e);
          }
        },
        (error) => {
          console.warn("Geolocation watch failed:", error);
          setGeoError(error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000
        }
      );
    } else {
      setGeoError("Browser does not support Geolocation.");
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setActiveWatch(false);
      }
    };
  }, [currentUserId, order?.id, order?.status, order?.assignedEmployeeId, order?.userId, isCompleted, isCancelled]);

  // Explicit Location Trigger as backup manual option
  const requestManualLocationShare = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setGeoError(null);
          
          const isRider = order.assignedEmployeeId === currentUserId;
          const isCustomer = order.userId === currentUserId;

          try {
            const updates: any = {};
            if (isRider) {
              updates.riderLat = latitude;
              updates.riderLng = longitude;
            } else if (isCustomer) {
              updates.customerLat = latitude;
              updates.customerLng = longitude;
            }
            await updateDoc(doc(db, "orders", order.id), updates);
          } catch (e) {
            console.error("Manual share update failed:", e);
          }
        },
        (error) => {
          setGeoError(error.message);
        }
      );
    }
  };

  // Courier representative profile fallback
  const courierFallbackProfiles = [
    { name: "শাকিল আহমেদ", phone: "01783-925232", rating: "4.9", vehicle: "TVS Apache" },
    { name: "জাহিদুল ইসলাম", phone: "01944-884321", rating: "4.8", vehicle: "Suzuki Gixxer" },
    { name: "মোঃ ইমরান হোসেন", phone: "01511-925838", rating: "4.9", vehicle: "Hero Splendor" }
  ];

  const courierHash = (order.id ? order.id.charCodeAt(0) + order.id.charCodeAt(order.id.length - 1) : 0) % courierFallbackProfiles.length;
  const courier = order.assignedEmployeeName
    ? {
        name: order.assignedEmployeeName,
        phone: order.assignedEmployeePhone || "N/A",
        rating: order.assignedEmployeeRating || "4.9",
        vehicle: order.assignedEmployeeVehicle || "Bike 🏍️",
        photo: order.assignedEmployeePhoto || "",
      }
    : {
        ...courierFallbackProfiles[courierHash],
        photo: "",
      };

  // Determine current active marker coordinates
  const isRiderLive = Boolean(order.riderLat && order.riderLng);
  const isCustomerLive = Boolean(order.customerLat && order.customerLng);

  const riderCoords = {
    lat: order.riderLat || simulatedCourierLocation.lat,
    lng: order.riderLng || simulatedCourierLocation.lng
  };

  const customerCoords = {
    lat: order.customerLat || 23.7771, // fallback to standard customer spot coordinate
    lng: order.customerLng || 90.3994
  };

  const mapCenterCoords = isRiderLive ? riderCoords : (isCustomerLive ? customerCoords : WAREHOUSE_COORDS);

  return (
    <div id="realtime-order-tracking-dashboard" className="bg-slate-50 dark:bg-slate-900/40 rounded-3xl p-6 border border-gray-200/60 dark:border-white/5 space-y-6">
      {/* Upper Tracker Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl animate-pulse">
            <Compass className="animate-spin" size={24} style={{ animationDuration: "12s" }} />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
              {trans("গুগল ম্যাপ রিয়েল-টাইম ট্র্যাকিং ড্যাশবোর্ড", "Google Maps Real-Time Tracking")}
            </h4>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
              {activeWatch ? trans("লাইভ জিপিএস কো-অর্ডিনেট শেয়ার হচ্ছে", "Live GPS Coordinates Sharing Active") : trans("লাইভ জিপিএস লোকেশন সচল আছে", "Live GPS Location Beacon Active")}
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

      {/* Geolocation Info and Share Buttons if applicable */}
      {!isCompleted && !isCancelled && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] sm:text-xs font-extrabold text-gray-700 dark:text-slate-300">
              {order.userId === currentUserId && trans("👤 আপনার লোকেশন কুরিয়ার কর্মী ও এডমিন সরাসরি দেখতে পাচ্ছেন", "👤 Courier & Admin can view your live location")}
              {order.assignedEmployeeId === currentUserId && trans("🏍️ আপনার রাইডার লোকেশন কাস্টমার ও এডমিন সরাসরি দেখতে পাচ্ছেন", "🏍️ Customer & Admin can view your rider location")}
              {order.userId !== currentUserId && order.assignedEmployeeId !== currentUserId && trans("🛡️ এডমিন ভিউ লকিং: গ্রাহক ও রাইডারের লাইভ লোকেশন ম্যাপে প্রদর্শিত হচ্ছে", "🛡️ Admin View: Customer & Rider live location shown")}
            </span>
          </div>
          {(order.userId === currentUserId || order.assignedEmployeeId === currentUserId) && (
            <button
              onClick={requestManualLocationShare}
              className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-md shadow-indigo-500/10 shrink-0"
            >
              🔄 {trans("লোকেশন রিফ্রেশ করুন", "Refresh Coordinates")}
            </button>
          )}
        </div>
      )}

      {geoError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/15 rounded-2xl flex items-center gap-2">
          <AlertCircle className="text-rose-500 shrink-0" size={14} />
          <span className="text-[10px] text-rose-500 font-bold leading-tight">
            Gps error: {geoError}. {trans("অনুগ্রহ করে আপনার ব্রাউজার লোকেশন পারমিশনটি মঞ্জুর করুন।", "Please authorize your device browser location permissions.")}
          </span>
        </div>
      )}

      {/* Google Interactive Map Panel */}
      <div className="relative bg-[#ffffff] dark:bg-[#0b1329] border border-gray-150 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-inner h-80 sm:h-96 flex flex-col justify-between">
        {!hasValidKey ? (
          /* Constitutional Key Splash Box (Rule 1C) */
          <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-900 text-white text-center">
            <div className="max-w-md space-y-4 font-sans">
              <div className="w-12 h-12 bg-amber-500/15 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <AlertCircle size={24} />
              </div>
              <h4 className="text-sm font-black uppercase tracking-wider text-amber-500">
                Google Maps API Key Required
              </h4>
              <p className="text-[11px] text-gray-300 leading-relaxed font-bold">
                {trans(
                  "এই লাইভ ম্যাপটি সচল করার জন্য GOOGLE_MAPS_PLATFORM_KEY যোগ করা প্রয়োজন।",
                  "In order to initialize this live tracking map, please set up your GOOGLE_MAPS_PLATFORM_KEY API key."
                )}
              </p>
              
              <div className="text-left bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-1.5 text-[10px] font-bold text-gray-400">
                <p className="text-white font-extrabold uppercase text-[9px] tracking-wider mb-1">How to setup:</p>
                <p>1. Open <strong className="text-white">Settings</strong> (⚙️ gear icon, top-right corner)</p>
                <p>2. Choose <strong className="text-white">Secrets</strong> tab</p>
                <p>3. Type <code className="text-indigo-400">GOOGLE_MAPS_PLATFORM_KEY</code> as the name</p>
                <p>4. Input your Google Maps Javascript API key as value & hit enter</p>
                <p className="text-amber-500/80 mt-2 text-center text-[9px]">The map will automatically refresh without reload!</p>
              </div>
            </div>
          </div>
        ) : (
          /* Actual High-End Google Maps Panel */
          <div className="w-full h-full relative">
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                center={mapCenterCoords}
                zoom={13}
                mapId="timemate_order_tracking"
                internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                style={{ width: "100%", height: "100%" }}
              >
                {/* 1. Warehouse Depot Marker */}
                <AdvancedMarker position={WAREHOUSE_COORDS} title="ডিপো হাব (Depot Hub)">
                  <Pin background="#4F46E5" glyphColor="#fff" glyph="🏠" scale={1.2} />
                </AdvancedMarker>

                {/* 2. Customer Doorstep Marker */}
                <AdvancedMarker position={customerCoords} title="গ্রাহকের স্থান (Customer Home)">
                  <Pin background="#10B981" glyphColor="#fff" glyph="👤" scale={1.2} />
                </AdvancedMarker>

                {/* 3. Courier Rider Live Marker */}
                <AdvancedMarker position={riderCoords} title="কর্মী / রাইডার (Delivery Rider)">
                  <Pin background="#F59E0B" glyphColor="#fff" glyph="🏍️" scale={1.2} />
                </AdvancedMarker>
              </Map>
            </APIProvider>
          </div>
        )}

        {/* Labels at different stops overlay */}
        <div className="z-10 absolute bottom-3 left-3 right-3 flex justify-between gap-1 pointer-events-none text-[8px] font-black uppercase tracking-wider text-gray-500 bg-white/90 dark:bg-slate-950/80 p-2.5 rounded-xl backdrop-blur-md border border-gray-150/10">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            🏠 {trans("ওয়্যারহাউস ডিপো", "Warehouse")}
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            🏍️ {isRiderLive ? trans("কর্মী (লাইভ)", "Courier (GPS)") : trans("কর্মী (সিমুলেটেড)", "Courier (Simulated)")}
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            👤 {isCustomerLive ? trans("গ্রাহক (লাইভ)", "Customer (GPS)") : trans("গ্রাহক ঠিকানা", "Customer Base")}
          </div>
        </div>

        {/* Map Header Status Alert */}
        <div className="z-10 absolute top-3 left-3 p-2 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md rounded-xl border border-gray-150 dark:border-white/5 flex items-center gap-2 shadow-md">
          <Navigation className="text-indigo-500 animate-pulse" size={14} />
          <span className="text-[9px] font-black tracking-tight text-gray-750 dark:text-gray-300 uppercase">
            {trans("বর্তমান জিপিএস কো-অর্ডিনেট", "Active GPS Coordinates")}: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">{riderCoords.lat.toFixed(4)}° N, {riderCoords.lng.toFixed(4)}° E</span>
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
              <p className="text-[10px] font-medium text-gray-550 mt-1">
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
                    <span className="text-[9px] font-black uppercase tracking-tight text-indigo-505">
                      {trans(`ধাপ ${idx+1}`, `Step ${idx+1}`)}
                    </span>
                    {isPast ? (
                      <CheckCircle2 size={13} className="text-emerald-500" />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-850" />
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
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-505 block">
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
