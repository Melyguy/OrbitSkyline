

type Anime = {
  id: string | number;
  title: { english?: string | null; romaji: string };
  episodes: number | null;
  coverImage: { medium: string };
};

export default function CollectionBrowsing({ animeList = [] }: { animeList?: Anime[] }) {
  return (
    <div className="flex flex-col items-center  w-full h-screen">
      <h1 className="text-3xl font-bold mb-4">Browse collections</h1>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {animeList.map((anime) => (
            <div key={anime.id}>
              <h2>{anime.title.english ?? anime.title.romaji}</h2>
              <p>Episodes: {anime.episodes}</p>
              <img src={anime.coverImage.medium} alt="" />
            </div>
          ))}
        </div>
      </div>
      
  );
}