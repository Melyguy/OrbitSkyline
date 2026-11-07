
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
}: {
  search?: string;
  sort?: AnimeSort;
} = {}): Promise<Anime[]> {
  const mainSeriesById = new Map<number, Anime>();

  let pageNumber = 1;
  let hasNextPage = true;

  while (mainSeriesById.size < 8 && hasNextPage) {
    const page = await queryAniList(
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
        page: pageNumber,
        search,
        sort: [sort],
      },
    );

    const anime = page?.media ?? [];

    const mainSeriesList = await getMainSeries(anime);

    const seriesWithEpisodeCounts =
      await addSequelEpisodeCounts(mainSeriesList);

    for (const mainSeries of seriesWithEpisodeCounts) {
      mainSeriesById.set(mainSeries.id, mainSeries);
    }

    hasNextPage = page?.pageInfo?.hasNextPage ?? false;
    pageNumber += 1;
  }

  return Array.from(mainSeriesById.values()).slice(0, 8);
}
