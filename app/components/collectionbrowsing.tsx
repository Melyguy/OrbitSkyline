import { getPopularAnime, type Anime } from "@/lib/anilist";

export default async function CollectionBrowsing() {
  let animeList: Anime[];

  try {
    animeList = await getPopularAnime();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    return (
      <main className="flex min-h-screen w-full flex-col items-center p-8">
        <h1 className="mb-4 text-3xl font-bold">10 most popular anime</h1>
        <p role="alert">Could not load popular anime: {message}</p>
      </main>
    );
  }


  return (
    <main className="flex min-h-screen w-full flex-col items-center p-8">
      <h1 className="mb-4 text-3xl font-bold">10 most popular anime</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {animeList.map((anime) => {
          const title = anime.title.english ?? anime.title.romaji ?? "Untitled";

          return (
    <article key={anime.id} className="group min-w-0">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900 border border-white/10">
        {anime.coverImage?.medium && (
          <img
            src={anime.coverImage.medium}
            alt={`Cover of ${title}`}
            className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}

        <div className="absolute bottom-3 left-3 rounded-md bg-black/70 backdrop-blur-md px-3 py-1 text-xs text-white">
          {anime.episodes ?? "?"} Episodes (all seasons)
        </div>
      </div>

      <div className="mt-3">
        <h2 className="font-semibold text-sm md:text-base line-clamp-2 group-hover:text-purple-400 transition-colors">
          {title}
        </h2>

        <p className="text-xs text-zinc-500 mt-1">
          {anime.title.romaji ?? "Anime"}
        </p>
      </div>
    </article>
          );
        })}
      </div>
    </main>
  );
}