"use client";

import { useState, useSyncExternalStore } from "react";
import {
  formatSavedAnimeEpisodeCount,
  getAnimeListSnapshot,
  parseSavedAnimeList,
  subscribeToAnimeList,
  toggleSavedAnime,
  type SavedAnime,
} from "@/lib/anime-list";

export default function AnimeCard({ anime }: { anime: SavedAnime }) {
  const [error, setError] = useState<string | null>(null);
  const snapshot = useSyncExternalStore(
    subscribeToAnimeList,
    getAnimeListSnapshot,
    () => "[]",
  );
  const isSaved = parseSavedAnimeList(snapshot).some(
    (savedAnime) =>
      savedAnime.id === anime.id &&
      (savedAnime.provider ?? "anilist") ===
        (anime.provider ?? "anilist"),
  );
  const title = anime.title.english ?? anime.title.romaji ?? "Untitled";
  const coverImage =
    anime.coverImage?.extraLarge ??
    anime.coverImage?.large ??
    anime.coverImage?.medium;

  function handleToggleSaved() {
    try {
      toggleSavedAnime(anime, isSaved);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update your list.",
      );
    }
  }

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
        {coverImage && (
          <img
            src={coverImage}
            alt={`Cover of ${title}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}

        <button
          type="button"
          onClick={handleToggleSaved}
          aria-label={`${isSaved ? "Remove" : "Add"} ${title} ${isSaved ? "from" : "to"} your list`}
          aria-pressed={isSaved}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/15 bg-slate-450/85 px-4 py-2.5 text-sm font-bold whitespace-nowrap text-yellow-100 opacity-100 shadow-lg backdrop-blur transition hover:border-amber-200/50 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          {isSaved ? "✓" : "+"}
        </button>

        <div className="absolute bottom-3 left-3 rounded-md bg-black/70 px-3 py-1 text-xs text-white backdrop-blur-md">
          {formatSavedAnimeEpisodeCount(anime)} Episodes (all seasons)
        </div>
      </div>

      <div className="mt-3">
        <h2 className="line-clamp-2 text-sm font-semibold transition-colors group-hover:text-yellow-400 md:text-base">
          {title}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          {anime.title.romaji ?? "Anime"}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-xs text-rose-300">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
