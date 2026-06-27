import React, { useState } from "react";
import { Family } from "../types";
import { ShieldAlert, AlertTriangle } from "lucide-react";

interface AdminLoginProps {
  onLoginSuccess: (family: Family) => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handlePinInput = (num: string) => {
    if (pin.length < 4) {
      setPin(pin + num);
      setError("");
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = async () => {
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
        body: JSON.stringify({ familyId: "admin", pin }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Login failed");
      }

      onLoginSuccess(result.family);
    } catch (err: any) {
      setError(err.message || "Invalid PIN. Please try again.");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when PIN reaches 4 digits
  React.useEffect(() => {
    if (pin.length === 4) {
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
          <div className="inline-flex p-3 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-150 mb-3">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-800">
            Admin Access
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Enter your admin PIN to continue
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Entering Area */}
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Enter 4-digit Admin PIN
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

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs text-gray-400 hover:text-orange-500 font-semibold transition-colors"
          >
            ← Back to Family Login
          </a>
        </div>
      </div>
    </div>
  );
}
