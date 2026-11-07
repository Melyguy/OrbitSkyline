export type Anime = {
  id: number;
  format: string | null;
  title: {
    english: string | null;
    romaji: string | null;
  };
  episodes: number | null;
  coverImage: {
    medium: string | null;
  } | null;
  relations: {
    edges: {
      relationType: string;
      node: {
        id: number;
        type: string;
      };
    }[];
  };
};

type AniListPage = {
  data?: {
    Page?: {
      pageInfo?: {
        hasNextPage: boolean;
      } | null;
      media?: Anime[] | null;
    } | null;
  } | null;
  errors?: { message: string }[];
};

const animeFields = `
  id
  format
  title {
    romaji
    english
  }
  episodes
  coverImage {
    medium
  }
  relations {
    edges {
      relationType
      node {
        id
        type
      }
    }
  }
`;

async function queryAniList(
  query: string,
  variables: { page?: number; ids?: number[] },
): Promise<NonNullable<AniListPage["data"]>["Page"]> {
  const response = await fetch("https://graphql.anilist.co/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`AniList request failed with status ${response.status}.`);
  }

  const result: AniListPage = await response.json();

  if (result.errors?.length) {
    throw new Error(
      `AniList query failed: ${result.errors.map((error) => error.message).join("; ")}`,
    );
  }

  const page = result.data?.Page;
  if (!page) {
    throw new Error("AniList returned no anime data.");
  }

  return page;
}

async function fetchAnimeByIds(animeIds: number[]): Promise<Anime[]> {
  const page = await queryAniList(
    `
      query ($ids: [Int]) {
        Page(page: 1, perPage: 50) {
          media(type: ANIME, id_in: $ids) {
            ${animeFields}
          }
        }
      }
    `,
    { ids: animeIds },
  );

  return page?.media ?? [];
}

function getAnimePrequelIds(anime: Anime): number[] {
  if (anime.format !== "TV") {
    return [];
  }

  return anime.relations.edges
    .filter((edge) => edge.relationType === "PREQUEL" && edge.node.type === "ANIME")
    .map((edge) => edge.node.id);
}

function getAnimeSequelIds(anime: Anime): number[] {
  if (anime.format !== "TV") {
    return [];
  }

  return anime.relations.edges
    .filter((edge) => edge.relationType === "SEQUEL" && edge.node.type === "ANIME")
    .map((edge) => edge.node.id);
}

async function getMainSeries(animeList: Anime[]): Promise<Anime[]> {
  const animeById = new Map(animeList.map((anime) => [anime.id, anime]));
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
    const missingIds = newIds.filter((id) => !animeById.has(id));
    const prequels =
      missingIds.length > 0 ? await fetchAnimeByIds(missingIds) : [];
    prequels.forEach((prequel) => animeById.set(prequel.id, prequel));
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
      const prequel = prequelId === undefined ? undefined : animeById.get(prequelId);

      if (!prequel || prequel.format !== "TV") {
        break;
      }

      mainSeries = prequel;
    }

    return mainSeries;
  });
}

async function addSequelEpisodeCounts(
  mainSeriesList: Anime[],
): Promise<Anime[]> {
  const animeById = new Map(mainSeriesList.map((anime) => [anime.id, anime]));
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
    const missingIds = newIds.filter((id) => !animeById.has(id));
    const sequels =
      missingIds.length > 0 ? await fetchAnimeByIds(missingIds) : [];
    sequels.forEach((sequel) => animeById.set(sequel.id, sequel));
    pendingIds = newIds.flatMap((id) => {
      const sequel = animeById.get(id);
      return sequel ? getAnimeSequelIds(sequel) : [];
    });
  }

  return mainSeriesList.map((mainSeries) => {
    const seriesIds = new Set<number>();
    const queue = [mainSeries.id];
    let totalEpisodes = 0;
    let hasUnknownEpisodeCount = false;

    while (queue.length > 0) {
      const id = queue.pop();
      if (id === undefined || seriesIds.has(id)) {
        continue;
      }

      seriesIds.add(id);
      const anime = animeById.get(id);
      if (!anime) {
        continue;
      }

      if (anime.episodes === null) {
        hasUnknownEpisodeCount = true;
      } else {
        totalEpisodes += anime.episodes;
      }

      queue.push(...getAnimeSequelIds(anime));
    }

    return {
      ...mainSeries,
      episodes: hasUnknownEpisodeCount ? null : totalEpisodes,
    };
  });
}

export async function getPopularAnime(): Promise<Anime[]> {
  const mainSeriesById = new Map<number, Anime>();
  let pageNumber = 1;
  let hasNextPage = true;

  while (mainSeriesById.size < 10 && hasNextPage) {
    const page = await queryAniList(
      `
        query ($page: Int) {
          Page(page: $page, perPage: 10) {
            pageInfo {
              hasNextPage
            }
            media(type: ANIME, sort: POPULARITY_DESC) {
              ${animeFields}
            }
          }
        }
      `,
      { page: pageNumber },
    );
    const anime = page?.media ?? [];

    const mainSeriesList = await getMainSeries(anime);
    const seriesWithEpisodeCounts = await addSequelEpisodeCounts(mainSeriesList);
    for (const mainSeries of seriesWithEpisodeCounts) {
      mainSeriesById.set(mainSeries.id, mainSeries);
    }

    hasNextPage = page?.pageInfo?.hasNextPage ?? false;
    pageNumber += 1;
  }

  return Array.from(mainSeriesById.values()).slice(0, 10);
}
