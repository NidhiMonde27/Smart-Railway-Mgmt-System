import React from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const { isSignedIn, isLoaded } = useAuth();

    // Wait for Clerk to load
    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-green-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-brand-navy border-t-brand-saffron rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-brand-navy font-semibold">Loading Smart Rail Mumbai...</p>
                </div>
            </div>
        );
    }

    // Redirect to sign-in if not authenticated
    if (!isSignedIn) {
        return <Navigate to="/sign-in" replace />;
    }

    return children;
};

export default ProtectedRoute;
