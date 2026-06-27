import React, { useState, useEffect } from "react";
import { Family, MenuItem, Menu } from "../types";
import { Plus, Trash2, Edit2, Save, Users, Utensils, ShieldAlert, X } from "lucide-react";

interface MasterPageProps {
  families: Family[];
  menu: Menu;
  onUpdateMenu: (section: string, items: MenuItem[]) => Promise<void>;
  onRefreshDb: () => Promise<void>;
}

export default function MasterPage({
  families,
  menu,
  onUpdateMenu,
  onRefreshDb
}: MasterPageProps) {
  const [activeTab, setActiveTab] = useState<"families" | "foodItems">("families");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // --- Family CRUD State ---
  const [showFamilyModal, setShowFamilyModal] = useState<boolean>(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [famName, setFamName] = useState<string>("");
  const [famPin, setFamPin] = useState<string>("");
  const [famAdults, setFamAdults] = useState<string>("");
  const [famChildren, setFamChildren] = useState<string>("");

  // --- Food Items CRUD State ---
  const [selectedSection, setSelectedSection] = useState<keyof Menu>("starters");
  const [draftMenuItems, setDraftMenuItems] = useState<MenuItem[]>(menu[selectedSection] || []);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  
  // Add item form state
  const [foodName, setFoodName] = useState<string>("");
  
  // Edit item form state
  const [editFoodName, setEditFoodName] = useState<string>("");

  // Keep draft menu items in sync with category selection
  useEffect(() => {
    setDraftMenuItems(menu[selectedSection] || []);
  }, [selectedSection, menu]);

  // Open Family Modal for Add
  const handleOpenAddFamily = () => {
    setEditingFamily(null);
    setFamName("");
    setFamPin("");
    setFamAdults("");
    setFamChildren("");
    setError("");
    setSuccess("");
    setShowFamilyModal(true);
  };

  // Open Family Modal for Edit
  const handleOpenEditFamily = (family: Family) => {
    setEditingFamily(family);
    setFamName(family.name);
    setFamPin(family.pin);
    setFamAdults(family.adults.join(", "));
    setFamChildren(family.children.join(", "));
    setError("");
    setSuccess("");
    setShowFamilyModal(true);
  };

  // Submit Family Form (Add / Edit)
  const handleFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!famName || !famPin) {
      setError("Family Name and PIN are required.");
      return;
    }
    if (famPin.length !== 4 || isNaN(Number(famPin))) {
      setError("PIN must be a 4-digit number.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      name: famName,
      pin: famPin,
      adults: famAdults.split(",").map(a => a.trim()).filter(Boolean),
      children: famChildren.split(",").map(c => c.trim()).filter(Boolean)
    };

    try {
      const url = editingFamily ? `/api/families/${editingFamily.id}` : "/api/families";
      const method = editingFamily ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save family");
      }

      setSuccess(`Family '${famName}' saved successfully!`);
      setShowFamilyModal(false);
      await onRefreshDb();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Delete Family
  const handleDeleteFamily = async (id: string, name: string) => {
    if (id === "admin") {
      setError("Cannot delete the admin superuser.");
      return;
    }
    if (!confirm(`Are you sure you want to delete the '${name}'? This will delete all RSVPs for this family.`)) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/families/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete family");
      }

      setSuccess(`Family '${name}' deleted successfully.`);
      await onRefreshDb();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Add Food Item (Draft state)
  const [draftItemNameError, setDraftItemNameError] = useState<string>(""); // local draft name error handler if needed

  const handleAddFoodItem = () => {
    if (!foodName) {
      setError("Item Name is required.");
      return;
    }

    const newItem: MenuItem = {
      id: `m_${selectedSection}_${Date.now()}`,
      name: foodName,
      price: 0
    };

    setDraftMenuItems([...draftMenuItems, newItem]);
    setFoodName("");
    setError("");
    setSuccess("");
  };

  // Save changes to food items list on backend
  const handleSaveFoodSection = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await onUpdateMenu(selectedSection, draftMenuItems);
      setSuccess(`Updated '${selectedSection}' category successfully!`);
    } catch (err: any) {
      setError(err.message || "Failed to update menu items.");
    } finally {
      setLoading(false);
    }
  };

  // Remove food item from list (Draft state)
  const handleRemoveFoodItem = (id: string) => {
    setDraftMenuItems(draftMenuItems.filter(item => item.id !== id));
  };

  // Start editing food item
  const handleStartEditFoodItem = (item: MenuItem) => {
    setEditingMenuItem(item);
    setEditFoodName(item.name);
  };

  // Save edited food item inline
  const handleSaveEditFoodItem = () => {
    if (!editFoodName) return;

    setDraftMenuItems(
      draftMenuItems.map(item =>
        item.id === editingMenuItem?.id
          ? { ...item, name: editFoodName }
          : item
      )
    );
    setEditingMenuItem(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <ShieldAlert className="text-orange-500 animate-pulse" size={24} />
          Master Database Control
        </h2>
        <span className="text-xs font-black text-red-600 uppercase tracking-wider bg-red-50 px-3 py-1 rounded-full border border-red-100">
          🔒 System Administrator
        </span>
      </div>

      <p className="text-gray-500 text-xs font-semibold">
        Create, edit, or delete all master system data, including family structures, login PIN credentials, and restaurant menu items & pricing.
      </p>

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold animate-fadeIn">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold animate-fadeIn">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-150 border border-gray-200/50 p-1.5 rounded-2xl">
        <button
          onClick={() => { setActiveTab("families"); setError(""); setSuccess(""); }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "families" ? "bg-orange-500 text-white shadow-md" : "text-gray-500 hover:bg-gray-200/60"
          }`}
        >
          <Users size={14} />
          Manage Families & PINs
        </button>
        <button
          onClick={() => { setActiveTab("foodItems"); setError(""); setSuccess(""); }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "foodItems" ? "bg-orange-500 text-white shadow-md" : "text-gray-500 hover:bg-gray-200/60"
          }`}
        >
          <Utensils size={14} />
          Manage Food Items
        </button>
      </div>

      {/* TAB 1: Families CRUD */}
      {activeTab === "families" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-gray-800">Comedy Group Families</h3>
            <button
              onClick={handleOpenAddFamily}
              className="py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-sm"
            >
              <Plus size={14} /> Add New Family
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {families.map((fam) => (
              <div
                key={fam.id}
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-lg shrink-0">
                    {fam.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-1 truncate">
                    <h4 className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5">
                      {fam.name}
                      {fam.id === "admin" && (
                        <span className="text-[9px] uppercase px-1.5 py-0.5 font-bold rounded bg-orange-100 text-orange-700">
                          System Admin
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-gray-500 font-semibold truncate">
                      🧑 Adults: <span className="text-gray-700">{fam.adults.join(", ") || "None"}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 font-semibold truncate">
                      🧒 Kids: <span className="text-gray-700">{fam.children.join(", ") || "None"}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 font-semibold flex items-center gap-1">
                      🔑 Login PIN: <span className="font-mono font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{fam.pin}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end gap-2">
                  <button
                    onClick={() => handleOpenEditFamily(fam)}
                    className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Edit2 size={12} /> Edit Details
                  </button>
                  {fam.id !== "admin" && (
                    <button
                      onClick={() => handleDeleteFamily(fam.id, fam.name)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 text-xs font-bold rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Food Items CRUD */}
      {activeTab === "foodItems" && (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <h3 className="text-base font-black text-gray-800">Master Food & Price Catalog</h3>
            <button
              onClick={handleSaveFoodSection}
              disabled={loading}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-sm"
            >
              <Save size={14} /> Save Current Catalog changes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Category selection list */}
            <div className="md:col-span-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Select Category</label>
              <div className="flex flex-col gap-1.5">
                {(Object.keys(menu) as Array<keyof Menu>).map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setSelectedSection(sec)}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs text-left transition-all border ${
                      selectedSection === sec 
                        ? "bg-orange-55 text-orange-600 border-orange-100 shadow-sm font-black" 
                        : "bg-gray-50 hover:bg-gray-100 text-gray-500 border-gray-100"
                    }`}
                  >
                    {sec === "starters" ? "🍟 Starters" 
                     : sec === "mainCourse" ? "🍲 Main Course" 
                     : sec === "roti" ? "🫓 Roti & Breads" 
                     : sec === "rice" ? "🍚 Rice & Biryanis" 
                     : sec === "dessert" ? "🍨 Desserts" 
                     : "🥤 Drinks & Beverages"}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Table list */}
            <div className="md:col-span-8 space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-wider text-orange-600">
                  {selectedSection.replace(/([A-Z])/g, ' $1').toUpperCase()} ITEMS ({draftMenuItems.length})
                </label>
              </div>

              {/* Add New Item Mini-Form */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <input
                  type="text"
                  placeholder="Food name (e.g. Garlic Naan)"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="sm:col-span-10 px-3 py-2 text-xs rounded-xl bg-white border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-gray-800 font-bold"
                />
                <button
                  type="button"
                  onClick={handleAddFoodItem}
                  className="sm:col-span-2 py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {draftMenuItems.length === 0 ? (
                  <p className="text-xs text-gray-400 font-medium text-center py-6">No food items added in this category yet.</p>
                ) : (
                  draftMenuItems.map((item) => {
                    const isEditing = editingMenuItem?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all shadow-sm"
                      >
                        {isEditing ? (
                          <div className="flex gap-2 w-full pr-4">
                            <input
                              type="text"
                              value={editFoodName}
                              onChange={(e) => setEditFoodName(e.target.value)}
                              className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-gray-200 bg-white font-bold"
                            />
                            <button
                              onClick={handleSaveEditFoodItem}
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg active:scale-95"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingMenuItem(null)}
                              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-gray-800 block">{item.name}</span>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEditFoodItem(item)}
                                className="p-1.5 rounded-lg hover:bg-orange-55 text-gray-400 hover:text-orange-500 transition-all border border-transparent hover:border-orange-100"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveFoodItem(item.id)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 transition-all border border-transparent hover:border-rose-100"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Family Dialog Modal */}
      {showFamilyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative border border-gray-100 animate-scaleUp">
            <button
              onClick={() => setShowFamilyModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
            >
              <X size={16} />
            </button>

            <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-1.5">
              <Users size={20} className="text-orange-500" />
              {editingFamily ? "Modify Family Profile" : "Register New Family"}
            </h4>

            <form onSubmit={handleFamilySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 block uppercase">Family Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Family"
                  value={famName}
                  onChange={(e) => setFamName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 block uppercase">4-Digit PIN Code</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 1111"
                  value={famPin}
                  onChange={(e) => setFamPin(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm font-mono font-bold tracking-widest focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 block uppercase">Adults Name List (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul, Priya"
                  value={famAdults}
                  onChange={(e) => setFamAdults(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 block uppercase">Children Name List (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Kabir, Meera"
                  value={famChildren}
                  onChange={(e) => setFamChildren(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 block uppercase">Profile Photo (Optional)</label>
                <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  {famPhoto ? (
                    <div className="relative shrink-0">
                      <img
                        src={famPhoto}
                        alt="Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setFamPhoto("")}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow transition-all active:scale-90"
                        title="Remove image"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-[10px] shrink-0 font-bold">
                      No Photo
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFamPhoto(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">Select an image from your gallery</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-black text-white rounded-2xl text-xs transition-all shadow-md active:scale-95"
              >
                {loading ? "Processing..." : "💾 Save Family Structure"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
