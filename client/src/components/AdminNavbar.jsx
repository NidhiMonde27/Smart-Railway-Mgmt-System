import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Train, LogOut, Shield, Activity } from 'lucide-react';

const AdminNavbar = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        // Clear admin authentication
        localStorage.removeItem('isAdminAuthenticated');
        localStorage.removeItem('adminLoginTime');
        // Redirect to login
        navigate('/login');
    };

    return (
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b-4 border-b-transparent shadow-lg"
            style={{ borderImage: 'linear-gradient(to right, #FF9933, #FFFFFF, #138808) 1' }}>
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
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
                            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Admin Control Center</span>
                        </div>
                    </Link>

                    {/* Right Side - Admin Info & Logout */}
                    <div className="flex items-center gap-4">
                        {/* Admin Badge */}
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-navy to-blue-900 rounded-xl shadow-md">
                            <Shield className="w-5 h-5 text-white" />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white/80">Logged in as</span>
                                <span className="text-sm font-black text-white">Administrator</span>
                            </div>
                        </div>

                        {/* System Status */}
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-green-50 border-2 border-green-300 rounded-xl">
                            <Activity className="w-4 h-4 text-green-600 animate-pulse" />
                            <span className="text-xs font-bold text-green-700">System Active</span>
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="group relative px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-700 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:scale-105"
                        >
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                            <span className="relative text-white font-bold text-sm flex items-center gap-2">
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default AdminNavbar;
