import React, { useState } from "react";
import { Event, Family, Menu, MenuItem } from "../types";
import { Plus, Trash2, Calendar, MapPin, Clock, Edit2, ShieldAlert, Sparkles, Bell, HelpCircle, Save, X, Film } from "lucide-react";

interface AdminPanelProps {
  currentFamily: Family;
  families: Family[];
  events: Event[];
  menu: Menu;
  onBack: () => void;
  onCreateEvent: (eventData: any) => Promise<void>;
  onUpdateEvent: (id: string, eventData: any) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onToggleEventActive: (id: string) => Promise<void>;
  onUpdateMenu: (section: string, items: MenuItem[]) => Promise<void>;
  onSendNotification: (notifData: any) => Promise<void>;
}

export default function AdminPanel({
  currentFamily,
  families,
  events,
  menu,
  onBack,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onToggleEventActive,
  onUpdateMenu,
  onSendNotification
}: AdminPanelProps) {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Active Admin Sub-Tab
  const [subTab, setSubTab] = useState<"createEvent" | "movieEvent" | "menuEditor" | "sendAlert" | "aiAssistant">("createEvent");

  // --- Edit Event State ---
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editEvtName, setEditEvtName] = useState<string>("");
  const [editEvtType, setEditEvtType] = useState<Event["type"]>("Weekend Dinner");
  const [editEvtHostFamily, setEditEvtHostFamily] = useState<string>("");
  const [editEvtDate, setEditEvtDate] = useState<string>("");
  const [editEvtTime, setEditEvtTime] = useState<string>("");
  const [editEvtRestaurant, setEditEvtRestaurant] = useState<string>("");
  const [editEvtAddress, setEditEvtAddress] = useState<string>("");
  const [editEvtMaps, setEditEvtMaps] = useState<string>("");
  const [editEvtDeadline, setEditEvtDeadline] = useState<string>("");
  const [editEvtNotes, setEditEvtNotes] = useState<string>("");

  // --- 1. Event Creator State ---
  const [evtName, setEvtName] = useState<string>("");
  const [evtType, setEvtType] = useState<Event["type"]>("Weekend Dinner");
  const [evtHostFamily, setEvtHostFamily] = useState<string>(
    currentFamily.id === "admin" ? "sharma" : currentFamily.id
  );
  const [evtDate, setEvtDate] = useState<string>("");
  const [evtTime, setEvtTime] = useState<string>("");
  const [evtRestaurant, setEvtRestaurant] = useState<string>("");
  const [evtAddress, setEvtAddress] = useState<string>("");
  const [evtMaps, setEvtMaps] = useState<string>("");
  const [evtDeadline, setEvtDeadline] = useState<string>("");
  const [evtNotes, setEvtNotes] = useState<string>("");

  // --- Movie Event Creator State ---
  const [mvEvtName, setMvEvtName] = useState<string>("");
  const [mvEvtHostFamily, setMvEvtHostFamily] = useState<string>(
    currentFamily.id === "admin" ? "sharma" : currentFamily.id
  );
  const [mvEvtDate, setMvEvtDate] = useState<string>("");
  const [mvEvtTime, setMvEvtTime] = useState<string>("");
  const [mvEvtVenue, setMvEvtVenue] = useState<string>("");
  const [mvEvtAddress, setMvEvtAddress] = useState<string>("");
  const [mvEvtMaps, setMvEvtMaps] = useState<string>("");
  const [mvEvtDeadline, setMvEvtDeadline] = useState<string>("");
  const [mvEvtNotes, setMvEvtNotes] = useState<string>("");

  // --- 2. Menu Editor State ---
  const [menuSection, setMenuSection] = useState<keyof Menu>("starters");
  const [draftMenuItems, setDraftMenuItems] = useState<MenuItem[]>(menu[menuSection] || []);
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemPrice, setNewItemPrice] = useState<string>("");

  const lastSectionRef = React.useRef<keyof Menu | null>(null);

  React.useEffect(() => {
    if (lastSectionRef.current !== menuSection) {
      lastSectionRef.current = menuSection;
      setDraftMenuItems(menu[menuSection] || []);
    }
  }, [menuSection, menu]);

  // --- 3. Custom Alert State ---
  const [alertTitle, setAlertTitle] = useState<string>("");
  const [alertMsg, setAlertMsg] = useState<string>("");
  const [alertType, setAlertType] = useState<"info" | "success" | "warning" | "alert">("info");

  // --- 4. Gemini AI Helper State ---
  const [aiTheme, setAiTheme] = useState<string>("");
  const [aiNotes, setAiNotes] = useState<string>("");
  const [aiSuggestion, setAiSuggestion] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Create Event Handler
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtDate || !evtTime || !evtType) {
      setError("Please fill out Event Type, Date, and Time.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const finalDeadline = evtDeadline 
        ? new Date(evtDeadline).toISOString() 
        : new Date(`${evtDate}T${evtTime}`).toISOString();

      await onCreateEvent({
        name: evtName,
        type: evtType,
        hostFamilyId: evtHostFamily,
        date: evtDate,
        time: evtTime,
        restaurant: evtRestaurant,
        address: evtAddress,
        googleMapsUrl: evtMaps,
        deadline: finalDeadline,
        notes: evtNotes
      });

      setSuccess("Dinner scheduled successfully! Everyone was notified.");
      setEvtName("");
      setEvtRestaurant("");
      setEvtAddress("");
      setEvtMaps("");
      setEvtDeadline("");
      setEvtNotes("");
    } catch (err: any) {
      setError(err.message || "Failed to create event.");
    } finally {
      setLoading(false);
    }
  };

  // Create Movie Event Handler
  const handleCreateMovieEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mvEvtDate || !mvEvtTime) {
      setError("Please fill out Date and Time.");
      return;
    }
    if (!mvEvtName) {
      setError("Please enter the Movie Name.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const finalDeadline = mvEvtDeadline 
        ? new Date(mvEvtDeadline).toISOString() 
        : new Date(`${mvEvtDate}T${mvEvtTime}`).toISOString();

      await onCreateEvent({
        name: mvEvtName,
        type: "Movie",
        hostFamilyId: mvEvtHostFamily,
        date: mvEvtDate,
        time: mvEvtTime,
        restaurant: mvEvtVenue,
        address: mvEvtAddress,
        googleMapsUrl: mvEvtMaps,
        deadline: finalDeadline,
        notes: mvEvtNotes,
        movieName: mvEvtName,
        movieVenue: mvEvtVenue,
        movieShowtime: mvEvtTime
      });

      setSuccess("Movie Night scheduled successfully! Everyone was notified.");
      setMvEvtName("");
      setMvEvtVenue("");
      setMvEvtAddress("");
      setMvEvtMaps("");
      setMvEvtDeadline("");
      setMvEvtNotes("");
    } catch (err: any) {
      setError(err.message || "Failed to create movie event.");
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Event Modal
  const handleOpenEditEvent = (evt: Event) => {
    setEditingEvent(evt);
    setEditEvtName(evt.name);
    setEditEvtType(evt.type);
    setEditEvtHostFamily(evt.hostFamilyId);
    setEditEvtDate(evt.date);
    setEditEvtTime(evt.time);
    setEditEvtRestaurant(evt.restaurant);
    setEditEvtAddress(evt.address);
    setEditEvtMaps(evt.googleMapsUrl);
    // Format deadline to datetime-local friendly format
    const dlString = evt.deadline ? new Date(new Date(evt.deadline).getTime() - new Date(evt.deadline).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
    setEditEvtDeadline(dlString);
    setEditEvtNotes(evt.notes);
    setShowEditModal(true);
    setError("");
    setSuccess("");
  };

  // Submit Event Updates
  const handleUpdateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    if (!editEvtDate || !editEvtTime || !editEvtType) {
      setError("Event Type, Date, and Time are required.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Set final deadline to event date & time if left empty
      const finalDeadline = editEvtDeadline
        ? new Date(editEvtDeadline).toISOString()
        : new Date(`${editEvtDate}T${editEvtTime}`).toISOString();

      await onUpdateEvent(editingEvent.id, {
        name: editEvtName,
        type: editEvtType,
        hostFamilyId: editEvtHostFamily,
        date: editEvtDate,
        time: editEvtTime,
        restaurant: editEvtRestaurant,
        address: editEvtAddress,
        googleMapsUrl: editEvtMaps,
        deadline: finalDeadline,
        notes: editEvtNotes,
        isActive: editingEvent.isActive
      });

      setSuccess("Event updated successfully!");
      setShowEditModal(false);
      setEditingEvent(null);
    } catch (err: any) {
      setError(err.message || "Failed to update event details.");
    } finally {
      setLoading(false);
    }
  };

  // Delete Event
  const handleDeleteEventClick = async (eventId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete '${name}'? This will delete all RSVPs and notifications for this event.`)) {
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      console.log("handleDeleteEventClick: eventId =", eventId);
      await onDeleteEvent(eventId);
      console.log("handleDeleteEventClick: delete succeeded");
      setSuccess(`Event '${name}' was deleted successfully.`);
    } catch (err: any) {
      console.error("handleDeleteEventClick: delete failed error =", err);
      setError(err.message || "Failed to delete event.");
    } finally {
      setLoading(false);
    }
  };

  // Build WhatsApp share URL
  const getWhatsAppShareUrl = (evt: Event) => {
    const hostName = families.find(f => f.id === evt.hostFamilyId)?.name || "Comedy Group Host";
    const dlString = evt.deadline ? new Date(evt.deadline).toLocaleString() : "TBD";
    const appLink = window.location.origin;
    const imageLink = `${appLink}/icon-512.png`;

    const message = `🎭 *New Comedy Group Dinner scheduled!*
🎉 *Occasion:* ${evt.name} (${evt.type})
👑 *Host:* ${hostName}
📅 *Date:* ${evt.date}
⏰ *Time:* ${evt.time}
📍 *Restaurant:* ${evt.restaurant}
🗺️ *Address:* ${evt.address}
${evt.googleMapsUrl ? `🔗 *Google Maps:* ${evt.googleMapsUrl}\n` : ""}⏳ *Order Deadline:* ${dlString}
💬 *Notes:* ${evt.notes || "Join us for great laughs and delicious food!"}

👇 *Submit your RSVP & Food Order here:*
🔗 ${appLink}
📷 *Preview:* ${imageLink}`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  // Menu Item Updates
  const handleAddMenuItem = () => {
    if (!newItemName) return;

    const newItem: MenuItem = {
      id: `m_${menuSection}_${Date.now()}`,
      name: newItemName,
      price: 0
    };

    const updated = [...draftMenuItems, newItem];
    setDraftMenuItems(updated);
    setNewItemName("");
    setNewItemPrice("");
  };

  const handleRemoveMenuItem = (id: string) => {
    const updated = draftMenuItems.filter((i) => i.id !== id);
    setDraftMenuItems(updated);
  };

  const handleSaveMenu = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await onUpdateMenu(menuSection, draftMenuItems);
      setSuccess(`Restaurant menu section '${menuSection}' updated successfully!`);
      lastSectionRef.current = null; // force reload from newly-saved prop
    } catch (err: any) {
      setError(err.message || "Failed to save menu changes.");
    } finally {
      setLoading(false);
    }
  };

  // Custom Alert broadcasting
  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle || !alertMsg) {
      setError("Title and announcement message are required.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await onSendNotification({
        title: alertTitle,
        message: alertMsg,
        type: alertType,
        eventId: events[0]?.id || null
      });
      setSuccess("Group announcement broadcasted successfully!");
      setAlertTitle("");
      setAlertMsg("");
    } catch (err: any) {
      setError(err.message || "Failed to broadcast alert.");
    } finally {
      setLoading(false);
    }
  };

  // Gemini generator call
  const handleGenerateAiMenu = async () => {
    if (!aiTheme) {
      setError("Please describe a creative theme (e.g. 'Bollywood Retro')");
      return;
    }

    setAiLoading(true);
    setError("");
    setAiSuggestion("");

    try {
      const response = await fetch("/api/generate-menu-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: aiTheme, notes: aiNotes }),
      });
      const data = await response.json();
      if (data.suggestion) {
        setAiSuggestion(data.suggestion);
        if (data.message) {
          setError(data.message); // Show warning if key is placeholder
        }
      } else {
        throw new Error(data.error || "No response");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate AI proposal.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 space-y-6">
      
      {/* Back button */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-orange-600 transition-colors text-sm font-bold"
        >
          ← Back to Dashboard
        </button>
        <span className="text-xs font-black text-orange-600 uppercase tracking-wider bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
          ⚙️ Event Planner
        </span>
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-black text-gray-900">Event Planning Console</h2>
        <p className="text-gray-500 text-xs font-semibold">Any family can schedule a birthday celebration, anniversary dinner, or weekend get-together. Manage events, update menus, or use Gemini AI suggestions!</p>
      </div>

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold">
          {error}
        </div>
      )}

      {/* Admin sub-navigation */}
      <div className="flex gap-1 bg-gray-100 border border-gray-200/50 p-1.5 rounded-2xl overflow-x-auto scrollbar-none">
        <button
          onClick={() => { setSubTab("createEvent"); setError(""); setSuccess(""); }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            subTab === "createEvent" ? "bg-orange-500 text-white shadow-md" : "text-gray-500 hover:bg-gray-200/60"
          }`}
        >
          <Calendar size={13} className="inline-block mr-1.5" />
          Schedule Dinner
        </button>
        <button
          onClick={() => { setSubTab("movieEvent"); setError(""); setSuccess(""); }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            subTab === "movieEvent" ? "bg-purple-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-200/60"
          }`}
        >
          <Film size={13} className="inline-block mr-1.5" />
          Movie Time
        </button>
        <button
          onClick={() => { setSubTab("menuEditor"); setError(""); setSuccess(""); }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            subTab === "menuEditor" ? "bg-orange-500 text-white shadow-md" : "text-gray-500 hover:bg-gray-200/60"
          }`}
        >
          <Edit2 size={13} className="inline-block mr-1.5" />
          Restaurant Menu
        </button>
        <button
          onClick={() => { setSubTab("sendAlert"); setError(""); setSuccess(""); }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            subTab === "sendAlert" ? "bg-orange-500 text-white shadow-md" : "text-gray-500 hover:bg-gray-200/60"
          }`}
        >
          <Bell size={13} className="inline-block mr-1.5" />
          Send Announcement
        </button>
        <button
          onClick={() => { setSubTab("aiAssistant"); setError(""); setSuccess(""); }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            subTab === "aiAssistant" ? "bg-orange-500 text-white shadow-md" : "text-gray-500 hover:bg-gray-200/60"
          }`}
        >
          <Sparkles size={13} className="inline-block mr-1.5" />
          Gemini AI Suggestions
        </button>
      </div>

      {/* --- Tab 1: Create/Schedule Event --- */}
      {subTab === "createEvent" && (
        <form onSubmit={handleCreateEvent} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
          <h4 className="text-base font-black text-gray-800 flex items-center gap-1.5">
            <Calendar size={16} className="text-orange-500" />
            Plan Dinner & Celebration
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-bold block">Event Occasion Name</label>
              <input
                type="text"
                placeholder="e.g. Vikram & Aditi's Anniversary Dinner"
                value={evtName}
                onChange={(e) => setEvtName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-bold block">Event Type</label>
              <select
                value={evtType}
                onChange={(e) => setEvtType(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="Weekend Dinner">Weekend Dinner</option>
                <option value="Regular Dinner">Regular Dinner</option>
                <option value="Birthday">Birthday</option>
                <option value="Anniversary">Anniversary</option>
                <option value="Holiday Dinner">Holiday Dinner</option>
                <option value="Festival Celebration">Festival Celebration</option>
                <option value="Other">Other Occasion</option>
              </select>
            </div>

            {currentFamily.id === "admin" ? (
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold block">Host Family (Captain)</label>
                <select
                  value={evtHostFamily}
                  onChange={(e) => setEvtHostFamily(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold block">Date</label>
                <input
                  type="date"
                  value={evtDate}
                  onChange={(e) => setEvtDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold block">Time</label>
                <input
                  type="time"
                  value={evtTime}
                  onChange={(e) => setEvtTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-bold block">Restaurant Name</label>
              <input
                type="text"
                placeholder="e.g. Saffron Spice Veg Restaurant"
                value={evtRestaurant}
                onChange={(e) => setEvtRestaurant(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-bold block">Google Maps Link (Optional)</label>
              <input
                type="text"
                placeholder="https://maps.google.com/..."
                value={evtMaps}
                onChange={(e) => setEvtMaps(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs text-gray-500 font-bold block">Restaurant Street Address</label>
              <input
                type="text"
                placeholder="e.g. 3rd Block, Near Central Mall, Powai"
                value={evtAddress}
                onChange={(e) => setEvtAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-bold block">Order Submission Deadline (Optional)</label>
              <input
                type="datetime-local"
                value={evtDeadline}
                onChange={(e) => setEvtDeadline(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs text-gray-500 font-bold block">Special Host Guidelines/Notes</label>
              <textarea
                rows={3}
                placeholder="Add special instructions: e.g. Dress code, parking details, set menu rules..."
                value={evtNotes}
                onChange={(e) => setEvtNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-black text-white rounded-2xl text-sm transition-all shadow-md active:scale-[0.99]"
          >
            {loading ? "Scheduling event..." : "🚀 Publish & Broadcast to Group"}
          </button>
        </form>
      )}

      {/* --- Tab 2: Movie Time --- */}
      {subTab === "movieEvent" && (
        <form onSubmit={handleCreateMovieEvent} className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm space-y-5">
          <h4 className="text-base font-black text-gray-800 flex items-center gap-1.5">
            <Film size={16} className="text-purple-600" />
            Plan Movie Night
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-bold block">Movie Name *</label>
              <input
                type="text"
                placeholder="e.g. Pathaan, Jawan, Dunki"
                value={mvEvtName}
                onChange={(e) => setMvEvtName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-gray-800 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {currentFamily.id === "admin" ? (
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold block">Host Family (Captain)</label>
                <select
                  value={mvEvtHostFamily}
                  onChange={(e) => setMvEvtHostFamily(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold block">Date</label>
                <input
                  type="date"
                  value={mvEvtDate}
                  onChange={(e) => setMvEvtDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-gray-800 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold block">Time</label>
                <input
                  type="time"
                  value={mvEvtTime}
                  onChange={(e) => setMvEvtTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-gray-800 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-bold block">Cinema / Venue</label>
              <input
                type="text"
                placeholder="e.g. INOX, PVR, Cinepolis"
                value={mvEvtVenue}
                onChange={(e) => setMvEvtVenue(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-gray-800 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-bold block">Google Maps Link (Optional)</label>
              <input
                type="text"
                placeholder="https://maps.google.com/..."
                value={mvEvtMaps}
                onChange={(e) => setMvEvtMaps(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs text-gray-500 font-bold block">Venue Address</label>
              <input
                type="text"
                placeholder="e.g. 3rd Floor, R-City Mall, Ghatkopar"
                value={mvEvtAddress}
                onChange={(e) => setMvEvtAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-gray-800 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-bold block">RSVP Deadline (Optional)</label>
              <input
                type="datetime-local"
                value={mvEvtDeadline}
                onChange={(e) => setMvEvtDeadline(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs text-gray-500 font-bold block">Notes</label>
              <textarea
                rows={3}
                placeholder="Add any notes: e.g. Snacks arranged, meet at lobby..."
                value={mvEvtNotes}
                onChange={(e) => setMvEvtNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-gray-800 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-gray-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-black text-white rounded-2xl text-sm transition-all shadow-md active:scale-[0.99]"
          >
            {loading ? "Scheduling movie night..." : "🎬 Publish Movie Night"}
          </button>
        </form>
      )}

      {/* --- Tab 3: Menu Editor --- */}
      {subTab === "menuEditor" && (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-base font-black text-gray-800 flex items-center gap-1.5">
              <Edit2 size={16} className="text-orange-500" />
              Manage Restaurant Menu Database
            </h4>
            <button
              onClick={handleSaveMenu}
              disabled={loading}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-black text-xs text-white rounded-xl flex items-center gap-1 shadow-sm"
            >
              <Save size={13} />
              Save Section changes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left selector */}
            <div className="md:col-span-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Select Section</label>
              <div className="flex flex-col gap-1.5">
                {(Object.keys(menu) as Array<keyof Menu>).map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setMenuSection(sec)}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs text-left transition-all border ${
                      menuSection === sec 
                        ? "bg-orange-50 text-orange-600 border-orange-100" 
                        : "bg-gray-50 hover:bg-gray-100 text-gray-500 border-gray-100"
                    }`}
                  >
                    {sec === "starters" ? "Starters" 
                     : sec === "mainCourse" ? "Main Course" 
                     : sec === "roti" ? "Roti Section" 
                     : sec === "rice" ? "Rice Section" 
                     : sec === "dessert" ? "Dessert" 
                     : "Drinks"}
                  </button>
                ))}
              </div>
            </div>

            {/* Right content editor */}
            <div className="md:col-span-8 space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                Items in {menuSection.toUpperCase()}
              </label>

              {/* Add New Item Mini-Form */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                <input
                  type="text"
                  placeholder="New item name..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="sm:col-span-10 px-3 py-2 text-xs rounded-lg bg-white border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-gray-800 font-bold"
                />
                <button
                  type="button"
                  onClick={handleAddMenuItem}
                  className="sm:col-span-2 py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {/* List of current Section items */}
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                {draftMenuItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 border border-gray-100 shadow-sm"
                  >
                    <div>
                      <span className="text-xs font-bold text-gray-800">{item.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMenuItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Tab 3: Custom Announcements --- */}
      {subTab === "sendAlert" && (
        <form onSubmit={handleSendAlert} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
          <h4 className="text-base font-black text-gray-800 flex items-center gap-1.5">
            <Bell size={16} className="text-orange-500" />
            Send Custom Group Notification
          </h4>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-bold block">Announcement Title</label>
              <input
                type="text"
                placeholder="e.g. ⏰ Final Reminder: Order before 2 PM"
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-bold block">Announcement Type</label>
              <div className="grid grid-cols-4 gap-2">
                {(["info", "success", "warning", "alert"] as const).map((t) => {
                  const isActive = alertType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAlertType(t)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all capitalize ${
                        isActive
                          ? "bg-orange-500 border-orange-400 text-white shadow-md shadow-orange-100"
                          : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-bold block">Message</label>
              <textarea
                rows={4}
                placeholder="Type details here: e.g. Restaurant order has been placed. Dinner starts sharp at 8:30 PM. See you all soon!"
                value={alertMsg}
                onChange={(e) => setAlertMsg(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-black text-white rounded-2xl text-sm transition-all shadow-md active:scale-[0.99]"
          >
            {loading ? "Broadcasting..." : "🔊 Send announcement to Comedy Group Dashboard"}
          </button>
        </form>
      )}

      {/* --- Tab 4: Gemini AI Assistant --- */}
      {subTab === "aiAssistant" && (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="space-y-1">
            <h4 className="text-base font-black text-gray-800 flex items-center gap-1.5">
              <Sparkles size={16} className="text-orange-500" />
              Gemini AI Themed Dinner Generator
            </h4>
            <p className="text-xs text-gray-500 font-medium">Describe a fun theme (Bollywood Retro, Punjabi Dhaba, Jungle Safari) and get a creative themed menu suggestion instantly!</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold block">Dinner Theme / Occasion</label>
                <input
                  type="text"
                  placeholder="e.g. 70s Bollywood Retro or Rainy Day Feast"
                  value={aiTheme}
                  onChange={(e) => setAiTheme(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold block">Add Notes / Rules (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. must include Paneer Chilli, make it funny"
                  value={aiNotes}
                  onChange={(e) => setAiNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={aiLoading}
              onClick={handleGenerateAiMenu}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 hover:from-orange-600 hover:to-red-600 font-black text-white rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              {aiLoading ? "Consulting chef Gemini..." : "🪄 Draft Theme Menu with Gemini"}
            </button>

            {aiSuggestion && (
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3 shadow-inner animate-fadeIn">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-[10px] uppercase font-black text-orange-600 tracking-wider">👩‍🍳 Gemini AI Culinary Suggestion</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiSuggestion);
                      setSuccess("Gemini suggestion copied! Use it in event notes.");
                    }}
                    className="text-[10px] text-gray-400 hover:text-orange-600 hover:underline transition-colors font-bold"
                  >
                    Copy Proposal
                  </button>
                </div>
                <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-sans prose prose-neutral max-w-none font-medium">
                  {aiSuggestion}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toggle Lock / Unlock for Active Events */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
        <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">
          <ShieldAlert size={15} className="text-orange-500" />
          Event RSVP Control State
        </h4>
        <p className="text-xs text-gray-500 leading-relaxed font-medium">
          As a captain, you can manually lock RSVPs and food order submissions once you're ready to place the order with the restaurant. 
          When locked, members can review their orders but cannot make updates.
        </p>

        <div className="space-y-2">
          {events.map((evt) => {
            const canModify = currentFamily.id === "admin" || evt.hostFamilyId === currentFamily.id;
            return (
              <div
                key={evt.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <div className="truncate pr-4 flex-1">
                  <span className="font-bold text-xs text-gray-800 block truncate">{evt.name || "Comedy Group Dinner"}</span>
                  <span className="text-[10px] text-gray-400 font-semibold">📍 {evt.restaurant} • {evt.date}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={getWhatsAppShareUrl(evt)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1.5"
                    title="Share on WhatsApp"
                  >
                    Share
                  </a>

                  {canModify && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEditEvent(evt)}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEventClick(evt.id, evt.name)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                      >
                        Delete
                      </button>
                    </>
                  )}

                  {canModify && (
                    <button
                      type="button"
                      onClick={() => onToggleEventActive(evt.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 border ${
                        evt.isActive
                          ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-100"
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100"
                      }`}
                    >
                      {evt.isActive ? "🔒 Lock" : "🔓 Open"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl relative border border-gray-100 animate-scaleUp my-8">
            <button
              onClick={() => { setShowEditModal(false); setEditingEvent(null); }}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
            >
              <X size={16} />
            </button>

            <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-1.5">
              <Calendar size={20} className="text-orange-500" />
              Edit Dinner Details
            </h4>

            <form onSubmit={handleUpdateEventSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500 font-bold block">Event Occasion Name</label>
                  <input
                    type="text"
                    value={editEvtName}
                    onChange={(e) => setEditEvtName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500 font-bold block">Event Type</label>
                  <select
                    value={editEvtType}
                    onChange={(e) => setEditEvtType(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold focus:border-orange-500 focus:outline-none"
                  >
                    <option value="Weekend Dinner">Weekend Dinner</option>
                    <option value="Regular Dinner">Regular Dinner</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Anniversary">Anniversary</option>
                    <option value="Holiday Dinner">Holiday Dinner</option>
                    <option value="Festival Celebration">Festival Celebration</option>
                    <option value="Other">Other Occasion</option>
                  </select>
                </div>

                {currentFamily.id === "admin" ? (
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500 font-bold block">Host Family (Captain)</label>
                    <select
                      value={editEvtHostFamily}
                      onChange={(e) => setEditEvtHostFamily(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold focus:border-orange-500 focus:outline-none"
                    >
                      {families.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500 font-bold block">Date</label>
                    <input
                      type="date"
                      value={editEvtDate}
                      onChange={(e) => setEditEvtDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500 font-bold block">Time</label>
                    <input
                      type="time"
                      value={editEvtTime}
                      onChange={(e) => setEditEvtTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500 font-bold block">Restaurant Name</label>
                  <input
                    type="text"
                    value={editEvtRestaurant}
                    onChange={(e) => setEditEvtRestaurant(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500 font-bold block">Google Maps Link (Optional)</label>
                  <input
                    type="text"
                    value={editEvtMaps}
                    onChange={(e) => setEditEvtMaps(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs text-gray-500 font-bold block">Restaurant Street Address</label>
                  <input
                    type="text"
                    value={editEvtAddress}
                    onChange={(e) => setEditEvtAddress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500 font-bold block">Order Submission Deadline (Optional)</label>
                  <input
                    type="datetime-local"
                    value={editEvtDeadline}
                    onChange={(e) => setEditEvtDeadline(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none font-semibold"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs text-gray-500 font-bold block">Special Host Guidelines/Notes</label>
                  <textarea
                    rows={3}
                    value={editEvtNotes}
                    onChange={(e) => setEditEvtNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-black text-white rounded-2xl text-xs transition-all shadow-md active:scale-95"
              >
                {loading ? "Updating event details..." : "💾 Update & Publish Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
