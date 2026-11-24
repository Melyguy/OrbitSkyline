import { cacheLife } from "next/cache";
import type { EpisodeCountSummary } from "./types";
import { fetchAnimeByIds } from "./api";
import { addSequelEpisodeCounts } from "./series";

export async function getSavedAnimeEpisodeCounts(
  ids: number[],
): Promise<EpisodeCountSummary[]> {
  "use cache";
  cacheLife("hours");

  const anime = await fetchAnimeByIds(ids);
  const fetchedIds = new Set(anime.map((item) => item.id));

  if (ids.some((id) => !fetchedIds.has(id))) {
    throw new Error("Shikimori did not return data for every saved series.");
  }

  const series = await addSequelEpisodeCounts(anime);

  return series.map((item) => ({
    id: item.id,
    provider: "shikimori",
    popularity: null,
    episodes: item.episodes,
    episodeCountComplete:
      item.episodeCountComplete ?? (item.episodes !== null),
  }));
}
