import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PageLayout from "../components/page-layout";
import { useAuth } from "../auth-context";
import { useNotification } from "../notification-context";
import { watchlistService, type UserList } from "../lib/watchlist-service";
import { athleteService } from "../lib/athlete-service";
import type { Athlete, BasketballStatRecord } from "../lib/athlete-types";

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function WatchlistDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [list, setList] = useState<UserList | null>(null);
  const [players, setPlayers] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renameValue, setRenameValue] = useState("");
  const [tagValue, setTagValue] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);

  async function loadList() {
    if (!user || !id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const listData = await watchlistService.fetchListById(user.uid, id);
      setList(listData);

      if (listData) {
        setRenameValue(listData.name);
        setTagValue(listData.tags.join(", "));

        if (listData.playerIds.length > 0) {
          const fetchedPlayers = await athleteService.fetchAthletesByIds(listData.playerIds);
          const ordered = listData.playerIds
            .map((playerId) => fetchedPlayers.find((player) => player.id === playerId))
            .filter((player): player is Athlete => Boolean(player));
          setPlayers(ordered);
        } else {
          setPlayers([]);
        }
      } else {
        setPlayers([]);
      }
    } catch (error) {
      console.error("Failed to load watchlist:", error);
      showNotification("Failed to load watchlist", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, [user, id]);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return players;

    return players.filter((player) => {
      const stats = player.currentStats as BasketballStatRecord | undefined;
      const haystack = [player.name, stats?.school_name, stats?.positions?.join(" "), player.classYear]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [players, search]);

  const selectedPlayerIds = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const compareIds = selectedPlayerIds.length > 0 ? selectedPlayerIds : list?.playerIds ?? [];

  function togglePlayerSelection(playerId: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  async function handleRename() {
    if (!user || !id || !renameValue.trim() || renameValue.trim() === list?.name) return;

    try {
      setBusy(true);
      await watchlistService.renameList(user.uid, id, renameValue);
      showNotification("List renamed", "success");
      await loadList();
    } catch (error) {
      console.error("Failed to rename list:", error);
      showNotification("Could not rename list", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTags() {
    if (!user || !id || !list) return;

    try {
      setBusy(true);
      await watchlistService.updateListTags(user.uid, id, parseTags(tagValue));
      showNotification("Tags updated", "success");
      await loadList();
    } catch (error) {
      console.error("Failed to update tags:", error);
      showNotification("Could not update tags", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemovePlayers(playerIds: string[]) {
    if (!user || !id || playerIds.length === 0) return;
    const confirmation =
      playerIds.length === 1
        ? "Remove this athlete from the list?"
        : `Remove ${playerIds.length} athletes from the list?`;
    if (!window.confirm(confirmation)) return;

    try {
      setBusy(true);
      await watchlistService.removePlayersFromList(user.uid, id, playerIds);
      setSelectedIds(new Set());
      showNotification("Athlete list updated", "success");
      await loadList();
    } catch (error) {
      console.error("Failed to remove players:", error);
      showNotification("Could not remove athletes", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteList() {
    if (!user || !id || !list) return;
    if (!window.confirm(`Delete "${list.name}"? This action cannot be undone.`)) return;

    try {
      setBusy(true);
      await watchlistService.deleteList(user.uid, id);
      showNotification("Watchlist deleted", "success");
      navigate("/watchlists");
    } catch (error) {
      console.error("Failed to delete list:", error);
      showNotification("Could not delete list", "error");
      setBusy(false);
    }
  }

  async function handleFavoriteToggle() {
    if (!user || !id || !list) return;

    try {
      setBusy(true);
      if (list.favorite) {
        await watchlistService.clearFavoriteList(user.uid, id);
        showNotification("Favorite list cleared", "success");
      } else {
        await watchlistService.setFavoriteList(user.uid, id);
        showNotification(`${list.name} is now your favorite list`, "success");
      }
      await loadList();
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      showNotification("Could not update favorite list", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddPlayers(playerIds: string[]) {
    if (!user || !id || playerIds.length === 0) return;

    try {
      setBusy(true);
      const result = await watchlistService.addPlayersToList(user.uid, id, playerIds);
      setShowPicker(false);
      showNotification(
        result.addedCount > 0 ? `${result.addedCount} athlete${result.addedCount === 1 ? "" : "s"} added` : "All selected athletes were already in the list",
        result.addedCount > 0 ? "success" : "error",
      );
      await loadList();
    } catch (error) {
      console.error("Failed to add players:", error);
      showNotification("Could not add athletes", "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PageLayout requireAuth title="Watchlist">
        <div className="flex justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#00599c]" />
        </div>
      </PageLayout>
    );
  }

  if (!list) {
    return (
      <PageLayout requireAuth title="Watchlist Not Found">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="text-slate-500">This watchlist doesn&apos;t exist or you no longer have access to it.</p>
          <Link
            to="/watchlists"
            className="mt-8 inline-flex rounded-[22px] bg-[#00599c] px-6 py-3 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:bg-[#00497f]"
          >
            Back to Watchlists
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      requireAuth
      title={list.name}
      subtitle={`${list.playerIds.length} Athletes`}
      description="Manage your recruiting board, keep the right tags on it, and jump into side-by-side analysis when you are ready."
      variant="hero"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-20 sm:px-6 lg:px-8">
        <section className="grid gap-6">
          <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.35)] sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {list.favorite && <HeaderBadge tone="amber">Favorite List</HeaderBadge>}
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Rename List Name</label>
                <div className="mt-2 flex flex-col gap-3 md:flex-row">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    className="flex-1 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#00599c] focus:bg-white"
                  />
                  <button
                    onClick={handleRename}
                    disabled={busy || !renameValue.trim()}
                    className="rounded-[22px] bg-slate-950 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    Rename
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Add Tags</label>
                <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    type="text"
                    value={tagValue}
                    onChange={(event) => setTagValue(event.target.value)}
                    placeholder="priority, west coast, class of 2027"
                    className="flex-1 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#00599c] focus:bg-white"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveTags}
                      disabled={busy}
                      className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-700 transition hover:border-[#00599c] hover:text-[#00599c]"
                    >
                      Save Tags
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowActions((current) => !current)}
                      aria-label="Toggle list actions"
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                    >
                      <span className="text-lg">⋯</span>
                    </button>
                  </div>
                </div>
                {showActions && (
                  <div className="mt-4 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">List Actions</p>
                    <p className="mt-2 text-sm text-slate-600">Quick actions for this list.</p>
                    <div className="mt-4 grid gap-3">
                      <button
                        onClick={() => setShowPicker(true)}
                        className="rounded-[22px] bg-[#00599c] px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-[#00497f]"
                      >
                        Add Player
                      </button>
                      <button
                        onClick={() => handleRemovePlayers(selectedPlayerIds)}
                        disabled={busy || selectedPlayerIds.length === 0}
                        className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-700 transition hover:border-[#00599c] hover:text-[#00599c] disabled:opacity-45"
                      >
                        Delete Player
                      </button>
                      <button
                        onClick={handleFavoriteToggle}
                        disabled={busy}
                        className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-700 transition hover:border-[#00599c] hover:text-[#00599c]"
                      >
                        {list.favorite ? "Remove Favorite" : "Favorite List"}
                      </button>
                      <button
                        onClick={() => {
                          if (compareIds.length > 0) {
                            navigate(`/analyze?ids=${compareIds.join(",")}`);
                          }
                        }}
                        disabled={compareIds.length === 0}
                        className={`rounded-[22px] px-5 py-4 text-xs font-black uppercase tracking-[0.2em] transition ${
                          compareIds.length > 0 ? "bg-amber-400 text-slate-950 hover:bg-amber-300" : "border border-slate-200 bg-slate-100 text-slate-400"
                        }`}
                      >
                        Compare Athletes
                      </button>
                      <button
                        onClick={handleDeleteList}
                        disabled={busy}
                        className="rounded-[22px] border border-red-300/40 bg-red-500/10 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-red-700 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Delete List
                      </button>
                    </div>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {list.tags.length > 0 ? (
                    list.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">No tags added yet.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#07111f] via-[#0e2950] to-[#00599c] px-6 py-8 text-white shadow-[0_18px_60px_-32px_rgba(15,23,42,0.35)] sm:px-8 sm:py-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-200/80">Athletes</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Search and manage this board.</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Players" value={String(list.playerIds.length)} />
              <MiniStat label="Selected" value={String(selectedPlayerIds.length)} />
              <MiniStat label="Tags" value={String(list.tags.length)} />
              <MiniStat label="Compare" value={compareIds.length > 0 ? String(compareIds.length) : "0"} />
            </div>
          </div>

          <div className="mt-6">
            <div className="relative">
              <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by player, school, class year, or position..."
                className="w-full rounded-[22px] border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#00599c] focus:bg-white"
              />
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => {
                const stats = player.currentStats as BasketballStatRecord | undefined;
                const selected = selectedIds.has(player.id);

                return (
                  <article
                    key={player.id}
                    className={`rounded-[28px] border p-4 transition ${selected ? "border-[#00599c] bg-[#f4f9ff]" : "border-slate-200 bg-slate-50/70"}`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => togglePlayerSelection(player.id)}
                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${selected ? "border-[#00599c] bg-[#00599c]" : "border-slate-300 bg-white"}`}
                        >
                          {selected && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                        </button>

                        {player.image_link ? (
                          <img src={player.image_link} alt={player.name} className="h-14 w-14 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-lg font-black text-slate-500">
                            {player.name.charAt(0)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <Link to={`/players/${player.id}`} className="text-xl font-black tracking-tight text-slate-950 transition hover:text-[#00599c]">
                            {player.name}
                          </Link>
                          <p className="mt-1 text-sm text-slate-500">
                            {stats?.school_name || "School unavailable"} {stats?.state ? `(${stats.state})` : ""} · {stats?.positions?.join("/") || "Position unlisted"} · Class of {player.classYear}
                          </p>
                        </div>
                      </div>

                      <div className="lg:ml-auto lg:w-auto">
                        <div className="flex flex-wrap gap-3">
                          <MetricBlock label="PPG" value={formatStat(stats?.points_per_game)} />
                          <MetricBlock label="RPG" value={formatStat(stats?.rebounds_per_game)} />
                          <MetricBlock label="APG" value={formatStat(stats?.assists_per_game)} />
                          <button
                            onClick={() => handleRemovePlayers([player.id])}
                            disabled={busy}
                            className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-red-600 transition hover:bg-red-600 hover:text-white"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                <p className="text-lg font-black tracking-tight text-slate-700">
                  {players.length === 0 ? "This watchlist is empty." : "No athletes match that search."}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {players.length === 0 ? "Use Add Player to start building this board." : "Try a different player, school, class year, or position search."}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {showPicker && list && (
        <AddPlayersModal
          currentIds={list.playerIds}
          onClose={() => setShowPicker(false)}
          onAdd={handleAddPlayers}
        />
      )}
    </PageLayout>
  );
}

function formatStat(value?: number | null) {
  return typeof value === "number" ? value.toFixed(1) : "N/A";
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</div>
    </div>
  );
}

function HeaderBadge({ tone, children }: { tone: "amber"; children: React.ReactNode }) {
  const classes = "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${classes}`}>
      {children}
    </span>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-center">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-black tracking-tight text-slate-950">{value}</div>
    </div>
  );
}

function AddPlayersModal({
  currentIds,
  onClose,
  onAdd,
}: {
  currentIds: string[];
  onClose: () => void;
  onAdd: (playerIds: string[]) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Athlete[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  async function runSearch() {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const result = await athleteService.fetchFilteredAthletes({ search: trimmed }, 40);
      setResults(result.players.filter((player) => !currentIds.includes(player.id)));
    } catch (error) {
      console.error("Failed to search players for watchlist:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-[32px] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00599c]">Add Player</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Search the athlete database and add new names to this list.</h3>
            </div>
            <button onClick={onClose} className="rounded-full p-2 transition hover:bg-slate-100">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runSearch();
              }}
              placeholder="Search by athlete or school..."
              className="flex-1 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#00599c] focus:bg-white"
            />
            <button
              onClick={runSearch}
              className="rounded-[22px] bg-[#00599c] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#00497f]"
            >
              Search
            </button>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#00599c]" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              {results.map((player) => {
                const stats = player.currentStats as BasketballStatRecord | undefined;
                const selected = selectedIds.has(player.id);

                return (
                  <button
                    key={player.id}
                    onClick={() =>
                      setSelectedIds((previous) => {
                        const next = new Set(previous);
                        if (next.has(player.id)) next.delete(player.id);
                        else next.add(player.id);
                        return next;
                      })
                    }
                    className={`flex w-full items-center justify-between rounded-[24px] border px-4 py-4 text-left transition ${
                      selected ? "border-[#00599c] bg-[#f4f9ff]" : "border-slate-200 bg-slate-50 hover:border-[#00599c]/35"
                    }`}
                  >
                    <div>
                      <div className="text-lg font-black tracking-tight text-slate-950">{player.name}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {stats?.school_name || "School unavailable"} · {stats?.positions?.join("/") || "Position unlisted"} · Class of {player.classYear}
                      </div>
                    </div>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${selected ? "border-[#00599c] bg-[#00599c]" : "border-slate-300 bg-white"}`}>
                      {selected && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
              <p className="text-sm font-medium text-slate-500">
                {query.trim() ? "No new athletes matched that search." : "Search by athlete name or school to start adding players."}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-6 sm:flex-row">
          <button
            onClick={onClose}
            className="flex-1 rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
          >
            Cancel
          </button>
          <button
            onClick={() => onAdd(Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
            className="flex-1 rounded-[22px] bg-[#00599c] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#00497f] disabled:opacity-45"
          >
            Add Selected Players
          </button>
        </div>
      </div>
    </div>
  );
}
