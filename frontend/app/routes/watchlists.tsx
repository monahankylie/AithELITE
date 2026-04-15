import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageLayout from "../components/page-layout";
import { useAuth } from "../auth-context";
import { useNotification } from "../notification-context";
import { watchlistService, type UserList } from "../lib/watchlist-service";

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function WatchlistsPage() {
  const { user, loading } = useAuth();
  const { showNotification } = useNotification();

  const [lists, setLists] = useState<UserList[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newListName, setNewListName] = useState("");
  const [newTags, setNewTags] = useState("");
  const [creating, setCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [busyListId, setBusyListId] = useState<string | null>(null);

  async function loadLists() {
    if (!user) {
      setLists([]);
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      const fetched = await watchlistService.fetchUserLists(user.uid);
      setLists(
        fetched.sort((a, b) => {
          if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
      );
    } catch (error) {
      console.error("Failed to load watchlists:", error);
      showNotification("Failed to load watchlists", "error");
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    loadLists();
  }, [user]);

  const filteredLists = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return lists;

    return lists.filter((list) => {
      const haystack = [list.name, ...list.tags, `${list.playerIds.length}`].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [lists, search]);

  const totalPlayers = useMemo(
    () => lists.reduce((sum, list) => sum + list.playerIds.length, 0),
    [lists],
  );

  const favoriteLists = lists.filter((list) => list.favorite);

  async function handleCreateList() {
    if (!user || !newListName.trim() || creating) return;

    try {
      setCreating(true);
      await watchlistService.createList(user.uid, newListName, [], {
        tags: parseTags(newTags),
        favorite: lists.length === 0,
      });
      setNewListName("");
      setNewTags("");
      setIsCreateModalOpen(false);
      showNotification("Watchlist created", "success");
      await loadLists();
    } catch (error) {
      console.error("Failed to create watchlist:", error);
      showNotification("Could not create watchlist", "error");
    } finally {
      setCreating(false);
    }
  }

  async function toggleFavorite(list: UserList) {
    if (!user) return;

    try {
      setBusyListId(list.id);
      if (list.favorite) {
        await watchlistService.clearFavoriteList(user.uid, list.id);
        showNotification("Favorite list cleared", "success");
      } else {
        await watchlistService.setFavoriteList(user.uid, list.id);
        showNotification(`${list.name} is now your favorite list`, "success");
      }
      await loadLists();
    } catch (error) {
      console.error("Failed to update favorite list:", error);
      showNotification("Could not update favorite list", "error");
    } finally {
      setBusyListId(null);
    }
  }

  async function handleDelete(list: UserList) {
    if (!user) return;
    if (!window.confirm(`Delete "${list.name}"? This removes the list but not the athlete records.`)) return;

    try {
      setBusyListId(list.id);
      await watchlistService.deleteList(user.uid, list.id);
      showNotification("Watchlist deleted", "success");
      await loadLists();
    } catch (error) {
      console.error("Failed to delete watchlist:", error);
      showNotification("Could not delete watchlist", "error");
    } finally {
      setBusyListId(null);
    }
  }

  const isLoading = loading || pageLoading;

  return (
    <PageLayout
      requireAuth
      title="Watchlists"
      subtitle="Prospect Boards"
      description="Organize recruiting lists, mark a favorite, and jump into athlete comparison faster."
      variant="hero"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-20 sm:px-6 lg:px-8">
        <section>
          <div className="rounded-[36px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.35)] sm:p-6 lg:p-7">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-center">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00599c]">Lists View</p>
                <h2 className="mt-2 max-w-3xl text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                  Manage every recruiting board from one place.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  Search lists, mark a favorite, and jump straight into compare mode.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:max-w-[460px] xl:max-w-none">
                <StatPill label="Lists" value={String(lists.length)} />
                <StatPill label="Athletes" value={String(totalPlayers)} />
                <StatPill label="Favorites" value={favoriteLists.length > 0 ? `${favoriteLists.length} list${favoriteLists.length === 1 ? "" : "s"}` : "None"} compact />
                <StatPill label="Tagged Lists" value={String(lists.filter((list) => list.tags.length > 0).length)} />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative flex-1">
                <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search watchlists or tags..."
                  className="w-full rounded-[22px] border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#00599c] focus:bg-white"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row xl:flex-none">
                <Link
                  to="/discover"
                  className="inline-flex items-center justify-center rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.22em] text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                >
                  Browse Athletes
                </Link>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center justify-center gap-3 rounded-[22px] bg-[#0d2a52] px-5 py-4 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:-translate-y-0.5 hover:bg-[#081223]"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-base leading-none">+</span>
                  Create List
                </button>
              </div>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#00599c]" />
          </div>
        ) : filteredLists.length > 0 ? (
          <section className="grid gap-5 xl:grid-cols-3">
            {filteredLists.map((list) => {
              const busy = busyListId === list.id;

              return (
                <article
                  key={list.id}
                  className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_-30px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:shadow-[0_20px_50px_-30px_rgba(15,23,42,0.45)]"
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-2xl font-black tracking-tight text-slate-950">{list.name}</h3>
                          {list.favorite && <Badge tone="amber">Favorite</Badge>}
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {list.playerIds.length} {list.playerIds.length === 1 ? "athlete" : "athletes"} tracked
                        </p>
                      </div>

                      <Link
                        to={`/watchlists/${list.id}`}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 transition hover:border-[#00599c] hover:text-[#00599c]"
                      >
                        Open List
                      </Link>
                    </div>

                    <div className="flex flex-wrap gap-2">
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
                        <span className="rounded-full border border-dashed border-slate-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          Add tags on the list page
                        </span>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <button
                        onClick={() => toggleFavorite(list)}
                        disabled={busy}
                        className={`rounded-[20px] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition ${
                          list.favorite
                            ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-600"
                        }`}
                      >
                        {list.favorite ? "Undo Favorite" : "Favorite List"}
                      </button>

                      <Link
                        to={list.playerIds.length > 0 ? `/analyze?ids=${list.playerIds.join(",")}` : `/watchlists/${list.id}`}
                        className={`inline-flex items-center justify-center rounded-[20px] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition ${
                          list.playerIds.length > 0
                            ? "bg-slate-950 text-white hover:bg-slate-800"
                            : "border border-slate-200 bg-slate-50 text-slate-400"
                        }`}
                      >
                        Compare Athletes
                      </Link>

                      <button
                        onClick={() => handleDelete(list)}
                        disabled={busy}
                        className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-red-600 transition hover:bg-red-600 hover:text-white"
                      >
                        Delete List
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="rounded-[36px] border border-dashed border-slate-200 bg-white/80 p-12 text-center shadow-sm">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              {lists.length === 0 ? "No watchlists yet." : "No watchlists match that search."}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {lists.length === 0
                ? "Create your first list above, then start adding athletes you want to track."
                : "Try a different name or tag search to find the right board."}
            </p>
          </section>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateListModal
          creating={creating}
          newListName={newListName}
          newTags={newTags}
          onClose={() => {
            if (creating) return;
            setIsCreateModalOpen(false);
          }}
          onCreate={handleCreateList}
          onNameChange={setNewListName}
          onTagsChange={setNewTags}
        />
      )}
    </PageLayout>
  );
}

function StatPill({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="flex min-h-[96px] flex-col justify-between rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div
        className={`mt-2 font-black tracking-tight text-slate-950 ${compact ? "truncate text-base leading-tight" : "text-3xl"}`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "amber"; children: React.ReactNode }) {
  const classes = "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${classes}`}>
      {children}
    </span>
  );
}

function CreateListModal({
  creating,
  newListName,
  newTags,
  onClose,
  onCreate,
  onNameChange,
  onTagsChange,
}: {
  creating: boolean;
  newListName: string;
  newTags: string;
  onClose: () => void;
  onCreate: () => void;
  onNameChange: (value: string) => void;
  onTagsChange: (value: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.65)] sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00599c]">Create List</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Start a new board for a class, role, or campaign.</h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-slate-500">
              Create a fresh watchlist, add a few tags, and keep your recruiting work organized.
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-950 hover:text-slate-950"
            aria-label="Close create list modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-8 space-y-4">
          <input
            type="text"
            value={newListName}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="List Title"
            autoFocus
            className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#00599c] focus:bg-white"
          />
          <input
            type="text"
            value={newTags}
            onChange={(event) => onTagsChange(event.target.value)}
            placeholder="Tags, use comma for mutiple tags"
            className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#00599c] focus:bg-white"
          />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onClose}
            disabled={creating}
            className="inline-flex items-center justify-center rounded-[22px] border border-slate-200 px-5 py-4 text-xs font-black uppercase tracking-[0.22em] text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!newListName.trim() || creating}
            className="inline-flex flex-1 items-center justify-center rounded-[22px] bg-[#0d2a52] px-5 py-4 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:-translate-y-0.5 hover:bg-[#081223] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Watchlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
