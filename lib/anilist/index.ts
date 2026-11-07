
import type { Anime, AnimeSort } from "./types";
import { queryAniList } from "./api";
import { animeFields } from "./queries";
import {
  getMainSeries,
  addSequelEpisodeCounts,
} from "./series";

export async function getAnimeCollection({
  search,
  sort = "POPULARITY_DESC",
  page = 1,
}: {
  search?: string;
  sort?: AnimeSort;
  page?: number;
} = {}): Promise<{ anime: Anime[]; hasNextPage: boolean }> {
  const mainSeriesById = new Map<number, Anime>();

  const resultPage = await queryAniList(
    `
      query ($page: Int, $search: String, $sort: [MediaSort!]!) {
        Page(page: $page, perPage: 8) {
          pageInfo {
            hasNextPage
          }
          media(type: ANIME, sort: $sort, search: $search
      isAdult: false
      genre_not_in: ["Ecchi"]) {
            ${animeFields}
          }
        }
      }
    `,
    {
      page,
      search,
      sort: [sort],
    },
  );

  const anime = resultPage?.media ?? [];

  const mainSeriesList = await getMainSeries(anime);

  const seriesWithEpisodeCounts = await addSequelEpisodeCounts(mainSeriesList);

  for (const mainSeries of seriesWithEpisodeCounts) {
    mainSeriesById.set(mainSeries.id, mainSeries);
  }

  return {
    anime: Array.from(mainSeriesById.values()),
    hasNextPage: resultPage?.pageInfo?.hasNextPage ?? false,
  };
}
