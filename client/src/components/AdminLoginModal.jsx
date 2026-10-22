import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, User, Shield } from 'lucide-react';

const AdminLoginModal = ({ isOpen, onClose }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate authentication delay
        setTimeout(() => {
            if (username === 'admin' && password === 'admin') {
                // Store admin authentication in localStorage
                localStorage.setItem('isAdminAuthenticated', 'true');
                localStorage.setItem('adminLoginTime', new Date().toISOString());

                // Close modal and navigate
                onClose();
                navigate('/admin');
            } else {
                setError('Invalid credentials. Use admin/admin');
                setIsLoading(false);
            }
        }, 800);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-4 border-transparent"
                style={{ borderImage: 'linear-gradient(135deg, #FF9933, #FFFFFF, #138808) 1' }}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>

                {/* Modal Header */}
                <div className="p-8 pb-6">
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-4 bg-gradient-to-br from-brand-saffron to-brand-navy rounded-2xl shadow-lg">
                            <Shield className="w-10 h-10 text-white" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-black text-center text-brand-navy mb-2">
                        Admin Access
                    </h2>
                    <p className="text-center text-gray-600 font-medium">
                        Enter admin credentials to continue
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="px-8 pb-8">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                            <p className="text-red-700 text-sm font-semibold text-center">{error}</p>
                        </div>
                    )}

                    {/* Username Field */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-brand-navy mb-2">
                            Username
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20 outline-none transition-all font-medium"
                                placeholder="Enter username"
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-brand-navy mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20 outline-none transition-all font-medium"
                                placeholder="Enter password"
                                required
                            />
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800 text-center font-medium">
                            <span className="font-bold">Default Credentials:</span> admin / admin
                        </p>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-brand-saffron via-brand-navy to-brand-green text-white font-bold rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                Authenticating...
                            </div>
                        ) : (
                            'Login to Admin Panel'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="px-8 pb-6">
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-4"></div>
                    <p className="text-xs text-gray-500 text-center font-medium">
                        🔒 Secure Admin Authentication • Mumbai Rail System
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginModal;
