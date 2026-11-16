"use client";

import { useSavedAnimeCollection } from "../components/useSavedAnimeCollection";
import AnimeCity from "../components/AnimeCity";
import { formatSavedAnimeEpisodeCount } from "../../lib/anime-list";

export default function City() {
  const { animeList, error, refreshError } = useSavedAnimeCollection();
  const totalEpisodes = animeList.reduce(
    (total, anime) => total + (anime.episodes ?? 0),
    0,
  );
  const hasIncompleteEpisodeCounts = animeList.some(
    (anime) => anime.episodeCountComplete === false || anime.episodes === null,
  );

  return (
    <main className="min-h-screen px-5 pt-32 pb-16 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="mb-2 text-xs font-bold tracking-[0.2em] text-amber-200 uppercase">
            Your collection
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Anime city
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Each building represents a series. Taller buildings have more
            episodes. Drag to explore the skyline.
          </p>
        </header>

        {error ? (
          <p role="alert" className="text-rose-300">
            {error}
          </p>
        ) : animeList.length === 0 ? (
          <p className="text-slate-400">
            Your city is empty. Add a series from the home page to get started.
          </p>
        ) : (
          <>
            {refreshError && (
              <p role="status" className="mb-5 text-sm text-amber-200">
                Could not refresh episode counts. Showing saved counts instead:{" "}
                {refreshError}
              </p>
            )}
            <div className="mb-5 flex flex-wrap gap-3 text-sm">
              <p className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-slate-300">
                <span className="font-bold text-white">{animeList.length}</span>{" "}
                series
              </p>
              <p className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-slate-300">
                {hasIncompleteEpisodeCounts && "At least "}
                <span className="font-bold text-white">
                  {totalEpisodes.toLocaleString("en-US")}
                </span>{" "}
                episodes tracked
              </p>
            </div>

            <AnimeCity animeList={animeList} />

            <section
              aria-labelledby="city-directory-heading"
              className="mt-10"
            >
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="mb-1 text-xs font-bold tracking-[0.16em] text-amber-200 uppercase">
                    Building guide
                  </p>
                  <h2
                    id="city-directory-heading"
                    className="text-2xl font-bold tracking-tight"
                  >
                    Your skyline
                  </h2>
                </div>
                <p className="text-sm text-slate-400">
                  {animeList.length}{" "}
                  {animeList.length === 1 ? "building" : "buildings"}
                </p>
              </div>

              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {animeList.map((anime, index) => (
                  <li
                    key={anime.id}
                    className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <p className="mb-1 text-[10px] font-bold tracking-[0.16em] text-amber-200 uppercase">
                      Building {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="truncate font-semibold text-slate-100">
                      {anime.title.english ?? anime.title.romaji ?? "Untitled"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {anime.episodes === null
                        ? "Episode count unknown"
                        : `${formatSavedAnimeEpisodeCount(anime)} episodes`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}