/**
 * PAGE LAYOUT COMPONENT
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import Navbar from './navbar';
import Footer from './footer';
import { useAuth } from '../auth-context';

interface PageLayoutProps {
    children: React.ReactNode;
    requireAuth?: boolean;
    title?: string;
    subtitle?: React.ReactNode;
    description?: string;
    variant?: 'default' | 'hero';
    actions?: React.ReactNode;
}

const PageLayout = ({ 
    children, 
    requireAuth = false, 
    title, 
    subtitle,
    description, 
    variant = 'default',
    actions 
}: PageLayoutProps) => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && requireAuth && !user) {
            navigate('/login', { replace: true });
        }
    }, [loading, requireAuth, user, navigate]);

    if (loading || (requireAuth && !user)) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse text-sm font-black uppercase tracking-widest text-[#00599c]/40">
                    AithELITE
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            
            <main className="flex-1">
                {title && (
                    <header className="mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-24 py-6 md:py-10">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="min-w-0 flex-1">
                                <h1 className="truncate text-2xl font-black tracking-tight text-slate-900 leading-[1.1] sm:text-3xl md:text-4xl uppercase">
                                    {title}
                                    {subtitle && (
                                        <>
                                            <span className="text-[#00599c] ml-3">{subtitle}</span>
                                        </>
                                    )}
                                </h1>
                                {description && (
                                    <p className="mt-1.5 text-base font-medium text-[#00599c]/70 max-w-2xl">
                                        {description}
                                    </p>
                                )}
                            </div>
                            {actions && <div className="flex shrink-0 items-center gap-4">{actions}</div>}
                        </div>
                    </header>
                )}
                {children}
            </main>

            <Footer />
        </div>
    );
};

export default PageLayout;
