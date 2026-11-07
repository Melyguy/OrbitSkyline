import {
  getAnimeCollection,
  type Anime,
  type AnimeSort,
} from "@/lib/anilist";

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
          {animeList.map((anime) => {
            const title = anime.title.english ?? anime.title.romaji ?? "Untitled";
            const coverImage =
              anime.coverImage?.extraLarge ??
              anime.coverImage?.large ??
              anime.coverImage?.medium;

            return (
              <article
                key={anime.id}
                className="group min-w-0 hover:border-yellow-400"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                  {coverImage && (
                    <img
                      src={coverImage}
                      alt={`Cover of ${title}`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  )}

                  <div className="absolute bottom-3 left-3 rounded-md bg-black/70 px-3 py-1 text-xs text-white backdrop-blur-md">
                    {anime.episodes ?? "?"} Episodes (all seasons)
                  </div>
                </div>

                <div className="mt-3">
                  <h2 className="line-clamp-2 text-sm font-semibold transition-colors group-hover:text-yellow-400 md:text-base">
                    {title}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {anime.title.romaji ?? "Anime"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}