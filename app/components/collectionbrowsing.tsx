import { getAnimeCollection } from "@/lib/shikimori";
import type { Anime, AnimeSort } from "@/lib/shikimori/types";
import Link from "next/link";
import AnimeCard from "./AnimeCard";

export default async function CollectionBrowsing({
  search,
  sort,
  page,
}: {
  search?: string;
  sort: AnimeSort;
  page: number;
}) {
  let animeList: Anime[];
  let hasNextPage = false;
  const heading = search
    ? `Search results for "${search}"`
    : sort === "START_DATE_DESC"
      ? "Recently released anime"
      : "Popular anime";

  try {
    const collection = await getAnimeCollection({ search, sort, page });
    animeList = collection.anime;
    hasNextPage = collection.hasNextPage;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    return (
      <main className="flex min-h-screen w-full flex-col items-center p-8">
        <h1 className="mb-4 text-3xl font-bold">{heading}</h1>
        <p role="alert">Could not load anime: {message}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center p-8">
      <h1 className="mb-2 text-3xl font-bold">{heading}</h1>
      <p className="mb-6 text-sm text-slate-400">Page {page}</p>

      {animeList.length === 0 ? (
        <p>No anime found. Try a different title.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {animeList.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      )}

      <nav
        aria-label="Anime pages"
        className="mt-10 flex items-center justify-center gap-6"
      >
        {page > 1 ? (
          <Link
            href={getPageHref(search, sort, page - 1)}
            aria-label="Previous page of anime"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-2xl text-slate-200 transition hover:border-amber-200/50 hover:bg-amber-200/10 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
          >
            <span aria-hidden="true">←</span>
          </Link>
        ) : (
          <span className="h-11 w-11" aria-hidden="true" />
        )}
        {hasNextPage && page < 500 && (
          <Link
            href={getPageHref(search, sort, page + 1)}
            aria-label="Next page of anime"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-2xl text-slate-200 transition hover:border-amber-200/50 hover:bg-amber-200/10 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
          >
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </nav>
    </main>
  );
}

function getPageHref(
  search: string | undefined,
  sort: AnimeSort,
  page: number,
): string {
  const params = new URLSearchParams();
  if (search) {
    params.set("search", search);
  }
  params.set("sort", sort);
  params.set("page", String(page));

  return `/?${params.toString()}`;
}
