
import type { Anime } from "./types";
import { fetchAnimeByIds } from "./api";

export function getAnimePrequelIds(anime: Anime): number[] {
  if (anime.format !== "TV") {
    return [];
  }

  return anime.relations.edges
    .filter(
      (edge) =>
        edge.relationType === "PREQUEL" &&
        edge.node.type === "ANIME",
    )
    .map((edge) => edge.node.id);
}

export function getAnimeSequelIds(anime: Anime): number[] {
  if (anime.format !== "TV") {
    return [];
  }

  return anime.relations.edges
    .filter(
      (edge) =>
        edge.relationType === "SEQUEL" &&
        edge.node.type === "ANIME",
    )
    .map((edge) => edge.node.id);
}

export async function getMainSeries(
  animeList: Anime[],
): Promise<Anime[]> {
  const animeById = new Map(
    animeList.map((anime) => [anime.id, anime]),
  );

  const processedIds = new Set<number>();
  let pendingIds = animeList.flatMap(getAnimePrequelIds);

  while (pendingIds.length > 0) {
    const newIds = Array.from(new Set(pendingIds)).filter(
      (id) => !processedIds.has(id),
    );

    if (newIds.length === 0) {
      break;
    }

    newIds.forEach((id) => processedIds.add(id));

    const missingIds = newIds.filter(
      (id) => !animeById.has(id),
    );

    const prequels =
      missingIds.length > 0
        ? await fetchAnimeByIds(missingIds)
        : [];

    prequels.forEach((prequel) =>
      animeById.set(prequel.id, prequel),
    );

    pendingIds = newIds.flatMap((id) => {
      const prequel = animeById.get(id);
      return prequel ? getAnimePrequelIds(prequel) : [];
    });
  }

  return animeList.map((anime) => {
    let mainSeries = anime;
    const visitedIds = new Set<number>();

    while (!visitedIds.has(mainSeries.id)) {
      visitedIds.add(mainSeries.id);

      const prequelId = getAnimePrequelIds(mainSeries)[0];

      const prequel =
        prequelId === undefined
          ? undefined
          : animeById.get(prequelId);

      if (!prequel || prequel.format !== "TV") {
        break;
      }

      mainSeries = prequel;
    }

    return mainSeries;
  });
}

export async function addSequelEpisodeCounts(
  mainSeriesList: Anime[],
): Promise<Anime[]> {
  const animeById = new Map(
    mainSeriesList.map((anime) => [anime.id, anime]),
  );

  const processedIds = new Set(animeById.keys());
  let pendingIds = mainSeriesList.flatMap(getAnimeSequelIds);

  while (pendingIds.length > 0) {
    const newIds = Array.from(new Set(pendingIds)).filter(
      (id) => !processedIds.has(id),
    );

    if (newIds.length === 0) {
      break;
    }

    newIds.forEach((id) => processedIds.add(id));

    const missingIds = newIds.filter(
      (id) => !animeById.has(id),
    );

    const sequels =
      missingIds.length > 0
        ? await fetchAnimeByIds(missingIds)
        : [];

    sequels.forEach((sequel) =>
      animeById.set(sequel.id, sequel),
    );

    pendingIds = newIds.flatMap((id) => {
      const sequel = animeById.get(id);
      return sequel ? getAnimeSequelIds(sequel) : [];
    });
  }

  return mainSeriesList.map((mainSeries) => {
    const seriesIds = new Set<number>();
    const queue = [mainSeries.id];

    let totalEpisodes = 0;
    let hasKnownEpisodeCount = false;
    let hasUnknownEpisodeCount = false;

    while (queue.length > 0) {
      const id = queue.pop();

      if (id === undefined || seriesIds.has(id)) {
        continue;
      }

      seriesIds.add(id);

      const anime = animeById.get(id);

      if (!anime) {
        hasUnknownEpisodeCount = true;
        continue;
      }

      let episodeCount = anime.episodes;
      if (episodeCount === null && anime.nextAiringEpisode) {
        episodeCount = Math.max(0, anime.nextAiringEpisode.episode - 1);
      }

      if (episodeCount === null) {
        hasUnknownEpisodeCount = true;
      } else {
        totalEpisodes += episodeCount;
        hasKnownEpisodeCount = true;
      }

      if (anime.episodes === null) {
        hasUnknownEpisodeCount = true;
      }

      queue.push(...getAnimeSequelIds(anime));
    }

    return {
      ...mainSeries,
      episodes: hasKnownEpisodeCount ? totalEpisodes : null,
      episodeCountComplete: !hasUnknownEpisodeCount,
    };
  });
}
