/**
 * NAVBAR COMPONENT
 * A reusable navigation bar that handles the global layout:
 * - Logo: Always on the far left.
 * - Navigation: All links and profile icons are aligned to the far right.
 * - Responsive: Hides links on mobile (hidden) and shows them on medium screens (md:flex).
 */
import React from 'react';
import { Link } from "react-router";
import { useAuth } from "../auth-context";

// NAVIGATION DICTIONARY
// This maps user states to the specific text links they should see.
const NAV_CONFIG = {
    guest: [
        { label: "Login", to: "/login" },
        { label: "Sign Up", to: "/signup" },
    ],
    recruiter: [
        { label: "WatchLists", to: "/Watchlists"},
        { label: "Discover", to: "/Discover"},
    ],
};

const Navbar = () => {
    const { user, profile } = useAuth();
    
    // Choose the menu based on whether the user is logged in or not.
    const roleKey = !user ? 'guest' : 'recruiter';
    const navLinks = NAV_CONFIG[roleKey];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-black">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
                
                <Link to={user ? "/dashboard" : "/login"} className="flex items-center">
                    <img src="/images/logo-aithelite.svg" alt="Athelite Logo" className="h-8 w-auto" />
                </Link>

                <nav className="hidden items-center gap-8 md:flex">
                    {navLinks.map((link) => (
                        <Link 
                            key={link.label} 
                            to={link.to} 
                            className="text-sm font-medium text-white/80 transition hover:text-white"
                        >
                            {link.label}
                        </Link>
                    ))}
                    {user && (
                        <Link to="/profile" className="flex items-center text-white/80 hover:text-white transition ml-2">
                            <div className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center bg-white/5 overflow-hidden hover:border-white/40 transition-colors">
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className="h-5 w-5" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                                    />
                                </svg>
                            </div>
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Navbar;
