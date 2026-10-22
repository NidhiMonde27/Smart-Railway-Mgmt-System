import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { User, Mail, Phone, CheckCircle, AlertCircle, Save, Loader, ArrowLeft, ShieldCheck } from "lucide-react";
import { normalizePhoneNumber } from "../utils/phoneUtils";

const ManageProfile = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const navigate = useNavigate();

  const [mobileInput, setMobileInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [validationError, setValidationError] = useState("");

  // Load saved mobile number from Clerk user's unsafeMetadata on load or when user object populates
  useEffect(() => {
    if (user) {
      const savedMobile =
        user.unsafeMetadata?.mobileNumber ||
        user.unsafeMetadata?.phoneNumber ||
        user.primaryPhoneNumber?.phoneNumber ||
        "";
      setMobileInput(savedMobile);
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveSuccess("");
    setSaveError("");
    setValidationError("");

    const trimmed = mobileInput.trim();
    let normalizedPhone = "";

    if (trimmed !== "") {
      const validation = normalizePhoneNumber(trimmed);
      if (!validation.isValid) {
        setValidationError(validation.error);
        return;
      }
      normalizedPhone = validation.normalized;
    }

    setIsSaving(true);

    try {
      if (!user) {
        throw new Error("No authenticated user session found.");
      }

      // Store mobile number directly on the authenticated Clerk user's unsafeMetadata
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          mobileNumber: normalizedPhone,
        },
      });

      // Update local state with normalized format
      setMobileInput(normalizedPhone);
      setSaveSuccess("Profile updated successfully.");
    } catch (err) {
      console.error("Clerk user metadata update error:", err);
      setSaveError("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = user
    ? user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Passenger"
    : "Passenger";

  const registeredEmail = user
    ? user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || ""
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/40 via-white to-green-50/40 font-sans flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-brand-navy mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Manage Profile
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              View your account details and update your mobile number for SMS alerts.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-800 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Clerk Authenticated Profile</span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Card Header Banner */}
          <div className="bg-gradient-to-r from-brand-saffron via-brand-navy to-brand-green p-1">
            <div className="bg-white p-6 sm:p-8">
              {!isLoaded ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 animate-spin text-brand-navy" />
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-brand-navy" /> Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      disabled
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-semibold cursor-not-allowed text-sm"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Full name associated with your authenticated Clerk account.
                    </p>
                  </div>

                  {/* Registered Email */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-brand-saffron" /> Registered Email
                    </label>
                    <input
                      type="email"
                      value={registeredEmail}
                      disabled
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-semibold cursor-not-allowed text-sm"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Railway email alerts will be sent automatically to this registered address.
                    </p>
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-brand-green" /> Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={mobileInput}
                      onChange={(e) => {
                        setMobileInput(e.target.value);
                        if (validationError) setValidationError("");
                        if (saveSuccess) setSaveSuccess("");
                        if (saveError) setSaveError("");
                      }}
                      placeholder="9876543210 or +919876543210"
                      className={`w-full px-4 py-3 bg-white border rounded-xl font-semibold text-gray-900 text-sm focus:outline-none focus:ring-2 ${
                        validationError
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-brand-navy"
                      }`}
                    />
                    {validationError ? (
                      <p className="text-xs font-semibold text-red-600 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {validationError}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-500 mt-1">
                        Enter your 10-digit Indian mobile number to receive instant SMS alerts for journey disruptions.
                      </p>
                    )}
                  </div>

                  {/* Status Banners */}
                  {saveSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-bold flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span>{saveSuccess}</span>
                    </div>
                  )}

                  {saveError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-bold flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <span>{saveError}</span>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" /> Saving Profile...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" /> Save Profile
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManageProfile;
