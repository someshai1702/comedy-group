import React, { useState } from "react";
import { Event, Family, RSVP, Menu } from "../types";
import { Copy, Share2, Printer, Download, CheckCircle, XCircle, AlertCircle, ShoppingBag, Eye, Star, ChevronLeft } from "lucide-react";

interface LiveSummaryProps {
  event: Event;
  families: Family[];
  rsvps: RSVP[];
  menu: Menu;
  onBack: () => void;
}

export default function LiveSummary({ event, families, rsvps, menu, onBack }: LiveSummaryProps) {
  const [copied, setCopied] = useState<boolean>(false);

  // 1. Filter RSVPs for this event
  const eventRsvps = rsvps.filter((r) => r.eventId === event.id);

  // 2. Headcount Summaries
  const attendingRsvps = eventRsvps.filter((r) => r.attending === "Yes");
  const nonAttendingRsvps = eventRsvps.filter((r) => r.attending === "No");
  const maybeRsvps = eventRsvps.filter((r) => r.attending === "Maybe");

  const familiesComing = attendingRsvps.length;
  const familiesNotComing = nonAttendingRsvps.length;
  const familiesMaybe = maybeRsvps.length;

  const totalAdults = attendingRsvps.reduce((acc, curr) => acc + curr.adultsAttendingCount, 0);
  const totalChildren = attendingRsvps.reduce((acc, curr) => acc + curr.childrenAttendingCount, 0);

  // Find families with no RSVP logged at all
  const respondedFamilyIds = eventRsvps.map((r) => r.familyId);
  const pendingFamilies = families.filter((f) => f.id !== "admin" && !respondedFamilyIds.includes(f.id));

  // 3. Food consolidation
  const consolidatedFood: { [itemId: string]: { name: string; qty: number; category: string } } = {};

  // Find item details from id
  const findItemDetails = (itemId: string): { name: string; category: string } | null => {
    for (const [section, items] of Object.entries(menu)) {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        return { name: item.name, category: section };
      }
    }
    return null;
  };

  // Populate food quantities
  attendingRsvps.forEach((rsvp) => {
    Object.entries(rsvp.order || {}).forEach(([itemId, qty]) => {
      if (qty > 0) {
        const details = findItemDetails(itemId);
        if (details) {
          if (consolidatedFood[itemId]) {
            consolidatedFood[itemId].qty += qty;
          } else {
            consolidatedFood[itemId] = {
              name: details.name,
              qty,
              category: details.category
            };
          }
        }
      }
    });
  });

  // Group food consolidated list by menu category
  const categoriesList = ["starters", "mainCourse", "roti", "rice", "dessert", "drinks"];

  // Special notes list
  const specialInstructionsList: { familyName: string; note: string }[] = attendingRsvps
    .filter((r) => r.specialInstructions && r.specialInstructions.trim() !== "")
    .map((r) => {
      const famName = families.find((f) => f.id === r.familyId)?.name || "Group Family";
      return { familyName: famName, note: r.specialInstructions };
    });

  // 4. Create Beautiful text summary for WhatsApp sharing
  const generateTextSummary = (): string => {
    let text = `*🎭 Comedy Group Dinner Planning 🎭*\n`;
    text += `*Occasion:* ${event.name || "Comedy Group Dinner"}\n`;
    text += `*Date:* ${new Date(event.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}\n`;
    text += `*Venue:* ${event.restaurant || "TBD"}\n\n`;

    text += `*--- Attending Status Summary ---*\n`;
    text += `✅ Coming Families: ${familiesComing}\n`;
    text += `❌ Not Coming: ${familiesNotComing}\n`;
    if (familiesMaybe > 0) text += `🤷 Maybe: ${familiesMaybe}\n`;
    text += `👥 Headcount: ${totalAdults} Adults, ${totalChildren} Kids (Total ${totalAdults + totalChildren} people)\n\n`;

    text += `*--- Consolidated Food Order ---*\n`;
    let foodAdded = false;
    categoriesList.forEach((cat) => {
      const catItems = Object.values(consolidatedFood).filter((f) => f.category === cat);
      if (catItems.length > 0) {
        const catName = cat === "starters" ? "Starters" 
                     : cat === "mainCourse" ? "Main Course" 
                     : cat === "roti" ? "Roti Section" 
                     : cat === "rice" ? "Rice Section" 
                     : cat === "dessert" ? "Dessert" 
                     : "Drinks";
        text += `\n*[${catName}]*\n`;
        catItems.forEach((f) => {
          text += `• ${f.name} × ${f.qty}\n`;
        });
        foodAdded = true;
      }
    });

    if (!foodAdded) {
      text += `No food orders submitted yet.\n`;
    }

    if (specialInstructionsList.length > 0) {
      text += `\n*--- Special Notes ---*\n`;
      specialInstructionsList.forEach((sn) => {
        text += `• _${sn.familyName}_: ${sn.note}\n`;
      });
    }

    text += `\n_Generated from Comedy Group Planner Web App_ 📱`;
    return text;
  };

  const handleCopy = () => {
    const text = generateTextSummary();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = generateTextSummary();
    const encodedText = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 space-y-6 print:bg-white print:text-black print:p-0">
      
      {/* Back button - hidden on print */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gray-500 hover:text-orange-600 transition-colors text-sm font-bold print:hidden"
      >
        <ChevronLeft size={16} />
        Back to Event Details
      </button>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4 print:border-black/10">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-gray-900 print:text-black">🍽️ Live Orders & Attendance</h2>
          <p className="text-gray-500 text-xs font-semibold print:text-slate-600">
            Real-time aggregates for <span className="font-extrabold text-orange-600 print:text-black">{event.name || "Comedy Group Dinner"}</span>
          </p>
        </div>

        {/* Action button panel */}
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            onClick={handleCopy}
            className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
          >
            <Copy size={14} />
            <span>{copied ? "Copied!" : "Copy Text"}</span>
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-100"
          >
            <Share2 size={14} />
            <span>Share to WhatsApp</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
          >
            <Printer size={14} />
            <span>Print Summary</span>
          </button>
        </div>
      </div>

      {/* Main Print Container / Visual Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: RSVPs and Headcount summaries (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Headcount Bento Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-100 rounded-3xl p-4 flex flex-col justify-between shadow-sm print:border-black/10">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block">Adults Coming</span>
              <span className="text-3xl font-black text-orange-500 font-mono mt-1 print:text-black">{totalAdults}</span>
              <span className="text-[10px] text-gray-400 mt-2 block font-semibold">Of 14 Group Adults</span>
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-4 flex flex-col justify-between shadow-sm print:border-black/10">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block">Kids Coming</span>
              <span className="text-3xl font-black text-amber-500 font-mono mt-1 print:text-black">{totalChildren}</span>
              <span className="text-[10px] text-gray-400 mt-2 block font-semibold">Of 14 Group Kids</span>
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-4 flex flex-col justify-between shadow-sm print:border-black/10 col-span-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block">Total Headcount</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold print:text-black">
                  {familiesComing} Families Coming
                </span>
              </div>
              <span className="text-4xl font-black text-gray-900 font-mono mt-1.5 print:text-black">
                {totalAdults + totalChildren} <span className="text-sm font-semibold text-gray-400">people</span>
              </span>
            </div>
          </div>

          {/* Families breakdown */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4 print:border-black/10">
            <h4 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider print:text-black">Family Status Log</h4>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {eventRsvps.map((rsvp) => {
                const f = families.find((fam) => fam.id === rsvp.familyId);
                if (!f) return null;

                const isYes = rsvp.attending === "Yes";
                const isNo = rsvp.attending === "No";

                return (
                  <div
                    key={rsvp.familyId}
                    className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 print:border-black/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">
                        {f.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-extrabold text-xs text-gray-800 print:text-black">{f.name}</span>
                        {isYes ? (
                          <p className="text-[10px] text-gray-500 font-bold font-mono">
                            {rsvp.adultsAttendingCount} Adults, {rsvp.childrenAttendingCount} Kids
                          </p>
                        ) : isNo ? (
                          <p className="text-[10px] text-rose-600 font-bold italic">No: {rsvp.reason}</p>
                        ) : (
                          <p className="text-[10px] text-blue-600 font-bold">Maybe</p>
                        )}
                      </div>
                    </div>

                    <span className="print:text-black">
                      {isYes ? (
                        <CheckCircle size={16} className="text-emerald-500" />
                      ) : isNo ? (
                        <XCircle size={16} className="text-rose-500" />
                      ) : (
                        <AlertCircle size={16} className="text-blue-500" />
                      )}
                    </span>
                  </div>
                );
              })}

              {/* Pending non-respondents */}
              {pendingFamilies.map((fam) => (
                <div
                  key={fam.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/50 border border-amber-100 print:border-black/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-black text-xs print:hidden">
                      {fam.name[0]}
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-gray-800 print:text-black">{fam.name}</span>
                      <p className="text-[10px] text-amber-700 font-bold">Pending Response</p>
                    </div>
                  </div>
                  <AlertCircle size={16} className="text-amber-500" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Consolidated Food Totals (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-5 print:border-black/10">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-black text-gray-800 flex items-center gap-2 print:text-black">
              <ShoppingBag className="text-orange-500 print:text-black" size={18} />
              Consolidated Food Order Summary
            </h4>
            <span className="text-xs px-2.5 py-1 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 font-extrabold print:text-black">
              Total items: {Object.values(consolidatedFood).reduce((a, b) => a + b.qty, 0)}
            </span>
          </div>

          <div className="space-y-5">
            {categoriesList.map((cat) => {
              const catItems = Object.values(consolidatedFood).filter((f) => f.category === cat);
              if (catItems.length === 0) return null;

              const catName = cat === "starters" ? "Starters" 
                           : cat === "mainCourse" ? "Main Course" 
                           : cat === "roti" ? "Roti Section" 
                           : cat === "rice" ? "Rice Section" 
                           : cat === "dessert" ? "Dessert" 
                           : "Drinks";

              return (
                <div key={cat} className="space-y-2">
                  <h5 className="text-xs font-bold text-orange-600 uppercase tracking-wider border-b border-gray-100 pb-1 print:text-black print:border-black/10">
                    {catName}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {catItems.map((food) => (
                      <div
                        key={food.name}
                        className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 border border-gray-100 print:border-black/10 shadow-sm"
                      >
                        <span className="text-xs font-bold text-gray-800 print:text-black">{food.name}</span>
                        <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 print:text-black">
                          × {food.qty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {Object.keys(consolidatedFood).length === 0 && (
              <div className="text-center py-12 text-gray-400 font-semibold italic">
                No food selections have been submitted yet. Once a family confirms attendance, their orders will group here.
              </div>
            )}
          </div>

          {/* Combined Special instructions / Chef notes */}
          {specialInstructionsList.length > 0 && (
            <div className="pt-4 border-t border-gray-100 space-y-2.5 print:border-black/10">
              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider print:text-black">
                ⚠️ Table Notes & Special Requests
              </h5>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {specialInstructionsList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-xs text-gray-700 print:text-black print:border-black/10 shadow-sm"
                  >
                    <span className="font-extrabold text-orange-600 block mb-0.5 print:text-black">{item.familyName}</span>
                    <p className="leading-relaxed italic font-medium text-gray-600">"{item.note}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
