/**
 * PAGE LAYOUT COMPONENT
 * A universal wrapper for all pages that provides:
 * - A consistent Navbar and Footer.
 * - Automatic handling of the authentication loading state.
 * - A standardized page structure (min-height, background, etc.).
 */
import React from 'react';
import Navbar from './navbar';
import Footer from './footer';
import { useAuth } from '../auth-context';

interface PageLayoutProps {
    children: React.ReactNode;
    requireAuth?: boolean;
    title?: string;
    description?: string;
}

const PageLayout = ({ children, requireAuth = false, title, description }: PageLayoutProps) => {
    const { user, loading, profile } = useAuth();

    // Handle initial auth loading state globally
    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-pulse text-sm font-medium text-black/40">Loading AithELITE...</div>
            </div>
        );
    }

    // Optional: Redirect or show access denied if page requires auth and user isn't logged in
    // For now, we'll just render the children, but this is a great place for protection logic.

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <Navbar />
            
            <main className="flex-1">
                {(title || description) && (
                    <header className="mx-auto max-w-6xl px-6 py-8 md:py-12">
                        {title && <h1 className="text-3xl font-extrabold tracking-tight text-black sm:text-4xl">{title}</h1>}
                        {description && <p className="mt-3 text-base text-black/60">{description}</p>}
                    </header>
                )}
                {children}
            </main>

            <Footer />
        </div>
    );
};

export default PageLayout;
