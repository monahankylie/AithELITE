/**
 * DASHBOARD PAGE
 * The main landing page for authenticated recruiters.
 */
import React from 'react';
import PageLayout from '../components/page-layout';
import { useAuth } from "../auth-context";

const DashboardPage = () => {
    const { profile } = useAuth();
    const userName = profile?.firstName || "Recruiter";

    return (
        <PageLayout title={`Welcome back, ${userName}!`}>
            <div className="mx-auto max-w-6xl px-6 pb-20">
                {/* Dashboard widgets and stats will go here */}
                <div className="rounded-3xl border border-black/5 bg-gray-50/50 p-12 text-center">
                    <p className="text-sm text-black/40">Your recruiting activity will appear here.</p>
                </div>
            </div>
        </PageLayout>
    );
};

export default DashboardPage;
