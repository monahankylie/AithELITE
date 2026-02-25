/**
 * PROFILE PAGE
 * A placeholder page for authenticated users to view their account information.
 * It uses the global AuthContext to access the user's profile data.
 */
import React from 'react';
import Navbar from '../components/navbar';
import { useAuth } from "../auth-context";

const ProfilePage = () => {
    const { profile, loading } = useAuth();
    const userName = profile?.firstName || "User";

    if (loading) {
        return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <header className="px-8 py-8 text-left">
                <h1 className="text-3xl font-bold text-black">User Profile: {userName}</h1>
                <p className="mt-2 text-black/60">Welcome to your profile settings page. This is a placeholder.</p>
            </header>

            <main className="px-8">
                {/* Profile details will go here */}
            </main>

            <footer className="mt-16 pt-8 border-t border-black/10 text-center text-sm text-black/60">
                <p>&copy; {new Date().getFullYear()} Aithelite. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default ProfilePage;
