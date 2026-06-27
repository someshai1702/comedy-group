import React, { useState } from "react";
import { Family } from "../types";
import { Lock, Users, AlertTriangle } from "lucide-react";

interface LoginScreenProps {
  families: Family[];
  onLoginSuccess: (family: Family) => void;
}

export default function LoginScreen({ families, onLoginSuccess }: LoginScreenProps) {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const selectedFamily = families.find((f) => f.id === selectedFamilyId);

  // --- Change PIN State ---
  const [showChangePinForm, setShowChangePinForm] = useState<boolean>(false);
  const [changePinFamilyId, setChangePinFamilyId] = useState<string>("");
  const [oldPin, setOldPin] = useState<string>("");
  const [newPin, setNewPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [changePinLoading, setChangePinLoading] = useState<boolean>(false);
  const [changePinError, setChangePinError] = useState<string>("");
  const [changePinSuccess, setChangePinSuccess] = useState<string>("");

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePinFamilyId || !oldPin || !newPin || !confirmPin) {
      setChangePinError("Please fill out all fields.");
      return;
    }
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setChangePinError("New PIN must be a 4-digit number.");
      return;
    }
    if (newPin !== confirmPin) {
      setChangePinError("New PIN and confirmation do not match.");
      return;
    }

    setChangePinLoading(true);
    setChangePinError("");
    setChangePinSuccess("");

    try {
      const res = await fetch(`/api/families/${changePinFamilyId}/change-pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPin, newPin })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update PIN");
      }
      setChangePinSuccess("PIN updated successfully! You can now log in.");
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
      setTimeout(() => {
        setShowChangePinForm(false);
        setChangePinFamilyId("");
        setChangePinSuccess("");
      }, 2500);
    } catch (err: any) {
      setChangePinError(err.message || "Failed to change PIN code.");
    } finally {
      setChangePinLoading(false);
    }
  };

  const handlePinInput = (num: string) => {
    if (pin.length < 4) {
      setPin(pin + num);
      setError("");
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFamilyId) {
      setError("Please select your family first.");
      return;
    }
    if (pin.length !== 4) {
      setError("Please enter a 4-digit PIN.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId: selectedFamilyId, pin }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Login failed");
      }

      onLoginSuccess(result.family);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your PIN.");
      setPin(""); // Reset PIN on error
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when PIN reaches 4 digits
  React.useEffect(() => {
    if (pin.length === 4 && selectedFamilyId) {
      handleSubmit();
    }
  }, [pin]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden bg-[#fafafa]">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-6 shadow-xl relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-150 mb-3 animate-bounce">
            <Users size={28} />
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">
            Comedy Group
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Private Family Dinner & Party Planner
          </p>
        </div>

        {showChangePinForm ? (
          <form onSubmit={handleChangePinSubmit} className="space-y-4">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-1.5">
              🔑 Change Login PIN
            </h2>
            <p className="text-xs text-gray-400 font-semibold">
              Select your family and verify your current PIN code to update it.
            </p>

            {changePinSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold">
                {changePinSuccess}
              </div>
            )}

            {changePinError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold">
                {changePinError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase block">Family Name</label>
              <select
                value={changePinFamilyId}
                onChange={(e) => setChangePinFamilyId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:border-orange-500 focus:outline-none font-bold"
              >
                <option value="">-- Choose Your Family --</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase block">Current PIN</label>
              <input
                type="password"
                maxLength={4}
                placeholder="Current 4-digit PIN"
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 font-bold font-mono tracking-widest text-center text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase block">New PIN</label>
              <input
                type="password"
                maxLength={4}
                placeholder="New 4-digit PIN"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 font-bold font-mono tracking-widest text-center text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase block">Confirm New PIN</label>
              <input
                type="password"
                maxLength={4}
                placeholder="Confirm new 4-digit PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 font-bold font-mono tracking-widest text-center text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={changePinLoading}
                className="flex-1 py-3 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 text-orange-600 border border-orange-200 font-black rounded-2xl text-xs transition-all shadow-md active:scale-95"
              >
                {changePinLoading ? "Updating..." : "💾 Update PIN"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowChangePinForm(false);
                  setChangePinFamilyId("");
                  setOldPin("");
                  setNewPin("");
                  setConfirmPin("");
                  setChangePinError("");
                  setChangePinSuccess("");
                }}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black rounded-2xl text-xs transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-center gap-2">
                <AlertTriangle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Family Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 tracking-wider uppercase block">
                  Select Your Family
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {families.map((fam) => {
                    const isSelected = fam.id === selectedFamilyId;
                    return (
                      <button
                        key={fam.id}
                        type="button"
                        onClick={() => {
                          setSelectedFamilyId(fam.id);
                          setPin("");
                          setError("");
                        }}
                        className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? "bg-orange-50 border-orange-200 shadow-sm font-black"
                            : "bg-white border-gray-100 hover:bg-gray-50"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-black text-sm">
                          {fam.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-gray-800 truncate">
                            {fam.name}
                          </div>
                          <div className="text-[10px] text-gray-400 font-semibold uppercase">
                            {fam.adults.length} Ad, {fam.children.length} Ch
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PIN Entering Area */}
              {selectedFamily && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      Enter 4-digit PIN for <span className="text-orange-600 font-bold">{selectedFamily.name}</span>
                    </p>
                    {/* Dots indicator */}
                    <div className="flex justify-center gap-4 mt-3">
                      {[0, 1, 2, 3].map((idx) => (
                        <div
                          key={idx}
                          className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                            idx < pin.length
                              ? "bg-orange-500 border-orange-400 scale-125 shadow-sm shadow-orange-100"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Pinpad Keyboard */}
                  <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto mt-4">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handlePinInput(num)}
                        disabled={loading}
                        className="aspect-square flex items-center justify-center text-lg font-bold rounded-2xl bg-white border border-gray-150 hover:bg-gray-50 active:scale-95 transition-all text-gray-800 shadow-sm"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPin("")}
                      disabled={loading}
                      className="text-xs font-bold rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 active:scale-95 transition-all text-gray-500 flex items-center justify-center"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePinInput("0")}
                      disabled={loading}
                      className="aspect-square flex items-center justify-center text-lg font-bold rounded-2xl bg-white border border-gray-150 hover:bg-gray-50 active:scale-95 transition-all text-gray-800 shadow-sm"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      disabled={loading}
                      className="aspect-square flex items-center justify-center text-sm font-bold rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 active:scale-95 transition-all text-gray-500"
                    >
                      ⌫
                    </button>
                  </div>
                </div>
              )}
            </form>
          </>
        )}


      </div>
    </div>
  );
}
