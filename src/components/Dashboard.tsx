import React, { useState } from "react";
import { Family, Event, RSVP, GroupNotification } from "../types";
import { Calendar, MapPin, Clock, ArrowRight, Bell, AlertCircle, Plus, CheckCircle2, Lock, Unlock, HelpCircle, Film } from "lucide-react";

interface DashboardProps {
  currentFamily: Family;
  events: Event[];
  rsvps: RSVP[];
  notifications: GroupNotification[];
  families: Family[];
  onSelectEvent: (event: Event) => void;
  onNavigateToAdmin: () => void;
}

export default function Dashboard({
  currentFamily,
  events,
  rsvps,
  notifications,
  families,
  onSelectEvent,
  onNavigateToAdmin
}: DashboardProps) {
  // Sort events (latest first)
  const activeEvents = events.filter((e) => e.isActive);
  const previousEvents = events.filter((e) => !e.isActive);

  // --- WhatsApp Sharing Helper ---
  const getWhatsAppShareUrl = (evt: Event) => {
    const hostName = families.find(f => f.id === evt.hostFamilyId)?.name || "Comedy Group Host";
    const dlString = evt.deadline ? new Date(evt.deadline).toLocaleString() : "TBD";
    const appLink = window.location.origin;
    

    // For Movie events, include ticket count
    if (evt.type === "Movie") {
      const eventRsvps = rsvps.filter(r => r.eventId === evt.id && r.attending === "Yes");
      const totalTickets = eventRsvps.reduce((sum, r) => sum + r.adultsAttendingCount + r.childrenAttendingCount, 0);
      const confirmedFamilies = eventRsvps.length;
      const totalFamilies = families.filter(f => f.id !== "admin").length;

      let message = `🎬 *Movie Night - ${evt.movieName || evt.name}*

📅 *Date:* ${evt.date}
⏰ *Showtime:* ${evt.movieShowtime || evt.time}
📍 *Venue:* ${evt.movieVenue || evt.restaurant}
${evt.address ? `🏠 *Address:* ${evt.address}\n` : ""}
👑 *Hosted by:* ${hostName}
${evt.notes ? `💬 *Notes:* ${evt.notes}\n` : ""}

📊 *Ticket Update:*
• ${confirmedFamilies}/${totalFamilies} families confirmed
• Total Tickets Required: ${totalTickets} tickets

${evt.deadline ? `⏳ *Vote Deadline:* ${dlString}\n` : ""}
👇 *Submit your ticket booking here:*
🔗 ${appLink}
`;

      return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }

    // For regular dinner events
    const eventRsvps = rsvps.filter(r => r.eventId === evt.id);
    const confirmedCount = eventRsvps.filter(r => r.attending === "Yes").length;
    const declinedCount = eventRsvps.filter(r => r.attending === "No").length;
    const pendingCount = families.filter(f => f.id !== "admin" && !eventRsvps.find(r => r.familyId === f.id)).length;

    const message = `🎭 *New Comedy Group Dinner scheduled!*
🎉 *Occasion:* ${evt.name} (${evt.type})
👑 *Host:* ${hostName}
📅 *Date:* ${evt.date}
⏰ *Time:* ${evt.time}
📍 *Restaurant:* ${evt.restaurant}
🗺️ *Address:* ${evt.address}
${evt.googleMapsUrl ? `🔗 *Google Maps:* ${evt.googleMapsUrl}\n` : ""}⏳ *Order Deadline:* ${dlString}
${evt.notes ? `💬 *Notes:* ${evt.notes}\n` : ""}

📊 *RSVP Status:*
• ✅ Confirmed: ${confirmedCount} families
• ❌ Declined: ${declinedCount} families
• ⏳ Pending: ${pendingCount} families

👇 *Submit your RSVP & Food Order here:*
🔗 ${appLink}
`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  // --- Change PIN State ---
  const [showPinForm, setShowPinForm] = useState<boolean>(false);
  const [oldPin, setOldPin] = useState<string>("");
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [pinLoading, setPinLoading] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>("");
  const [pinSuccess, setPinSuccess] = useState<string>("");

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPin || !newPin || !confirmPin) {
      setPinError("Please fill out all fields.");
      return;
    }
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setPinError("PIN must be a 4-digit number.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("New PIN and Confirm PIN do not match.");
      return;
    }

    setPinLoading(true);
    setPinError("");
    setPinSuccess("");

    try {
      const res = await fetch(`/api/families/${currentFamily.id}/change-pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPin, newPin })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update PIN");
      }
      setPinSuccess("PIN updated successfully!");
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
      setTimeout(() => setShowPinForm(false), 2000);
    } catch (err: any) {
      setPinError(err.message || "Failed to update PIN code.");
    } finally {
      setPinLoading(false);
    }
  };

  // Helper to check RSVP for a given event and family
  const getFamilyRsvp = (eventId: string, familyId: string): RSVP | undefined => {
    return rsvps.find((r) => r.eventId === eventId && r.familyId === familyId);
  };

  // Helper to format RSVP display
  const renderRsvpBadge = (rsvp: RSVP | undefined) => {
    if (!rsvp) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 shadow-sm">
          <AlertCircle size={12} />
          Pending Attending Status
        </span>
      );
    }

    if (rsvp.attending === "Yes") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
          <CheckCircle2 size={12} />
          Attending ({rsvp.adultsAttendingCount} Ad, {rsvp.childrenAttendingCount} Ch)
        </span>
      );
    }

    if (rsvp.attending === "No") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 shadow-sm">
          <Lock size={12} />
          Not Attending
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
        <HelpCircle size={12} />
        Maybe
      </span>
    );
  };

  // Helper to calculate time left for deadline
  const getTimeLeft = (deadlineStr: string) => {
    if (!deadlineStr) {
      return "No deadline";
    }
    const now = new Date().getTime();
    const deadline = new Date(deadlineStr).getTime();
    if (isNaN(deadline)) {
      return "No deadline";
    }
    const diff = deadline - now;

    if (diff <= 0) {
      return "Deadline passed";
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) {
      return `${days}d ${hours % 24}h remaining`;
    }
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  };

  // List families that haven't responded to active events
  const getPendingFamilies = (event: Event) => {
    const eventRsvps = rsvps.filter((r) => r.eventId === event.id);
    const respondedIds = eventRsvps.map((r) => r.familyId);
    // Exclude admin from normal family listings
    const pending = families.filter((f) => f.id !== "admin" && !respondedIds.includes(f.id));
    return pending;
  };

  const isHostOrAdmin = (event: Event) => {
    return currentFamily.id === "admin" || currentFamily.id === event.hostFamilyId;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-6 md:p-8 shadow-lg text-white">
        <div className="relative z-10 space-y-2">
          <div className="flex justify-between items-start">
            <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-[10px] font-bold tracking-wider uppercase backdrop-blur-md border border-white/10">
              🎭 Private Club: Comedy Group
            </span>
            <button
              onClick={onNavigateToAdmin}
              className="px-3.5 py-1.5 text-xs font-bold bg-white text-orange-600 rounded-full hover:bg-orange-50 transition-all flex items-center gap-1 active:scale-95 shadow-md border border-white/10"
            >
              <Plus size={14} />
              {currentFamily.id === "admin" ? "Admin Dashboard" : "Plan Birthday / Anniversary"}
            </button>
          </div>
          <h2 className="text-3xl font-black tracking-tight md:text-4xl mt-2">
            Namaste, {currentFamily.name}!
          </h2>
          <p className="text-white/95 text-sm max-w-xl font-medium">
            Coordinate dinners, track live order summaries, and generate restaurant-ready copies without WhatsApp clutter.
          </p>
        </div>
        <div className="absolute top-[-30%] right-[-10%] w-[350px] h-[350px] rounded-full bg-white/10 blur-[100px] pointer-events-none" />
      </div>

      {/* Grid of Events & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Events */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active / Upcoming Events */}
          <section className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Calendar className="text-orange-500" size={18} />
                Active Dinners & Events
              </h3>
              {currentFamily.id !== "admin" && (
                <button
                  onClick={onNavigateToAdmin}
                  className="text-xs text-orange-600 hover:text-orange-700 transition-colors font-bold flex items-center gap-1"
                >
                  Create Event
                  <ArrowRight size={12} />
                </button>
              )}
            </div>

            {activeEvents.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-500 space-y-3 shadow-sm">
                <p className="text-sm font-medium">No active planning events found right now.</p>
                <button
                  onClick={onNavigateToAdmin}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-bold text-xs text-white rounded-xl shadow-lg shadow-orange-100 transition-all"
                >
                  Schedule New Event
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeEvents.map((evt) => {
                  const rsvp = getFamilyRsvp(evt.id, currentFamily.id);
                  const isHost = isHostOrAdmin(evt);
                  const pendingFamCount = getPendingFamilies(evt).length;
                  const passed = evt.deadline ? getTimeLeft(evt.deadline).includes("passed") : false;

                  return (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEvent(evt)}
                      className={`group cursor-pointer bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden active:scale-[0.99] ${
                        evt.type === "Movie" 
                          ? "border-purple-100 hover:border-purple-300" 
                          : "border-gray-100 hover:border-orange-300"
                      }`}
                    >
                      {/* Interactive hover glowing accent */}
                      <div className={`absolute top-0 left-0 w-1.5 h-full group-hover:scale-y-110 transition-transform ${
                        evt.type === "Movie" ? "bg-purple-500" : "bg-orange-500"
                      }`} />

                      <div className="space-y-4">
                        {/* Event Category / Time remaining */}
                        <div className="flex justify-between items-start gap-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                            evt.type === "Movie" 
                              ? "bg-purple-50 text-purple-600 border border-purple-100" 
                              : "bg-orange-50 text-orange-600 border border-orange-100"
                          }`}>
                            {evt.type === "Movie" ? "🎬 Movie Night" : evt.type}
                          </span>
                          {evt.deadline ? (
                            <span className={`text-xs font-bold ${
                              passed ? "text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100" : "text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100"
                            } flex items-center gap-1`}>
                              <Clock size={12} />
                              {getTimeLeft(evt.deadline)}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                              <Clock size={12} />
                              No deadline
                            </span>
                          )}
                        </div>

                        {/* Title & Restaurant info */}
                        <div className="space-y-1">
                          <h4 className="text-lg font-extrabold text-gray-900 group-hover:text-orange-600 transition-colors leading-snug">
                            {evt.movieName || evt.name || (evt.type === "Movie" ? "Movie Night" : "Comedy Group Dinner")}
                          </h4>
                          <div className="flex items-center gap-1 text-gray-500 text-xs font-medium">
                            {evt.type === "Movie" ? (
                              <>
                                <span>🎬</span>
                                <span className="truncate">{evt.movieVenue || evt.restaurant}</span>
                              </>
                            ) : (
                              <>
                                <MapPin size={12} />
                                <span className="truncate">{evt.restaurant}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Event stats / status */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                          {renderRsvpBadge(rsvp)}

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={getWhatsAppShareUrl(evt)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                            >
                              WhatsApp Share
                            </a>
                            {pendingFamCount > 0 && (
                              <span className="text-[11px] text-gray-400 font-semibold">
                                ⏳ {pendingFamCount} pending replies
                              </span>
                            )}
                            <button
                              onClick={() => onSelectEvent(evt)}
                              className="p-1.5 rounded-xl bg-gray-50 group-hover:bg-orange-50 border border-gray-100 text-gray-400 group-hover:text-orange-600 transition-all"
                            >
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Previous/Archived Events */}
          <section className="space-y-3">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
              Previous Dinner Logs
            </h3>

            {previousEvents.length === 0 ? (
              <p className="text-xs text-gray-400 font-medium">No previous events logged.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {previousEvents.map((evt) => {
                  const rsvp = getFamilyRsvp(evt.id, currentFamily.id);
                  return (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEvent(evt)}
                      className="cursor-pointer bg-white border border-gray-100 hover:border-gray-200 rounded-2xl p-4 transition-all hover:scale-[1.01] shadow-sm"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-gray-400 font-bold">{evt.date}</span>
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-bold scale-90">
                            Closed
                          </span>
                        </div>
                        <h5 className="font-extrabold text-gray-800 text-sm truncate">{evt.name}</h5>
                        <p className="text-[11px] text-gray-500 truncate font-semibold">📍 {evt.restaurant}</p>
                        
                        <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] font-medium">
                          <span className="text-gray-400">Your Attending Status:</span>
                          <span className={rsvp?.attending === "Yes" ? "text-emerald-600 font-bold" : "text-gray-400"}>
                            {rsvp ? rsvp.attending : "No reply"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right 1 Column: Group Notifications */}
        <div className="space-y-6">
          <section className="space-y-3 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Bell className="text-orange-500" size={18} />
              Notifications
            </h3>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="text-xs text-gray-400 font-medium text-center py-6">No recent group activity notifications.</p>
              ) : (
                notifications.map((notif) => {
                  let borderStyle = "border-gray-150 bg-gray-50";
                  if (notif.type === "success") borderStyle = "border-emerald-100 bg-emerald-50/50 text-emerald-950";
                  if (notif.type === "warning") borderStyle = "border-rose-100 bg-rose-50/50 text-rose-950";
                  if (notif.type === "alert") borderStyle = "border-amber-100 bg-amber-50/50 text-amber-950";

                  return (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-xl border ${borderStyle} text-xs space-y-1`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800">{notif.title}</span>
                        <span className="text-[9px] text-gray-400 font-bold">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-600 leading-relaxed font-medium">{notif.message}</p>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Group Info Box */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50/40 border border-orange-100 rounded-2xl p-5 space-y-3 text-xs">
            <h4 className="font-extrabold text-gray-800 flex items-center gap-1.5">
              💡 Comedy Group Info
            </h4>
            <p className="text-gray-500 leading-relaxed font-medium">
              Comedy Group consists of exactly 7 families, 14 adults and 14 kids, making 28 members total. 
              Always submit Attending Status and select food items before the host-defined deadline so the Captain can compile and message the restaurant.
            </p>
            <div className="pt-2 border-t border-orange-100 grid grid-cols-2 gap-2 text-center">
              <div className="bg-white border border-orange-100 p-2.5 rounded-xl shadow-sm">
                <span className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Couples</span>
                <span className="text-orange-600 font-black text-lg">7 Families</span>
              </div>
              <div className="bg-white border border-orange-100 p-2.5 rounded-xl shadow-sm">
                <span className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider">Headcount</span>
                <span className="text-orange-600 font-black text-lg">28 Members</span>
              </div>
            </div>
          </div>

          {/* Account Security (Change PIN) Box */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 text-xs shadow-sm">
            <h4 className="font-extrabold text-gray-800 flex items-center gap-1.5">
              🔑 Account Security
            </h4>
            <p className="text-gray-500 leading-relaxed font-medium">
              Update your family's 4-digit PIN number used for logging in.
            </p>
            {pinSuccess && (
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold">
                {pinSuccess}
              </div>
            )}
            {pinError && (
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 font-bold">
                {pinError}
              </div>
            )}
            {!showPinForm ? (
              <button
                onClick={() => setShowPinForm(true)}
                className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 font-bold rounded-xl transition-all"
              >
                Change PIN Number
              </button>
            ) : (
              <form onSubmit={handleChangePinSubmit} className="space-y-2.5">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="Current 4-Digit PIN"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 font-bold tracking-widest font-mono focus:border-orange-500 focus:outline-none"
                />
                <input
                  type="password"
                  maxLength={4}
                  placeholder="New 4-Digit PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 font-bold tracking-widest font-mono focus:border-orange-500 focus:outline-none"
                />
                <input
                  type="password"
                  maxLength={4}
                  placeholder="Confirm New PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 font-bold tracking-widest font-mono focus:border-orange-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={pinLoading}
                    className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all"
                  >
                    {pinLoading ? "Saving..." : "Update PIN"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinForm(false);
                      setOldPin("");
                      setNewPin("");
                      setConfirmPin("");
                      setPinError("");
                      setPinSuccess("");
                    }}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
