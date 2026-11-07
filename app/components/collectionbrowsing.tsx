import { getAnimeCollection } from "@/lib/anilist";
import type { Anime, AnimeSort } from "@/lib/anilist/types";
import AnimeCard from "./AnimeCard";

export default async function CollectionBrowsing({
  search,
  sort,
}: {
  search?: string;
  sort: AnimeSort;
}) {
  let animeList: Anime[];
  const heading = search
    ? `Search results for "${search}"`
    : sort === "START_DATE_DESC"
      ? "Recently released anime"
      : "Popular anime";

  try {
    animeList = await getAnimeCollection({ search, sort });
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
      <h1 className="mb-4 text-3xl font-bold">{heading}</h1>

      {animeList.length === 0 ? (
        <p>No anime found. Try a different title.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {animeList.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      )}
    </main>
  );
}