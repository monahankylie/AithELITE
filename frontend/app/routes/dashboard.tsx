/**
 * DASHBOARD PAGE
 * The main landing page for authenticated recruiters.
 */
import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, query } from "firebase/firestore";
import PageLayout from '../components/page-layout';
import { useAuth } from "../auth-context";
import DashboardCard from "../components/dashboard-card";
import { db } from "../../firebase-config";

type DashboardPlayer = {
    id: string;
    name: string;
    sport: string;
    position: string;
    school: string;
    gradYear: number | string;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    avatarUrl?: string;
};

function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

const DashboardPage = () => {
    const { profile } = useAuth();
    const userName = profile?.firstName || "Recruiter";
    const [players, setPlayers] = useState<DashboardPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db) return;

        async function fetchPlayers() {
            try {
                const snap = await getDocs(query(collection(db, "athletes"), limit(40)));
                const picked = shuffle(snap.docs).slice(0, 24);

                const rows = await Promise.all(
                    picked.map(async (athleteDoc): Promise<DashboardPlayer | null> => {
                        const data = athleteDoc.data();
                        let position = "";
                        let pointsPerGame: number | undefined;
                        let reboundsPerGame: number | undefined;
                        let assistsPerGame: number | undefined;

                        try {
                            const recordSnap = await getDoc(doc(db, "athletes", athleteDoc.id, "sports_records", "bball_record"));
                            if (recordSnap.exists()) {
                                const record = recordSnap.data();
                                position = record.position ?? "";
                                pointsPerGame = record.averages?.ppg;
                                reboundsPerGame = record.averages?.rpg;
                                assistsPerGame = record.averages?.apg;
                            }
                        } catch {
                            // Some athletes will not have a basketball record.
                        }

                        if (pointsPerGame == null || reboundsPerGame == null || assistsPerGame == null) {
                            return null;
                        }

                        return {
                            id: athleteDoc.id,
                            name: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
                            sport: data.sport ?? "Basketball",
                            position,
                            school: data.school ?? "",
                            gradYear: data.gradYear ?? "",
                            pointsPerGame,
                            reboundsPerGame,
                            assistsPerGame,
                            avatarUrl: data.imageUrl || undefined,
                        };
                    }),
                );

                const validPlayers = rows.filter((player): player is DashboardPlayer => player !== null);
                setPlayers(validPlayers.slice(0, 10));
            } catch (error) {
                console.error("Failed to load dashboard athletes:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchPlayers();
    }, []);

    return (
        <PageLayout title={`Welcome back, ${userName}!`}>
            <div className="mx-auto max-w-6xl px-6 pb-20">
                <div className="space-y-8">
                    <div className="rounded-3xl border border-black/5 bg-gray-50/50 p-12 text-center">
                        <p className="text-sm text-black/40">Your recruiting activity will appear here.</p>
                    </div>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard Players</h2>
                                <p className="text-sm text-slate-500">Live athlete statatsics dashboard</p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-[28px] border border-slate-300 bg-[#ececec]">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-black/10 border-t-black" />
                                </div>
                            ) : players.length === 0 ? (
                                <p className="px-8 py-10 text-center text-sm text-slate-500">No athletes with basketball averages were found.</p>
                            ) : (
                                players.map((player, index) => (
                                    <div key={player.id} className={index === 0 ? "" : "border-t border-white/80"}>
                                        <DashboardCard {...player} />
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </PageLayout>
    );
};

export default DashboardPage;
