"use client";

import { useSyncExternalStore } from "react";
import AnimeCard from "./AnimeCard";
import {
  getAnimeListSnapshot,
  parseSavedAnimeList,
  subscribeToAnimeList,
  type SavedAnime,
} from "@/lib/anime-list";

export default function SavedAnimeList() {
  const snapshot = useSyncExternalStore(
    subscribeToAnimeList,
    getAnimeListSnapshot,
    () => "[]",
  );

  let animeList: SavedAnime[];
  let error: string | null = null;

  try {
    animeList = parseSavedAnimeList(snapshot);
  } catch (caughtError) {
    animeList = [];
    error =
      caughtError instanceof Error
        ? caughtError.message
        : "Could not read your saved anime list.";
  }

  return (
    <main className="min-h-screen px-5 pt-32 pb-16 text-foreground sm:px-8">
      <header className="mx-auto mb-10 max-w-7xl">
        <p className="mb-2 text-xs font-bold tracking-[0.2em] text-amber-200 uppercase">
          Your collection
        </p>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
          My list
        </h1>
      </header>

      <div className="mx-auto max-w-7xl">
        {error ? (
          <p role="alert" className="text-rose-300">
            {error}
          </p>
        ) : animeList.length === 0 ? (
          <p className="text-slate-400">
            Your list is empty. Add a series from the home page to get started.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {animeList.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
