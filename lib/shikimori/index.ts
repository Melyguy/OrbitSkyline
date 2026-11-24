import type { Anime, AnimeSort } from "./types";
import { queryShikimoriAnime, getShikimoriOrder } from "./api";
import {
  getMainSeries,
  addSequelEpisodeCounts,
} from "./series";

const animePerPage = 8;

export async function getAnimeCollection({
  search,
  sort = "POPULARITY_DESC",
  page = 1,
}: {
  search?: string;
  sort?: AnimeSort;
  page?: number;
} = {}): Promise<{ anime: Anime[]; hasNextPage: boolean }> {
  const result = await queryShikimoriAnime({
    page,
    limit: animePerPage + 1,
    search,
    order: getShikimoriOrder(sort),
  });
  const anime = result.slice(0, animePerPage);
  const hasNextPage = result.length > animePerPage;

  const mainSeriesList = await getMainSeries(anime);
  const seriesWithEpisodeCounts = await addSequelEpisodeCounts(
    mainSeriesList,
  );
  const mainSeriesById = new Map(
    seriesWithEpisodeCounts.map((mainSeries) => [
      mainSeries.id,
      mainSeries,
    ]),
  );

  return {
    anime: Array.from(mainSeriesById.values()),
    hasNextPage,
  };
}
