import React from 'react';
import { Link } from 'react-router-dom';

const AuthPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-brand-saffron relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-green/20 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-saffron/20 rounded-full blur-2xl"></div>
                <h2 className="text-3xl font-bold text-center text-brand-dark mb-2">Welcome Back</h2>
                <p className="text-center text-gray-500 mb-8">Sign in to manage your daily commute</p>

                <form className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                        <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" placeholder="+91 98765 43210" />
                    </div>

                    <button type="button" className="w-full bg-brand-blue text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition-all shadow-lg hover:shadow-blue-900/30">
                        Get OTP
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        Don't have an account? <Link to="/signup" className="text-brand-orange font-semibold hover:underline">Sign up</Link>
                    </p>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <Link to="/admin" className="text-xs text-gray-400 hover:text-gray-600">Admin Login</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
