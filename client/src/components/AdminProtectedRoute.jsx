import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminProtectedRoute = ({ children }) => {
    const isAdminAuthenticated = localStorage.getItem('isAdminAuthenticated') === 'true';

    if (!isAdminAuthenticated) {
        // Redirect to login page if not authenticated as admin
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default AdminProtectedRoute;
