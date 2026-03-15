/**
 * DASHBOARD PAGE
 * The main landing page for authenticated recruiters.
 */
import React, { useEffect, useState } from 'react';
import PageLayout from '../components/page-layout';
import AthleteList from "../components/athlete-list";
import { useAuth } from "../auth-context";
import { athleteService, type BasketballPlayer } from "../lib/athlete-service";

const DashboardPage = () => {
    const { profile } = useAuth();
    const userName = profile?.firstName || "Recruiter";
    const [players, setPlayers] = useState<BasketballPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchInitial() {
            const cached = athleteService.getCache('dashboard');
            if (cached) {
                setPlayers(cached);
                setLoading(false);
                return;
            }

            try {
                const { players: initialPlayers } = await athleteService.fetchBasketballPlayers(10);
                setPlayers(initialPlayers);
                athleteService.setCache('dashboard', initialPlayers);
            } catch (error) {
                console.error("Dashboard athlete load failed:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchInitial();
    }, []);

    return (
        <PageLayout 
            title="Welcome back," 
            subtitle={userName}
            description="Your recruiting activity and top prospects."
            variant="hero"
        >
            <div className="pb-20">
                <div className="space-y-16">
                    <section className="space-y-6 px-4 sm:px-6 md:px-12 lg:px-24">
                        <div className="px-2">
                            <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase">
                                Recent <span className="text-[#00599c]">Activity</span>
                            </h2>
                        </div>

                        <div className="rounded-[40px] border border-black/5 bg-white p-16 text-center shadow-sm">
                            <p className="text-sm font-black uppercase tracking-widest text-black/20">
                                Your recruiting activity will appear here.
                            </p>
                        </div>
                    </section>

                    <section className="space-y-8">
                        <div className="px-4 sm:px-6 md:px-12 lg:px-24 mb-6">
                            <div className="px-2">
                                <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase">
                                    Top <span className="text-[#00599c]">Prospects</span>
                                </h2>
                            </div>
                        </div>

                        <div className="px-4 sm:px-6 md:px-12 lg:px-24">
                            <AthleteList 
                                players={players}
                                loading={loading}
                                loadingMessage="Fetching Prospect Data"
                            />
                        </div>
                    </section>
                </div>
            </div>
        </PageLayout>
    );
};

export default DashboardPage;
