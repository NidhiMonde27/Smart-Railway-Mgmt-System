import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Train, Bell, AlertTriangle, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth, useUser, UserButton, SignedIn, SignedOut } from '@clerk/clerk-react';
import { checkJourneyDisruption, triggerEmailNotification } from '../utils/disruptionService';
import { subscribeToWebPush } from '../utils/pushService';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isSignedIn } = useAuth();
    const { user } = useUser();
    const [showNotifications, setShowNotifications] = useState(false);
    const [activeDisruptionInfo, setActiveDisruptionInfo] = useState(null);

    const [emailSending, setEmailSending] = useState(false);
    const [emailStatus, setEmailStatus] = useState(""); // "" | "success" | "error"
    const [emailErrorMsg, setEmailErrorMsg] = useState("");

    const [pushSending, setPushSending] = useState(false);
    const [pushStatus, setPushStatus] = useState(""); // "" | "success" | "error"
    const [pushErrorMsg, setPushErrorMsg] = useState("");

    const source = localStorage.getItem("selected_source") || "Thane";
    const destination = localStorage.getItem("selected_destination") || "Dadar";

    useEffect(() => {
        if (!isSignedIn || !user) return;
        let isMounted = true;
        checkJourneyDisruption(source, destination).then((res) => {
            if (isMounted) {
                setActiveDisruptionInfo(res);
            }
        });
        return () => { isMounted = false; };
    }, [isSignedIn, user, source, destination]);

    const handleSendMessageClick = async () => {
        setEmailStatus("");
        setEmailErrorMsg("");
        const registeredEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
        
        setEmailSending(true);
        try {
            const res = await triggerEmailNotification(source, destination, registeredEmail, user?.id);
            if (res.success) {
                setEmailStatus("success");
            } else {
                setEmailStatus("error");
                setEmailErrorMsg(res.error || "Unable to send email alert. Please try again.");
            }
        } catch (e) {
            console.error("Email send exception:", e);
            setEmailStatus("error");
            setEmailErrorMsg("Unable to send email alert. Please try again.");
        } finally {
            setEmailSending(false);
        }
    };

    const handleEnablePushClick = async () => {
        setPushStatus("");
        setPushErrorMsg("");
        setPushSending(true);

        try {
            const res = await subscribeToWebPush(user?.id);
            if (res.success) {
                setPushStatus("success");
            } else {
                setPushStatus("error");
                setPushErrorMsg(res.error || "Unable to enable phone alerts.");
            }
        } catch (e) {
            console.error("Push subscription exception:", e);
            setPushStatus("error");
            setPushErrorMsg("Unable to enable phone alerts. Please try again.");
        } finally {
            setPushSending(false);
        }
    };

    const isActive = (path) => {
        return location.pathname === path ? 'text-brand-saffron bg-brand-navy/5 rounded-lg px-3 py-1' : 'text-gray-700 hover:text-brand-navy hover:bg-gray-50 rounded-lg px-3 py-1';
    };

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b-4 border-b-transparent shadow-sm" style={{ borderImage: 'linear-gradient(to right, #FF9933, #FFFFFF, #138808) 1' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <Link to="/" className="flex items-center space-x-3 group">
                        <div className="relative w-10 h-10 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-2 border-brand-navy animate-spin-slow group-hover:border-brand-saffron transition-colors"></div>
                            <Train className="w-6 h-6 text-brand-navy group-hover:text-brand-saffron transition-colors" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-black tracking-tighter leading-none">
                                <span className="text-brand-saffron">APLI</span>
                                <span className="text-brand-navy mx-1">-</span>
                                <span className="text-brand-green">MUMBAI</span>
                            </span>
                        </div>
                    </Link>

                    <div className="hidden md:flex items-center space-x-4">
                        {isSignedIn && (
                            <>
                                <Link to="/dashboard" className={`font-bold transition-all ${isActive('/dashboard')}`}>Dashboard</Link>
                                <Link to="/map" className={`font-bold transition-all ${isActive('/map')}`}>Live Map</Link>
                                <Link to="/ticketing" className={`font-bold transition-all ${isActive('/ticketing')}`}>Ticketing</Link>
                                <Link to="/coach-crowd" className={`font-bold transition-all ${isActive('/coach-crowd')}`}>Coach Occupancy</Link>
                                <Link to="/live-status" className={`font-bold transition-all ${isActive('/live-status')}`}>Live Status</Link>
                                <Link to="/manage-profile" className={`font-bold transition-all ${isActive('/manage-profile')}`}>Manage Profile</Link>
                            </>
                        )}

                        {/* Show Sign In button when signed out */}
                        <SignedOut>
                            <Link to="/sign-in" className="ml-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-brand-saffron via-brand-white to-brand-green text-brand-navy font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all relative overflow-hidden group">
                                <span className="absolute inset-0 bg-brand-navy opacity-0 group-hover:opacity-10 transition-opacity"></span>
                                <span className="relative text-shadow-sm flex items-center">
                                    Sign In
                                </span>
                            </Link>
                        </SignedOut>

                        {/* Show User Profile & Notifications when signed in */}
                        <SignedIn>
                            <div className="ml-4 flex items-center gap-3 relative">
                                {/* Account-Specific Bell Notification Button */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowNotifications(!showNotifications)}
                                        className="p-2 text-gray-600 hover:text-brand-navy rounded-full hover:bg-gray-100 transition-colors relative cursor-pointer"
                                        aria-label="Account Notifications"
                                    >
                                        <Bell className="w-6 h-6 text-gray-700 hover:text-brand-saffron transition-colors" />
                                        {activeDisruptionInfo?.isAffected && (
                                            <span className="absolute top-1 right-1 w-3 h-3 bg-red-600 rounded-full ring-2 ring-white animate-pulse" />
                                        )}
                                    </button>

                                    {/* Account-Specific Notification Panel */}
                                    {showNotifications && (
                                        <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 text-xs">
                                            <div className="flex items-center justify-between border-b pb-2 mb-3">
                                                <strong className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                                                    <Bell className="w-4 h-4 text-brand-saffron" /> Account Notifications
                                                </strong>
                                                <span className="text-[10px] text-gray-500 font-bold uppercase">
                                                    {user?.firstName ? `${user.firstName}'s Profile` : 'Active Session'}
                                                </span>
                                            </div>

                                            {activeDisruptionInfo?.isAffected ? (
                                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-2">
                                                    <div className="flex items-center gap-1.5 font-extrabold text-red-900">
                                                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                                        <span>
                                                            {(activeDisruptionInfo.affectedDisruption?.title || "Journey Disruption Alert").replace(/^\[TEST\/MOCK EVENT\]\s*/i, "")}
                                                        </span>
                                                    </div>
                                                    <p className="text-red-800 leading-relaxed font-medium text-[11px]">
                                                        {activeDisruptionInfo.affectedDisruption?.message || `Central Line service disruption detected between ${source} and ${destination}.`}
                                                    </p>
                                                    <div className="text-[11px] font-bold text-red-900 bg-red-100/60 p-2 rounded-lg border border-red-200">
                                                        🔄 Alternative route calculated in Live Map
                                                    </div>
                                                    <div className="pt-2 border-t border-red-200 flex items-center gap-2">
                                                        <button
                                                            onClick={handleSendMessageClick}
                                                            disabled={emailSending}
                                                            className="flex-1 py-1.5 px-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-1 disabled:opacity-50 text-[11px] cursor-pointer"
                                                        >
                                                            📩 {emailSending ? "Sending..." : "Send Message"}
                                                        </button>
                                                        <button
                                                            onClick={handleEnablePushClick}
                                                            disabled={pushSending}
                                                            className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-1 disabled:opacity-50 text-[11px] cursor-pointer"
                                                        >
                                                            📲 {pushSending ? "Enabling..." : "Enable Phone Alerts"}
                                                        </button>
                                                    </div>

                                                    {/* Email Feedback Banners */}
                                                    {emailStatus === "success" && (
                                                        <div className="mt-2 text-[10px] font-bold text-green-700 bg-green-50 p-2 rounded-lg border border-green-200 flex items-center gap-1">
                                                            <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                                            <span>✓ Alert Email Sent</span>
                                                        </div>
                                                    )}
                                                    {emailStatus === "error" && (
                                                        <div className="mt-2 text-[10px] font-bold text-red-700 bg-red-100 p-2 rounded-lg border border-red-200 flex items-center gap-1">
                                                            <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                                                            <span>{emailErrorMsg}</span>
                                                        </div>
                                                    )}

                                                    {/* Web Push Feedback Banners */}
                                                    {pushStatus === "success" && (
                                                        <div className="mt-2 text-[10px] font-bold text-green-700 bg-green-50 p-2 rounded-lg border border-green-200 flex items-center gap-1">
                                                            <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                                            <span>✓ Phone Alerts Enabled</span>
                                                        </div>
                                                    )}
                                                    {pushStatus === "error" && (
                                                        <div className="mt-2 text-[10px] font-bold text-red-700 bg-red-100 p-2 rounded-lg border border-red-200 flex items-center gap-1">
                                                            <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                                                            <span>{pushErrorMsg}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-900 text-center font-medium">
                                                    <span>All train services operating normally for your route {source} → {destination}.</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <UserButton
                                    appearance={{
                                        elements: {
                                            avatarBox: "w-10 h-10 border-2 border-brand-navy hover:border-brand-saffron transition-colors",
                                            userButtonPopoverCard: "shadow-2xl",
                                            userButtonPopoverActionButton: "hover:bg-brand-navy/10",
                                            userButtonPopoverActionButton__signOut: "hover:bg-red-50 text-red-600"
                                        }
                                    }}
                                    afterSignOutUrl="/"
                                />
                            </div>
                        </SignedIn>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
