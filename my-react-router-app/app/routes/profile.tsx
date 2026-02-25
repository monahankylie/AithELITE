/**
 * PROFILE PAGE
 * A page for authenticated users to view their account information.
 */
import React from 'react';
import PageLayout from '../components/page-layout';
import { useAuth } from "../auth-context";

const ProfilePage = () => {
    const { profile } = useAuth();
    const userName = profile?.firstName || "User";

    return (
        <PageLayout title="User Profile" description={`Manage your account settings, ${userName}.`}>
            <div className="mx-auto max-w-6xl px-6 pb-20">
                <div className="rounded-3xl border border-black/5 bg-gray-50/50 p-12 text-center">
                    <p className="text-sm text-black/40">Profile settings are coming soon.</p>
                </div>
            </div>
        </PageLayout>
    );
};

export default ProfilePage;
