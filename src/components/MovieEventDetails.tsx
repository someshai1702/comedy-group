import React, { useState, useEffect } from "react";
import { Event, Family, RSVP } from "../types";
import { ChevronLeft, Calendar, Clock, MapPin, Film, Ticket, Users, MessageCircle, Check, AlertCircle } from "lucide-react";

interface MovieEventDetailsProps {
  event: Event;
  currentFamily: Family;
  families: Family[];
  rsvps: RSVP[];
  onBack: () => void;
  onSubmitRsvp: (rsvpData: any) => Promise<void>;
}

export default function MovieEventDetails({
  event,
  currentFamily,
  families,
  rsvps,
  onBack,
  onSubmitRsvp
}: MovieEventDetailsProps) {
  // Form states
  const [attending, setAttending] = useState<"Yes" | "No" | "Maybe" | "">("");
  const [ticketsCount, setTicketsCount] = useState<number>(1);
  const [reason, setReason] = useState<string>("");

  // Find current family's existing RSVP for this event
  const existingRsvp = rsvps.find((r) => r.eventId === event.id && r.familyId === currentFamily.id);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);

  // Initialize form states
  useEffect(() => {
    const existing = rsvps.find((r) => r.eventId === event.id && r.familyId === currentFamily.id);
    
    setAttending("");
    setError("");
    setSuccess("");
    
    if (existing) {
      setReason(existing.reason || "");
      setTicketsCount(existing.adultsAttendingCount + existing.childrenAttendingCount);
    } else {
      setReason("");
      setTicketsCount(1);
    }
  }, [event.id, currentFamily.id]);

  const isDeadlinePassed = event.deadline ? new Date(event.deadline).getTime() < new Date().getTime() : false;
  const isLocked = !event.isActive || isDeadlinePassed;

  // WhatsApp sharing function
  const shareToWhatsApp = () => {
    const hostName = families.find(f => f.id === event.hostFamilyId)?.name || "Comedy Group Host";
    const dlString = event.deadline ? new Date(event.deadline).toLocaleString() : "TBD";
    const appLink = window.location.origin;
    const imageLink = `${appLink}/icon-512.png`;

    // Calculate ticket counts
    const eventRsvps = rsvps.filter(r => r.eventId === event.id && r.attending === "Yes");
    const baseTickets = eventRsvps.reduce((sum, r) => sum + r.adultsAttendingCount + r.childrenAttendingCount, 0);
    const totalTickets = baseTickets + (attending === "Yes" ? ticketsCount : 0);
    const confirmedFamilies = eventRsvps.length + (attending === "Yes" ? 1 : 0);
    const totalFamilies = families.filter(f => f.id !== "admin").length;

    const message = `🎬 *Movie Night - ${event.movieName || event.name}*

📅 *Date:* ${event.date}
⏰ *Showtime:* ${event.movieShowtime || event.time}
📍 *Venue:* ${event.movieVenue || event.restaurant}
${event.address ? `🏠 *Address:* ${event.address}\n` : ""}
👑 *Hosted by:* ${hostName}
${event.notes ? `💬 *Notes:* ${event.notes}\n` : ""}

📊 *Ticket Status Update:*
• ${confirmedFamilies}/${totalFamilies} families confirmed
• Total Tickets Required: ${totalTickets} tickets

${eventRsvps.length > 0 && (
  "\n🏠 *Family Breakdown:\n" + 
  eventRsvps.map(r => {
    const fam = families.find(f => f.id === r.familyId);
    const count = r.adultsAttendingCount + r.childrenAttendingCount;
    return `• ${fam?.name || r.familyId}: ${count} ticket${count !== 1 ? 's' : ''}`;
  }).join('\n')
)}

${event.deadline ? `\n⏳ *RSVP Deadline:* ${dlString}\n` : ""}
👇 *Book your tickets here:*
🔗 ${appLink}
📷 *Preview:* ${imageLink}`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  // Get total tickets for all families
  const getTotalTickets = () => {
    return rsvps
      .filter(r => r.eventId === event.id && r.attending === "Yes")
      .reduce((sum, r) => sum + r.adultsAttendingCount + r.childrenAttendingCount, 0);
  };

  const handleSubmit = async () => {
    if (isLocked) {
      setError("This event is locked. No changes are permitted.");
      return;
    }
    if (!attending) {
      setError("Please select whether your family is attending.");
      return;
    }
    if (attending === "Yes" && ticketsCount < 1) {
      setError("Please enter at least 1 ticket.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onSubmitRsvp({
        eventId: event.id,
        familyId: currentFamily.id,
        attending,
        reason: attending === "No" ? reason : "",
        adultsAttendingCount: attending === "Yes" ? ticketsCount : 0,
        childrenAttendingCount: 0,
        order: {},
        specialInstructions: attending === "Yes" ? `Movie: ${event.movieName || event.name}, Tickets: ${ticketsCount}` : ""
      });
      setSuccess(true);
      // Redirect to dashboard after successful save
      setTimeout(() => {
        onBack();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const hostFamilyName = families.find((f) => f.id === event.hostFamilyId)?.name || "Comedy Group Host";
  const totalTickets = getTotalTickets();

  return (
    <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">
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
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold">🔒 Event Locked</h5>
            <p className="text-rose-600">Ticket booking is no longer available for this movie.</p>
          </div>
        </div>
      )}

      {/* Movie Event Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-6 shadow-xl">
        <div className="absolute top-[-30%] right-[-10%] w-[200px] h-[200px] rounded-full bg-white/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-5%] w-[150px] h-[150px] rounded-full bg-pink-500/20 blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md">
              <Film size={20} className="text-white" />
            </span>
            <span className="px-3 py-1 rounded-full bg-white/15 text-[10px] font-bold tracking-wider uppercase text-white backdrop-blur-md border border-white/10">
              Movie Night
            </span>
          </div>
          
          <h2 className="text-3xl font-black text-white tracking-tight">
            {event.movieName || event.name}
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <Calendar size={16} className="text-white/70" />
              <span className="font-semibold">{event.date}</span>
            </div>
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <Clock size={16} className="text-white/70" />
              <span className="font-semibold">{event.movieShowtime || event.time}</span>
            </div>
            <div className="flex items-center gap-2 text-white/90 text-sm col-span-2">
              <MapPin size={16} className="text-white/70" />
              <span className="font-semibold">{event.movieVenue || event.restaurant}</span>
            </div>
          </div>
          
          {event.address && (
            <p className="text-white/70 text-xs font-medium">{event.address}</p>
          )}
          
          <div className="pt-3 border-t border-white/20 flex items-center justify-between">
            <div>
              <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Showtime</span>
              <p className="text-xl font-black text-white">{event.movieShowtime || event.time}</p>
            </div>
            <div className="text-right">
              <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Hosted by</span>
              <p className="text-white font-bold">{hostFamilyName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Section */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
        <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
          <Users size={20} className="text-purple-600" />
          Will your family be attending?
        </h3>

        {/* Family Name Display */}
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
          <span className="text-xs text-purple-600 font-bold uppercase tracking-wider">Attending as:</span>
          <p className="text-lg font-black text-purple-700">{currentFamily.name}</p>
        </div>

        {/* Attendance Options */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            disabled={isLocked}
            onClick={() => setAttending("Yes")}
            className={`py-4 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-2 border-2 ${
              attending === "Yes"
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
            } ${isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span className="text-2xl">🎉</span>
            Yes, Coming!
          </button>
          
          <button
            type="button"
            disabled={isLocked}
            onClick={() => setAttending("No")}
            className={`py-4 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-2 border-2 ${
              attending === "No"
                ? "bg-rose-50 border-rose-300 text-rose-700"
                : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
            } ${isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span className="text-2xl">😢</span>
            Can't Make It
          </button>
          
          <button
            type="button"
            disabled={isLocked}
            onClick={() => setAttending("Maybe")}
            className={`py-4 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-2 border-2 ${
              attending === "Maybe"
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
            } ${isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span className="text-2xl">🤔</span>
            Maybe
          </button>
        </div>

        {/* Ticket Count Selection (Only if attending) */}
        {attending === "Yes" && (
          <div className="space-y-4 animate-slideDown">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
              <h4 className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2">
                <Ticket size={16} />
                How many tickets do you need?
              </h4>
              
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  disabled={isLocked || ticketsCount <= 1}
                  onClick={() => setTicketsCount(Math.max(1, ticketsCount - 1))}
                  className="w-12 h-12 rounded-full bg-white border-2 border-indigo-200 text-indigo-600 font-black text-xl hover:bg-indigo-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  −
                </button>
                
                <div className="text-center min-w-[80px]">
                  <span className="text-4xl font-black text-indigo-700">{ticketsCount}</span>
                  <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">Tickets</p>
                </div>
                
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setTicketsCount(ticketsCount + 1)}
                  className="w-12 h-12 rounded-full bg-indigo-600 text-white font-black text-xl hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              
              {/* Quick Select Buttons */}
              <div className="flex gap-2 mt-4 justify-center">
                {[2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    type="button"
                    disabled={isLocked}
                    onClick={() => setTicketsCount(num)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      ticketsCount === num
                        ? "bg-indigo-600 text-white"
                        : "bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Reason for Not Attending */}
        {attending === "No" && (
          <div className="animate-slideDown">
            <label className="text-xs text-gray-500 font-bold block mb-2">Reason (Optional)</label>
            <textarea
              rows={2}
              placeholder="Let the host know why you can't make it..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none placeholder:text-gray-400 font-medium"
            />
          </div>
        )}
      </div>

      {/* Total Summary Section */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 shadow-lg space-y-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <Ticket size={20} className="text-yellow-400" />
          Ticket Summary
        </h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-md">
            <span className="text-3xl font-black text-white">{totalTickets + (attending === "Yes" ? ticketsCount : 0)}</span>
            <p className="text-xs text-gray-300 font-bold uppercase tracking-wider mt-1">Total Tickets Required</p>
          </div>
        </div>

        {/* Family Breakdown */}
        <div className="bg-white/5 rounded-2xl p-4 space-y-2">
          <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider">Attending Families</h4>
          {rsvps.filter(r => r.eventId === event.id && r.attending === "Yes").length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">No families have confirmed yet</p>
          ) : (
            rsvps
              .filter(r => r.eventId === event.id && r.attending === "Yes")
              .map(rsvp => {
                const family = families.find(f => f.id === rsvp.familyId);
                return (
                  <div key={rsvp.familyId} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-gray-300">{family?.name || rsvp.familyId}</span>
                    <span className="text-white font-bold">{rsvp.adultsAttendingCount + rsvp.childrenAttendingCount} tickets</span>
                  </div>
                );
              })
          )}
          {attending === "Yes" && (
            <div className="flex items-center justify-between text-sm py-1.5 border-t border-white/20 mt-2 pt-2">
              <span className="text-emerald-400 font-bold">{currentFamily.name} (You)</span>
              <span className="text-emerald-400 font-black">{ticketsCount} tickets</span>
            </div>
          )}
        </div>

        {/* WhatsApp Share Button */}
        <button
          type="button"
          onClick={() => window.open(shareToWhatsApp(), "_blank")}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-500/30 active:scale-[0.98]"
        >
          <MessageCircle size={22} />
          Share Ticket Count on WhatsApp
        </button>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-semibold animate-slideDown">
          <AlertCircle size={18} className="flex-shrink-0" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-sm font-semibold animate-slideDown">
          <Check size={18} className="flex-shrink-0" />
          Ticket booking confirmed successfully!
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-4 font-bold text-gray-500 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-2xl transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={loading || isLocked || !attending}
          onClick={handleSubmit}
          className={`flex-1 py-4 font-extrabold text-white rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg ${
            loading || isLocked || !attending
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98]"
          }`}
        >
          {loading ? (
            <span>Submitting...</span>
          ) : success ? (
            <>
              <Check size={20} />
              <span>Confirmed!</span>
            </>
          ) : (
            <>
              <Ticket size={20} />
              <span>{attending === "Yes" ? `Book ${ticketsCount} Ticket${ticketsCount > 1 ? "s" : ""}` : attending === "No" ? "Submit Decline" : "Submit Maybe"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
