"use client";

import AnimeCard from "./AnimeCard";
import { useSavedAnimeCollection } from "./useSavedAnimeCollection";

export default function SavedAnimeList() {
  const { animeList, error, migrationWarning, refreshError } =
    useSavedAnimeCollection();

  return (
    <main className="min-h-screen px-5 pt-32 pb-16 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="mb-2 text-xs font-bold tracking-[0.2em] text-amber-200 uppercase">
            Your collection
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            My list
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Your saved series, all in one place.
          </p>
        </header>

        {error ? (
          <p role="alert" className="text-rose-300">
            {error}
          </p>
        ) : animeList.length === 0 ? (
          <p className="text-slate-400">
            Your list is empty. Add a series from the home page to get started.
          </p>
        ) : (
          <>
            {migrationWarning && (
              <p role="status" className="mb-5 text-sm text-amber-200">
                {migrationWarning}
              </p>
            )}
            {refreshError && (
              <p role="status" className="mb-5 text-sm text-amber-200">
                Could not refresh episode counts. Showing saved counts instead:{" "}
                {refreshError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {animeList.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
