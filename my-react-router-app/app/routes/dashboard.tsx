// Welcome to your first TSX file!
// TSX is a syntax extension for TypeScript, based on JSX (used with JavaScript).
// It allows you to write HTML-like code directly within your TypeScript files.
// This is what makes React and other similar frameworks so powerful for building user interfaces.

// --- IMPORT STATEMENTS ---
// 'import' is how we bring in code from other files or libraries.
// Here, we are importing 'React' and 'useState' from the 'react' library.
// - 'React' is the core library for creating and managing components.
// - 'useState' is a special function from React called a "Hook" that lets us add state (data that can change over time) to our components.
/**
 * DASHBOARD PAGE
 * The main landing page for authenticated recruiters.
 * It displays a personalized welcome message using data from the global AuthContext.
 */
import React from 'react';
import Navbar from '../components/navbar';
import { useAuth } from "../auth-context";

const DashboardPage = () => {

    const { profile, loading } = useAuth();
    const userName = profile?.firstName || "USER";

    if (loading) {
        return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <header className="px-8 py-8 text-left">
                <h1 className="text-3xl font-bold text-black">
                    Welcome to your Dashboard, {userName}!
                </h1>
            </header>


            <main className="px-8">

            </main>

            <footer className="mt-16 pt-8 border-t border-black/10 text-center text-sm text-black/60">
                <p>&copy; {new Date().getFullYear()} Aithelite. All rights reserved.</p>
            
            </footer>
        </div>
    );
};

export default DashboardPage;
