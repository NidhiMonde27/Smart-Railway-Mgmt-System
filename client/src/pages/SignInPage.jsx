import React, { useState } from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Train } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLoginModal from '../components/AdminLoginModal';

const SignInPage = () => {
    const [showAdminModal, setShowAdminModal] = useState(false);
    return (
        <div className="min-h-screen flex flex-col font-sans relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-green-50"></div>

            {/* Ashoka Chakra Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 border-[30px] border-brand-navy/5 rounded-full animate-spin-slow"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 border-[25px] border-brand-saffron/5 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '30s' }}></div>

            {/* Tricolor Accent Lines */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-saffron via-white to-brand-green"></div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-green via-white to-brand-saffron"></div>

            {/* Header */}
            <header className="relative z-10 p-6 flex justify-between items-center">
                <Link to="/" className="flex items-center space-x-3 group w-fit">
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
                        <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Republic Day Edition</span>
                    </div>
                </Link>

                {/* Admin Panel Button */}
                <button
                    onClick={() => setShowAdminModal(true)}
                    className="group relative px-6 py-3 bg-gradient-to-r from-brand-saffron via-brand-navy to-brand-green rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <span className="relative text-white font-bold text-sm tracking-wider flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                        </svg>
                        ADMIN PANEL
                    </span>
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4 relative z-10">
                <div className="w-full max-w-md">
                    {/* Welcome Banner */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-brand-navy/5 border border-brand-navy/10 text-brand-navy text-xs font-bold mb-6 uppercase tracking-wider animate-pulse">
                            <span className="w-2 h-2 bg-brand-saffron rounded-full mr-2"></span>
                            Secure Digital Railway Portal
                            <span className="w-2 h-2 bg-brand-green rounded-full ml-2"></span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-3">
                            Welcome to<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-saffron via-brand-navy to-brand-green">
                                Smart Rail Mumbai
                            </span>
                        </h1>
                        <p className="text-gray-600 text-lg font-medium">
                            Sign in to access your digital railway experience
                        </p>
                    </div>

                    {/* Clerk Sign In Component with Custom Styling */}
                    <div className="relative">
                        {/* Decorative Card Background */}
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-xl rounded-3xl border-4 border-transparent shadow-2xl"
                            style={{ borderImage: 'linear-gradient(135deg, #FF9933, #FFFFFF, #138808) 1' }}>
                        </div>

                        {/* Sign In Form Container */}
                        <div className="relative p-8 rounded-3xl">
                            <SignIn
                                appearance={{
                                    elements: {
                                        rootBox: "w-full",
                                        card: "bg-transparent shadow-none w-full",
                                        headerTitle: "text-2xl font-bold text-brand-navy",
                                        headerSubtitle: "text-gray-600",
                                        socialButtonsBlockButton: "bg-white border-2 border-gray-200 hover:border-brand-navy transition-all font-semibold",
                                        formButtonPrimary: "bg-gradient-to-r from-brand-navy to-blue-900 hover:from-blue-900 hover:to-brand-navy text-white font-bold shadow-lg hover:shadow-xl transition-all",
                                        footerActionLink: "text-brand-saffron hover:text-brand-navy font-semibold",
                                        formFieldInput: "border-2 border-gray-200 focus:border-brand-navy rounded-lg",
                                        identityPreviewEditButton: "text-brand-navy hover:text-brand-saffron",
                                        formHeaderTitle: "text-brand-navy font-bold",
                                        dividerLine: "bg-gray-200",
                                        dividerText: "text-gray-500 font-medium",
                                        otpCodeFieldInput: "border-2 border-gray-200 focus:border-brand-saffron rounded-lg font-bold text-xl"
                                    }
                                }}
                                redirectUrl="/dashboard"
                                signUpUrl="/sign-up"
                            />
                        </div>
                    </div>

                    {/* Trust Badges */}
                    <div className="mt-8 flex items-center justify-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="India" className="w-5 h-5" />
                            </div>
                            <span className="font-medium">Government of India</span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <span className="font-medium">🔒 Secure & Encrypted</span>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 p-6 text-center text-sm text-gray-500">
                <p>© 2026 Ministry of Railways & MMRDA • Digital India Initiative</p>
            </footer>

            {/* Admin Login Modal */}
            <AdminLoginModal
                isOpen={showAdminModal}
                onClose={() => setShowAdminModal(false)}
            />
        </div>
    );
};

export default SignInPage;
