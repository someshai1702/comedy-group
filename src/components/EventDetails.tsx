import React, { useState, useEffect } from "react";
import { Event, Family, RSVP, Menu } from "../types";
import { MapPin, Calendar, Clock, ChevronLeft, AlertCircle, Save, Info, Plus, Minus, Check, ShieldAlert } from "lucide-react";

interface EventDetailsProps {
  event: Event;
  currentFamily: Family;
  families: Family[];
  rsvps: RSVP[];
  menu: Menu;
  onBack: () => void;
  onSubmitRsvp: (rsvpData: any) => Promise<void>;
}

export default function EventDetails({
  event,
  currentFamily,
  families,
  rsvps,
  menu,
  onBack,
  onSubmitRsvp
}: EventDetailsProps) {
  // --- WhatsApp Sharing ---
  const getWhatsAppShareUrl = () => {
    const hostName = families.find(f => f.id === event.hostFamilyId)?.name || "Comedy Group Host";
    const dlString = event.deadline ? new Date(event.deadline).toLocaleString() : "TBD";
    const appLink = window.location.origin;

    const message = `🎭 *New Comedy Group Dinner scheduled!*
🎉 *Occasion:* ${event.name} (${event.type})
👑 *Host:* ${hostName}
📅 *Date:* ${event.date}
⏰ *Time:* ${event.time}
📍 *Restaurant:* ${event.restaurant}
🗺️ *Address:* ${event.address}
${event.googleMapsUrl ? `🔗 *Google Maps:* ${event.googleMapsUrl}\n` : ""}⏳ *Order Deadline:* ${dlString}
💬 *Notes:* ${event.notes || "Join us for great laughs and delicious food!"}

👇 *Submit your RSVP & Food Order here:*
🔗 ${appLink}`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  // Form states
  const [attending, setAttending] = useState<"Yes" | "No" | "Maybe" | "">("");
  const [reason, setReason] = useState<string>("");
  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [order, setOrder] = useState<{ [itemId: string]: number }>({});
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  // Find current family's existing RSVP for this event
  const existingRsvp = rsvps.find((r) => r.eventId === event.id && r.familyId === currentFamily.id);
  const isRsvpYes =
    (attending === "" && existingRsvp?.attending === "Yes") ||
    attending === "Yes";

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Separate states for RSVP and Food Order saves
  const [rsvpSaving, setRsvpSaving] = useState<boolean>(false);
  const [rsvpSuccess, setRsvpSuccess] = useState<boolean>(false);
  const [rsvpError, setRsvpError] = useState<string>("");

  const [orderSaving, setOrderSaving] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string>("");

  // Active Tab for Food sections
  const [activeSection, setActiveSection] = useState<keyof Menu>("starters");

  // Initialize and reset form states when event or family changes
  useEffect(() => {
    const existing = rsvps.find((r) => r.eventId === event.id && r.familyId === currentFamily.id);

    // Always start attending status as empty "" (no default, no last saved status loaded)
    setAttending("");

    // Reset status flags and messages
    setIsDirty(false);
    setRsvpSaving(false);
    setRsvpSuccess(false);
    setRsvpError("");
    setOrderSaving(false);
    setOrderSuccess(false);
    setOrderError("");

    if (existing) {
      setReason(existing.reason || "");
      setAdultsCount(existing.adultsAttendingCount);
      setChildrenCount(existing.childrenAttendingCount);
      setOrder(existing.order || {});
      setSpecialInstructions(existing.specialInstructions || "");
    } else {
      setReason("");
      setAdultsCount(currentFamily.adults.length);
      setChildrenCount(currentFamily.children.length);
      setOrder({});
      setSpecialInstructions("");
    }
  }, [event.id, currentFamily.id]);

  const isDeadlinePassed = event.deadline ? new Date(event.deadline).getTime() < new Date().getTime() : false;
  const isLocked = !event.isActive || isDeadlinePassed;

  // Quantity controllers
  const updateQuantity = (itemId: string, delta: number) => {
    if (isLocked) return;
    setIsDirty(true);
    setOrder((prev) => {
      const currentQty = prev[itemId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      const updated = { ...prev };
      if (newQty === 0) {
        delete updated[itemId];
      } else {
        updated[itemId] = newQty;
      }
      return updated;
    });
  };

  const getQuantity = (itemId: string): number => {
    return order[itemId] || 0;
  };

  const handleSaveRsvp = async () => {
    if (isLocked) {
      setRsvpError("This event is locked. No changes are permitted.");
      return;
    }
    if (!attending) {
      setRsvpError("Please select an Attending status (Yes, No, or Maybe) before saving.");
      return;
    }

    setRsvpSaving(true);
    setRsvpError("");
    setRsvpSuccess(false);

    try {
      await onSubmitRsvp({
        eventId: event.id,
        familyId: currentFamily.id,
        attending,
        reason: attending === "No" ? reason : "",
        adultsAttendingCount: attending === "Yes" ? adultsCount : 0,
        childrenAttendingCount: attending === "Yes" ? childrenCount : 0,
        order: attending === "Yes" ? order : {},
        specialInstructions: attending === "Yes" ? specialInstructions : ""
      });
      setRsvpSuccess(true);
      setIsDirty(false);
    } catch (err: any) {
      setRsvpError(err.message || "Failed to save Attending Status. Please try again.");
    } finally {
      setRsvpSaving(false);
    }
  };

  const handleSaveOrder = async () => {
    if (isLocked) {
      setOrderError("This event is locked. No changes are permitted.");
      return;
    }
    if (attending !== "Yes") {
      setOrderError("You must select Attending 'Yes' to place a food order.");
      return;
    }

    setOrderSaving(true);
    setOrderError("");
    setOrderSuccess(false);

    try {
      await onSubmitRsvp({
        eventId: event.id,
        familyId: currentFamily.id,
        attending,
        reason: "",
        adultsAttendingCount: adultsCount,
        childrenAttendingCount: childrenCount,
        order,
        specialInstructions
      });
      setOrderSuccess(true);
      setIsDirty(false);
    } catch (err: any) {
      setOrderError(err.message || "Failed to save Food Order. Please try again.");
    } finally {
      setOrderSaving(false);
    }
  };

  const hostFamilyName = families.find((f) => f.id === event.hostFamilyId)?.name || "Comedy Group Host";

  // Pre-configured instruction chips
  const instructionPresets = ["Less spicy", "No onion", "No garlic", "Jain food", "Extra butter", "Baby food"];

  const togglePresetInstruction = (preset: string) => {
    if (isLocked) return;
    setIsDirty(true);
    setSpecialInstructions((prev) => {
      if (prev.includes(preset)) {
        return prev.replace(new RegExp(`\\s*${preset},?\\s*`, "i"), "").trim();
      } else {
        return prev ? `${prev}, ${preset}` : preset;
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 space-y-6">
      {/* Navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gray-500 hover:text-orange-600 transition-colors text-sm font-bold"
      >
        <ChevronLeft size={16} />
        Back to Dashboard
      </button>

      {/* Locked Event Warning */}
      {isLocked && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm flex gap-3 items-start shadow-sm">
          <ShieldAlert size={20} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold">🔒 Attending Status and Food Ordering Locked</h5>
            <p className="text-rose-600 text-xs font-medium">
              {!event.isActive 
                ? "The captain has closed ordering for this dinner. You can view the order, but edits are disabled."
                : "The last time to submit food orders has passed. No further additions can be placed."}
            </p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm flex gap-3 items-center shadow-sm">
          <Check size={20} className="shrink-0" />
          <span className="font-semibold">Your Attending Status & Food Order has been submitted successfully to the Host!</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm flex gap-3 items-center shadow-sm">
          <AlertCircle size={20} className="shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Event Card Meta (4 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm relative overflow-hidden space-y-5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Header info */}
            <div className="space-y-2">
              <div className="flex justify-between items-center gap-2">
                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-orange-50 text-orange-600 border border-orange-100">
                  {event.type}
                </span>
                <a
                  href={getWhatsAppShareUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                  title="Share on WhatsApp"
                >
                  Share to WhatsApp
                </a>
              </div>
              <h3 className="text-xl font-black text-gray-900">{event.name || "Comedy Group Dinner"}</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                Hosted by <span className="text-orange-600">{hostFamilyName}</span>
              </p>
            </div>

            {/* Date / Time Details */}
            <div className="space-y-3 text-sm text-gray-600 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2.5">
                <Calendar size={16} className="text-orange-500" />
                <span className="font-semibold">{new Date(event.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock size={16} className="text-orange-500" />
                <span className="font-semibold">{event.time}</span>
              </div>
              {event.restaurant && (
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-orange-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-gray-800">{event.restaurant}</p>
                    <p className="text-xs text-gray-500 leading-relaxed font-semibold">{event.address}</p>
                    {event.googleMapsUrl && (
                      <a
                        href={event.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-xs text-orange-500 hover:underline hover:text-orange-600 font-bold"
                      >
                        📍 View on Google Maps
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Host Notes */}
            {event.notes && (
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-1.5 text-gray-500">
                <p className="font-bold text-gray-700 flex items-center gap-1">
                  <Info size={13} />
                  Host Notes:
                </p>
                <p className="leading-relaxed font-medium">{event.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: RSVP & Food Wizard (7 cols) */}
        <form onSubmit={(e) => e.preventDefault()} className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Attendance State */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="text-base font-black text-gray-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold">1</span>
              Attending Status
            </h4>

            <div className="grid grid-cols-3 gap-3">
              {(["Yes", "No", "Maybe"] as const).map((opt) => {
                const isActive = attending === opt;
                let activeStyle = "border-gray-100 bg-white text-gray-500 hover:bg-gray-50";
                if (isActive) {
                  if (opt === "Yes") activeStyle = "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm";
                  if (opt === "No") activeStyle = "bg-rose-50 border-rose-300 text-rose-700 shadow-sm";
                  if (opt === "Maybe") activeStyle = "bg-blue-50 border-blue-300 text-blue-700 shadow-sm";
                }

                return (
                  <button
                    key={opt}
                    id={`rsvp-btn-${opt.toLowerCase()}`}
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      if (isLocked) return;
                      setAttending(opt);
                      setIsDirty(true);
                    }}
                    className={`py-3.5 px-3 rounded-2xl border text-center font-bold text-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${activeStyle} ${
                      isLocked ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    <span>{opt === "Yes" ? "😋 Yes" : opt === "No" ? "😢 No" : "🤷 Maybe"}</span>
                  </button>
                );
              })}
            </div>

            {/* If Attendance is No */}
            {attending === "No" && (
              <div className="space-y-2 pt-2 animate-slideDown">
                <label className="text-xs text-gray-400 font-bold block uppercase tracking-wide">Please select a reason:</label>
                <div className="flex flex-wrap gap-2">
                  {["Out of station", "Busy", "Sick", "Other"].map((r) => {
                    const isSelected = reason === r || (r === "Other" && reason !== "Out of station" && reason !== "Busy" && reason !== "Sick" && reason !== "");
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                          setReason(r === "Other" ? "Other reason" : r);
                          setIsDirty(true);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? "bg-rose-100 border-rose-300 text-rose-700"
                            : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
                {reason.startsWith("Other") && (
                  <input
                    type="text"
                    disabled={isLocked}
                    placeholder="Describe reason..."
                    value={reason === "Other reason" ? "" : reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs focus:border-orange-500 focus:outline-none font-medium"
                  />
                )}
              </div>
            )}

            {/* If Attendance is Yes */}
            {attending === "Yes" && (
              <div className="space-y-4 pt-3 border-t border-gray-100 animate-slideDown">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs text-gray-400 font-bold block uppercase tracking-wider">Adults Attending</label>
                    <span className="text-[10px] text-gray-400 font-semibold">Enter number of adults</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isLocked || adultsCount <= 0}
                      onClick={() => {
                        setAdultsCount(prev => Math.max(0, prev - 1));
                        setIsDirty(true);
                        setRsvpSuccess(false);
                        setRsvpError("");
                      }}
                      className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 font-extrabold hover:bg-gray-100 disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      disabled={isLocked}
                      value={adultsCount}
                      onChange={(e) => {
                        const val = Math.min(15, Math.max(0, parseInt(e.target.value) || 0));
                        setAdultsCount(val);
                        setIsDirty(true);
                        setRsvpSuccess(false);
                        setRsvpError("");
                      }}
                      className="w-16 h-10 rounded-xl bg-white border border-gray-200 text-gray-800 text-sm font-extrabold text-center focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      disabled={isLocked || adultsCount >= 15}
                      onClick={() => {
                        setAdultsCount(prev => Math.min(15, prev + 1));
                        setIsDirty(true);
                        setRsvpSuccess(false);
                        setRsvpError("");
                      }}
                      className="w-10 h-10 rounded-xl bg-orange-500 text-white font-extrabold hover:bg-orange-600 disabled:opacity-50 transition-all flex items-center justify-center shadow-sm cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs text-gray-400 font-bold block uppercase tracking-wider">Children Attending</label>
                    <span className="text-[10px] text-gray-400 font-semibold">Enter number of children</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isLocked || childrenCount <= 0}
                      onClick={() => {
                        setChildrenCount(prev => Math.max(0, prev - 1));
                        setIsDirty(true);
                        setRsvpSuccess(false);
                        setRsvpError("");
                      }}
                      className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 font-extrabold hover:bg-gray-100 disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      disabled={isLocked}
                      value={childrenCount}
                      onChange={(e) => {
                        const val = Math.min(15, Math.max(0, parseInt(e.target.value) || 0));
                        setChildrenCount(val);
                        setIsDirty(true);
                        setRsvpSuccess(false);
                        setRsvpError("");
                      }}
                      className="w-16 h-10 rounded-xl bg-white border border-gray-200 text-gray-800 text-sm font-extrabold text-center focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      disabled={isLocked || childrenCount >= 15}
                      onClick={() => {
                        setChildrenCount(prev => Math.min(15, prev + 1));
                        setIsDirty(true);
                        setRsvpSuccess(false);
                        setRsvpError("");
                      }}
                      className="w-10 h-10 rounded-xl bg-orange-500 text-white font-extrabold hover:bg-orange-600 disabled:opacity-50 transition-all flex items-center justify-center shadow-sm cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}


          </div>

          {/* Section 2: Food Menu Picker (Only if Yes saved) */}
          {isRsvpYes && (
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4 animate-slideDown">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-black text-gray-800 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold">2</span>
                  Food Orders
                </h4>
              </div>

              {/* Menu Categories Pills (Tabs) */}
              <div className="flex overflow-x-auto gap-1.5 pb-2 border-b border-gray-100 scrollbar-thin">
                {(Object.keys(menu) as Array<keyof Menu>).map((key) => {
                  const isActive = activeSection === key;
                  const label = key === "starters" ? "Starters" 
                              : key === "mainCourse" ? "Mains" 
                              : key === "roti" ? "Roti" 
                              : key === "rice" ? "Rice" 
                              : key === "dessert" ? "Dessert" 
                              : "Drinks";
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveSection(key)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider ${
                        isActive
                          ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                          : "bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Menu Items List inside Active category */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {menu[activeSection]?.map((item) => {
                  const qty = getQuantity(item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white border border-gray-50 hover:border-gray-100 hover:bg-gray-50/50 transition-all gap-4 shadow-sm"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                      </div>

                      {/* Quantity Controller buttons */}
                      <div className="flex items-center gap-3 font-semibold">
                        {qty > 0 && (
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1.5 rounded-xl bg-gray-50 border border-gray-150 hover:bg-gray-100 text-gray-600 disabled:opacity-50 transition-all"
                          >
                            <Minus size={14} />
                          </button>
                        )}
                        {qty > 0 ? (
                          <span className="font-bold text-gray-800 font-mono w-4 text-center">{qty}</span>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic pr-1 font-bold">Not selected</span>
                        )}
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 transition-all shadow-sm"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Special instructions */}
          {isRsvpYes && (
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-3.5 animate-slideDown">
              <h4 className="text-base font-black text-gray-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold">3</span>
                Special Instructions
              </h4>

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {instructionPresets.map((preset) => {
                  const hasPreset = specialInstructions.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      disabled={isLocked}
                      onClick={() => togglePresetInstruction(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        hasPreset
                          ? "bg-orange-50 border-orange-200 text-orange-600 font-bold"
                          : "bg-white border-gray-100 text-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      {hasPreset ? `✓ ${preset}` : preset}
                    </button>
                  );
                })}
              </div>

              {/* Text Comment box */}
              <textarea
                disabled={isLocked}
                rows={3}
                placeholder="Enter any additional instructions, baby food requirements, food preferences (e.g., Less spicy, no garlic)..."
                value={specialInstructions}
                onChange={(e) => {
                  setSpecialInstructions(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none placeholder:text-gray-400 disabled:opacity-60 font-medium"
              />
            </div>
          )}

          {/* Save Action Buttons & Split Save Flow */}
          {isRsvpYes && (
            <div className="space-y-4">
              {orderError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold animate-slideDown">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}
              {orderSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs font-semibold animate-slideDown">
                  <Check size={14} className="flex-shrink-0" />
                  <span>Food Order saved successfully!</span>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  id="order-cancel-btn"
                  onClick={onBack}
                  className="flex-1 py-4 font-bold text-gray-500 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-2xl transition-all text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="order-save-btn"
                  disabled={orderSaving || isLocked}
                  onClick={handleSaveOrder}
                  className={`flex-1 py-4 font-extrabold text-white rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-100 ${
                    isLocked
                      ? "bg-gray-200 text-gray-400 border border-gray-100 cursor-not-allowed"
                      : "bg-orange-500 hover:bg-orange-600 active:scale-[0.98] cursor-pointer"
                  }`}
                >
                  {orderSaving ? (
                    <span>Saving...</span>
                  ) : orderSuccess ? (
                    <>
                      <Check size={18} />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Save Attending Status & Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Bottom RSVP Save buttons for No or Maybe */}
          {!isRsvpYes && (attending === "No" || attending === "Maybe") && (
            <div className="space-y-4">
              {rsvpError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold animate-slideDown">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{rsvpError}</span>
                </div>
              )}
              {rsvpSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs font-semibold animate-slideDown">
                  <Check size={14} className="flex-shrink-0" />
                  <span>Attending Status saved successfully!</span>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  id="rsvp-cancel-btn"
                  onClick={onBack}
                  className="flex-1 py-4 font-bold text-gray-500 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-2xl transition-all text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="rsvp-bottom-save-btn"
                  disabled={rsvpSaving || isLocked}
                  onClick={handleSaveRsvp}
                  className={`flex-1 py-4 font-extrabold text-white rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-100 ${
                    isLocked
                      ? "bg-gray-200 text-gray-400 border border-gray-100 cursor-not-allowed"
                      : "bg-orange-500 hover:bg-orange-600 active:scale-[0.98] cursor-pointer"
                  }`}
                >
                  {rsvpSaving ? (
                    <span>Saving Attending Status...</span>
                  ) : rsvpSuccess ? (
                    <>
                      <Check size={18} />
                      <span>Attending Status Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Save Attending Status</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Bottom Back button if no selection is made */}
          {!isRsvpYes && attending === "" && (
            <div className="flex gap-4">
              <button
                type="button"
                id="simple-back-btn"
                onClick={onBack}
                className="w-full py-4 font-bold text-gray-500 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-2xl transition-all text-center cursor-pointer"
              >
                Go Back
              </button>
            </div>
          )}
        </form>

      </div>
    </div>
  );
}
