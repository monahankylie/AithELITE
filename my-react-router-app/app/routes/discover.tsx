/**
 * DISCOVER PAGE
 * A place for recruiters to find new athletes.
 */
import React from 'react';
import PageLayout from '../components/page-layout';
import { useAuth } from "../auth-context";

const DiscoverPage = () => {
    const { profile } = useAuth();
    const userName = profile?.firstName || "Recruiter";

    return (
        <PageLayout title="Discover Athletes" description="Find your next star recruit using our performance analytics.">
            <div className="mx-auto max-w-6xl px-6 pb-20">
                <div className="rounded-3xl border border-black/5 bg-gray-50/50 p-12 text-center">
                    <p className="text-sm text-black/40">Search and filter tools will appear here.</p>
                </div>
            </div>
        </PageLayout>
    );
};

export default DiscoverPage;
