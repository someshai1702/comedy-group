import React from "react";
import { Event, Family, RSVP, Menu } from "../types";
import { Trophy, Award, TrendingUp, Heart, ChevronLeft } from "lucide-react";

interface ReportsProps {
  families: Family[];
  rsvps: RSVP[];
  events: Event[];
  menu: Menu;
  onBack: () => void;
}

export default function Reports({ families, rsvps, events, menu, onBack }: ReportsProps) {
  // --- 1. Compute Attendance % per Family ---
  const familyRsvpsMap = families.reduce((acc, fam) => {
    if (fam.id === "admin") return acc;
    acc[fam.id] = { total: 0, yes: 0 };
    return acc;
  }, {} as { [id: string]: { total: number; yes: number } });

  rsvps.forEach((rsvp) => {
    if (familyRsvpsMap[rsvp.familyId]) {
      familyRsvpsMap[rsvp.familyId].total += 1;
      if (rsvp.attending === "Yes") {
        familyRsvpsMap[rsvp.familyId].yes += 1;
      }
    }
  });

  const familyAttendancePercent = Object.entries(familyRsvpsMap).map(([id, stats]) => {
    const fam = families.find((f) => f.id === id);
    const percent = stats.total > 0 ? Math.round((stats.yes / stats.total) * 100) : 0;
    return {
      id,
      name: fam ? fam.name.replace(" Family", "") : id,
      percent,
      totalResponses: stats.total,
      yesCount: stats.yes
    };
  }).sort((a, b) => b.percent - a.percent);

  // --- 2. Compute Popular Food items across all RSVPs ---
  const foodPopularity: { [itemId: string]: { name: string; qty: number; category: string } } = {};

  rsvps.forEach((rsvp) => {
    if (rsvp.attending === "Yes" && rsvp.order) {
      Object.entries(rsvp.order).forEach(([itemId, qty]) => {
        if (qty > 0) {
          // Find item name
          let itemName = itemId;
          let category = "other";
          for (const [section, items] of Object.entries(menu)) {
            const found = items.find((i) => i.id === itemId);
            if (found) {
              itemName = found.name;
              category = section;
              break;
            }
          }
          if (foodPopularity[itemId]) {
            foodPopularity[itemId].qty += qty;
          } else {
            foodPopularity[itemId] = { name: itemName, qty, category };
          }
        }
      });
    }
  });

  const getPopularItemsByCategory = (category: string, limit = 4) => {
    return Object.values(foodPopularity)
      .filter((f) => f.category === category)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, limit);
  };

  const popularStarters = getPopularItemsByCategory("starters");
  const popularMains = getPopularItemsByCategory("mainCourse");
  const popularRoti = getPopularItemsByCategory("roti");
  const popularRice = getPopularItemsByCategory("rice");

  // --- 3. Compute Most Active Family (Hosting count + Attendance count) ---
  const activeHosts = events.reduce((acc, evt) => {
    acc[evt.hostFamilyId] = (acc[evt.hostFamilyId] || 0) + 1;
    return acc;
  }, {} as { [id: string]: number });

  const activeHostScores = Object.entries(activeHosts).map(([id, count]) => {
    const fam = families.find((f) => f.id === id);
    return {
      id,
      name: fam ? fam.name.replace(" Family", "") : id,
      count
    };
  }).sort((a, b) => b.count - a.count);

  const starFamily = familyAttendancePercent[0];

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 space-y-6">
      
      {/* Back navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gray-500 hover:text-orange-600 transition-colors text-sm font-bold"
      >
        <ChevronLeft size={16} />
        Back to Dashboard
      </button>

      {/* Header Info */}
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-gray-900">📊 Group Performance & Food Insights</h2>
        <p className="text-gray-500 text-xs font-semibold">Analytics across all historic dinners for Comedy Group</p>
      </div>

      {/* Top Trophy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {starFamily && (
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-3xl p-5 flex items-center gap-4 shadow-md">
            <div className="p-3.5 rounded-2xl bg-white/15 text-white border border-white/10">
              <Trophy size={24} />
            </div>
            <div>
              <span className="text-[10px] text-white/80 uppercase tracking-wider block font-bold">Attendance Champion</span>
              <h4 className="font-black text-white text-lg">{starFamily.name} Family</h4>
              <p className="text-xs text-white/95 font-bold">{starFamily.percent}% Attendance Rate</p>
            </div>
          </div>
        )}

        {activeHostScores.length > 0 && (
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-3xl p-5 flex items-center gap-4 shadow-md">
            <div className="p-3.5 rounded-2xl bg-white/15 text-white border border-white/10">
              <Award size={24} />
            </div>
            <div>
              <span className="text-[10px] text-white/80 uppercase tracking-wider block font-bold">Generous Group Host</span>
              <h4 className="font-black text-white text-lg">{activeHostScores[0].name} Family</h4>
              <p className="text-xs text-white/95 font-bold font-semibold">Hosted {activeHostScores[0].count} Dinners</p>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-orange-600 to-red-500 text-white rounded-3xl p-5 flex items-center gap-4 shadow-md">
          <div className="p-3.5 rounded-2xl bg-white/15 text-white border border-white/10">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-[10px] text-white/80 uppercase tracking-wider block font-bold">Total Events Cooked</span>
            <h4 className="font-black text-white text-lg">{events.length} Completed</h4>
            <p className="text-xs text-white/95 font-bold">Since June 2026</p>
          </div>
        </div>
      </div>

      {/* Statistics and Charts Visuals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Attendance Percentage Chart */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 space-y-4 shadow-sm">
          <h4 className="text-sm font-black text-gray-800 flex items-center gap-1.5">
            <Heart size={15} className="text-orange-500" />
            Attendance Percentage per Family
          </h4>

          <div className="space-y-4 pt-2">
            {familyAttendancePercent.map((f) => (
              <div key={f.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-gray-700">{f.name} Family</span>
                  <span className="font-mono font-black text-orange-600">{f.percent}%</span>
                </div>
                {/* Visual Bar */}
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-50">
                  <div
                    style={{ width: `${f.percent}%` }}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full"
                  />
                </div>
                <div className="text-[10px] text-gray-400 font-bold flex justify-between">
                  <span>{f.yesCount} RSVP 'Yes'</span>
                  <span>{f.totalResponses} Total Invites</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Dishes bento section */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 space-y-4 shadow-sm">
          <h4 className="text-sm font-black text-gray-800">
            🥇 Most Popular Dishes Ordered
          </h4>

          <div className="space-y-5 pt-1">
            {/* Starters Section */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">Starters Category</span>
              {popularStarters.length === 0 ? (
                <span className="text-xs text-gray-400 font-bold italic block">No items ordered yet</span>
              ) : (
                <div className="space-y-1.5">
                  {popularStarters.map((f) => (
                    <div key={f.name} className="flex justify-between items-center text-xs">
                      <span className="text-gray-700 font-bold">{f.name}</span>
                      <span className="font-mono font-black text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded">{f.qty} servings</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mains Section */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Main Course Category</span>
              {popularMains.length === 0 ? (
                <span className="text-xs text-gray-400 font-bold italic block">No items ordered yet</span>
              ) : (
                <div className="space-y-1.5">
                  {popularMains.map((f) => (
                    <div key={f.name} className="flex justify-between items-center text-xs">
                      <span className="text-gray-700 font-bold">{f.name}</span>
                      <span className="font-mono font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">{f.qty} servings</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bread Section */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Roti/Bread Section</span>
              {popularRoti.length === 0 ? (
                <span className="text-xs text-gray-400 font-bold italic block">No items ordered yet</span>
              ) : (
                <div className="space-y-1.5">
                  {popularRoti.map((f) => (
                    <div key={f.name} className="flex justify-between items-center text-xs">
                      <span className="text-gray-700 font-bold">{f.name}</span>
                      <span className="font-mono font-black text-orange-500 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded">{f.qty} items</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rice Section */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Rice Section</span>
              {popularRice.length === 0 ? (
                <span className="text-xs text-gray-400 font-bold italic block">No items ordered yet</span>
              ) : (
                <div className="space-y-1.5">
                  {popularRice.map((f) => (
                    <div key={f.name} className="flex justify-between items-center text-xs">
                      <span className="text-gray-700 font-bold">{f.name}</span>
                      <span className="font-mono font-black text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">{f.qty} bowls</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
