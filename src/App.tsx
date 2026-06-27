import React, { useState, useEffect } from "react";
import { Family, Event, RSVP, Menu, DbState, MenuItem, GroupNotification } from "./types";
import LoginScreen from "./components/LoginScreen";
import AdminLogin from "./components/AdminLogin";
import Dashboard from "./components/Dashboard";
import EventDetails from "./components/EventDetails";
import MovieEventDetails from "./components/MovieEventDetails";
import LiveSummary from "./components/LiveSummary";
import Reports from "./components/Reports";
import AdminPanel from "./components/AdminPanel";
import MasterPage from "./components/MasterPage";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { LogOut, Home, BarChart2, ShieldAlert, ShoppingBag, Bell, Menu as Hamburger, RefreshCw, Calendar } from "lucide-react";

export default function App() {
  // Authentication & Session
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(false);

  // Initialize push notifications
  usePushNotifications();

  // Global State (replicated from backend server)
  const [dbState, setDbState] = useState<DbState>({
    families: [],
    menu: { starters: [], mainCourse: [], roti: [], rice: [], dessert: [], drinks: [] },
    events: [],
    rsvps: [],
    notifications: []
  });

  // UI Navigation states
  const [activeTab, setActiveTab] = useState<"dashboard" | "liveSummary" | "reports" | "adminPanel" | "masterPage">("dashboard");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetails, setShowEventDetails] = useState<boolean>(false);

  // App initialization & synchronization loading states
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Load active session from LocalStorage (provides instant offline boot!)
  useEffect(() => {
    const path = window.location.pathname;

    // Check if accessing /master route - show admin PIN login
    if (path === "/master") {
      setIsAdminRoute(true);
      return;
    }

    setIsAdminRoute(false);

    const savedFamily = localStorage.getItem("comedy_planner_family");
    if (savedFamily) {
      try {
        setCurrentFamily(JSON.parse(savedFamily));
      } catch (err) {
        console.error("Failed to parse stored family session:", err);
      }
    }
  }, []);

  // Fetch full DB state from full-stack express server
  const fetchDbState = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/db");
      if (!response.ok) throw new Error("Could not pull state");
      const data = await response.json();
      setDbState(data);
    } catch (err) {
      console.error("Error synchronizing with Express API server:", err);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  // Pull database on load, and set up a 10-second background polling timer to support real-time-like sync!
  useEffect(() => {
    fetchDbState();
    const interval = setInterval(fetchDbState, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = (family: Family) => {
    setCurrentFamily(family);
    localStorage.setItem("comedy_planner_family", JSON.stringify(family));
    // Default to master data page if logged in as admin, else dashboard
    if (family.id === "admin") {
      setActiveTab("masterPage");
    } else {
      setActiveTab("dashboard");
    }
  };

  const handleLogout = () => {
    setCurrentFamily(null);
    localStorage.removeItem("comedy_planner_family");
    setSelectedEvent(null);
    setShowEventDetails(false);
    setActiveTab("dashboard");
  };

  // Submit RSVP & Food Order
  const handleRsvpSubmit = async (rsvpPayload: any) => {
    const response = await fetch("/api/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rsvpPayload),
    });

    if (!response.ok) {
      const errorMsg = await response.json();
      throw new Error(errorMsg.error || "RSVP Submission rejected");
    }

    const data = await response.json();
    if (data.success) {
      // Synchronize latest state immediately
      await fetchDbState();
    }
  };

  // Create event (Admin / Captain action)
  const handleCreateEvent = async (eventPayload: any) => {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Event Creation rejected");
    }

    const data = await response.json();
    if (data.success) {
      await fetchDbState();
    }
  };

  // Update event (Admin / Captain action)
  const handleUpdateEvent = async (eventId: string, eventPayload: any) => {
    const response = await fetch(`/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...eventPayload, requesterFamilyId: currentFamily?.id }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Event Update rejected");
    }

    const data = await response.json();
    if (data.success) {
      await fetchDbState();
    }
  };

  // Delete event (Admin / Captain action)
  const handleDeleteEvent = async (eventId: string) => {
    console.log("handleDeleteEvent: eventId =", eventId, "requester =", currentFamily?.id);
    const response = await fetch(`/api/events/${eventId}?familyId=${currentFamily?.id}`, {
      method: "DELETE",
    });

    console.log("handleDeleteEvent: response status =", response.status);
    if (!response.ok) {
      const err = await response.json();
      console.error("handleDeleteEvent: error payload =", err);
      throw new Error(err.error || "Event Deletion rejected");
    }

    const data = await response.json();
    console.log("handleDeleteEvent: success payload =", data);
    if (data.success) {
      await fetchDbState();
    }
  };

  // Toggle order submission lock status (Admin / Captain action)
  const handleToggleEventActive = async (eventId: string) => {
    const response = await fetch(`/api/events/${eventId}/toggle-active?familyId=${currentFamily?.id}`, {
      method: "PUT",
    });

    if (!response.ok) {
      throw new Error("Could not toggle active status");
    }

    const data = await response.json();
    if (data.success) {
      await fetchDbState();
      // Sync selectedEvent detail state if currently viewing it
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent(data.event);
      }
    }
  };

  // Edit restaurant menu section
  const handleUpdateMenu = async (section: string, items: MenuItem[]) => {
    const response = await fetch("/api/menu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, items }),
    });

    if (!response.ok) {
      throw new Error("Could not update menu section database.");
    }

    const data = await response.json();
    if (data.success) {
      await fetchDbState();
    }
  };

  // Broadcast Notification
  const handleSendNotification = async (notifPayload: any) => {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifPayload),
    });

    if (!response.ok) {
      throw new Error("Broadcasting announcement failed.");
    }

    const data = await response.json();
    if (data.success) {
      await fetchDbState();
    }
  };

  // Helper to get active event for direct summaries
  const getLatestEvent = (): Event | null => {
    return dbState.events[0] || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#fafafa] text-[#1e293b] space-y-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Booting Comedy Group Console...</p>
      </div>
    );
  }

  // Render Login flow if no session found
  if (!currentFamily) {
    if (isAdminRoute) {
      return (
        <AdminLogin onLoginSuccess={handleLoginSuccess} />
      );
    }
    return (
      <LoginScreen
        families={dbState.families}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const latestEvent = getLatestEvent();

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] text-[#1e293b] pb-20 md:pb-6 relative overflow-hidden font-sans">
      
      {/* Decorative Lights */}
      <div className="absolute top-0 right-[15%] w-[40%] h-[400px] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[10%] w-[35%] h-[350px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      {/* Global Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 py-4 px-4 md:px-8 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎭</span>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-gray-900">Comedy Planner</h1>
            <p className="text-[10px] text-gray-400 font-semibold">{currentFamily.name}</p>
          </div>
        </div>

        {/* Sync Indicator and Logout Panel */}
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDbState}
            className={`p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-150 transition-all ${syncing ? "animate-spin text-orange-500" : ""}`}
            title="Refresh database"
          >
            <RefreshCw size={14} />
          </button>
          
          <button
            onClick={handleLogout}
            className="p-2 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all text-xs font-bold flex items-center gap-1.5 active:scale-95 border border-rose-100"
            title="Log Out family session"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Screen Dispatcher */}
      <main className="flex-1 py-6 relative z-10">
        
        {/* If viewing detailed event RSVP form */}
        {showEventDetails && selectedEvent ? (
          selectedEvent.type === "Movie" ? (
            <MovieEventDetails
              event={selectedEvent}
              currentFamily={currentFamily}
              families={dbState.families}
              rsvps={dbState.rsvps}
              onBack={() => {
                setShowEventDetails(false);
                setSelectedEvent(null);
              }}
              onSubmitRsvp={handleRsvpSubmit}
            />
          ) : (
            <EventDetails
              event={selectedEvent}
              currentFamily={currentFamily}
              families={dbState.families}
              rsvps={dbState.rsvps}
              menu={dbState.menu}
              onBack={() => {
                setShowEventDetails(false);
                setSelectedEvent(null);
              }}
              onSubmitRsvp={handleRsvpSubmit}
            />
          )
        ) : (
          <>
            {/* Standard Tabs */}
            {activeTab === "dashboard" && (
              <Dashboard
                currentFamily={currentFamily}
                events={dbState.events}
                rsvps={dbState.rsvps}
                notifications={dbState.notifications}
                families={dbState.families}
                onSelectEvent={(evt) => {
                  setSelectedEvent(evt);
                  setShowEventDetails(true);
                }}
                onNavigateToAdmin={() => {
                  setActiveTab("adminPanel");
                }}
              />
            )}

            {activeTab === "liveSummary" && (
              latestEvent ? (
                <LiveSummary
                  event={latestEvent}
                  families={dbState.families}
                  rsvps={dbState.rsvps}
                  menu={dbState.menu}
                  onBack={() => setActiveTab("dashboard")}
                />
              ) : (
                <div className="max-w-md mx-auto py-16 px-4 text-center text-slate-400 space-y-4">
                  <p className="text-sm">There are no scheduled events yet to summarize.</p>
                  <button
                    onClick={() => setActiveTab("adminPanel")}
                    className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold"
                  >
                    Schedule an Event
                  </button>
                </div>
              )
            )}

            {activeTab === "reports" && (
              <Reports
                families={dbState.families}
                rsvps={dbState.rsvps}
                events={dbState.events}
                menu={dbState.menu}
                onBack={() => setActiveTab("dashboard")}
              />
            )}

            {activeTab === "adminPanel" && (
              <AdminPanel
                currentFamily={currentFamily}
                families={dbState.families}
                events={dbState.events}
                menu={dbState.menu}
                onBack={() => setActiveTab("dashboard")}
                onCreateEvent={handleCreateEvent}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
                onToggleEventActive={handleToggleEventActive}
                onUpdateMenu={handleUpdateMenu}
                onSendNotification={handleSendNotification}
              />
            )}

            {activeTab === "masterPage" && (
              <MasterPage
                families={dbState.families}
                menu={dbState.menu}
                onUpdateMenu={handleUpdateMenu}
                onRefreshDb={fetchDbState}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Bottom Navigation (Mobile & Desktop optimized) - hidden on print */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-lg border-t border-gray-100 py-2.5 px-6 flex justify-around items-center z-40 md:max-w-lg md:mx-auto md:left-1/2 md:-translate-x-1/2 md:bottom-4 md:rounded-3xl md:border md:shadow-lg print:hidden">
        <button
          onClick={() => {
            setActiveTab("dashboard");
            setShowEventDetails(false);
          }}
          className={`flex flex-col items-center gap-1 text-center transition-all ${
            activeTab === "dashboard" && !showEventDetails ? "text-orange-500 scale-105 font-bold" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Home size={18} />
          <span className="text-[10px] font-bold">Dinners</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("liveSummary");
            setShowEventDetails(false);
          }}
          className={`flex flex-col items-center gap-1 text-center transition-all ${
            activeTab === "liveSummary" ? "text-orange-500 scale-105 font-bold" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <ShoppingBag size={18} />
          <span className="text-[10px] font-bold">Live Orders</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("reports");
            setShowEventDetails(false);
          }}
          className={`flex flex-col items-center gap-1 text-center transition-all ${
            activeTab === "reports" ? "text-orange-500 scale-105 font-bold" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <BarChart2 size={18} />
          <span className="text-[10px] font-bold">Reports</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("adminPanel");
            setShowEventDetails(false);
          }}
          className={`flex flex-col items-center gap-1 text-center transition-all ${
            activeTab === "adminPanel" ? "text-orange-500 scale-105 font-bold" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Calendar size={18} />
          <span className="text-[10px] font-bold">Plan Event</span>
        </button>

        {currentFamily.id === "admin" && (
          <button
            onClick={() => {
              setActiveTab("masterPage");
              setShowEventDetails(false);
            }}
            className={`flex flex-col items-center gap-1 text-center transition-all ${
              activeTab === "masterPage" ? "text-orange-500 scale-105 font-bold" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <ShieldAlert size={18} />
            <span className="text-[10px] font-bold">Master Page</span>
          </button>
        )}
      </nav>

    </div>
  );
}
