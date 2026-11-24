import { cacheLife } from "next/cache";
import type { Anime, AnimeSort } from "./types";

type ShikimoriVariables = {
  page?: number;
  limit?: number;
  search?: string;
  ids?: string;
  order?: "popularity" | "aired_on";
};

type ShikimoriAnime = {
  id: string;
  name: string;
  english: string | null;
  episodes: number | null;
  episodesAired: number | null;
  nextEpisodeAt: string | null;
  kind: string | null;
  poster: {
    originalUrl: string | null;
  } | null;
  related: {
    relationKind: string;
    anime: {
      id: string;
      kind: string | null;
    } | null;
  }[];
};

type ShikimoriResponse = {
  data?: {
    animes?: ShikimoriAnime[] | null;
  } | null;
  errors?: { message: string }[];
};

type ShikimoriMigrationAnime = {
  id: string;
  name: string;
  english: string | null;
  episodes: number | null;
  kind: string | null;
  poster: {
    originalUrl: string | null;
  } | null;
};

type ShikimoriMigrationResponse = {
  data?: Record<string, ShikimoriMigrationAnime[] | null> | null;
  errors?: { message: string }[];
};

type CachedShikimoriResult =
  | { success: true; anime: Anime[] }
  | { success: false; message: string };

type CachedMigrationResult =
  | { success: true; animeGroups: Anime[][] }
  | { success: false; message: string };

export const maxMigrationSearchesPerRequest = 5;

const animeFields = `
  id
  name
  english
  episodes
  episodesAired
  nextEpisodeAt
  kind
  poster {
    originalUrl
  }
  related {
    relationKind
    anime {
      id
      kind
    }
  }
`;

const animeQuery = `
  query AnimeCatalog(
    $page: PositiveInt
    $limit: PositiveInt
    $search: String
    $ids: String
    $order: OrderEnum
  ) {
    animes(
      page: $page
      limit: $limit
      search: $search
      ids: $ids
      order: $order
      censored: true
    ) {
      ${animeFields}
    }
  }
`;

const requestSpacingMilliseconds = 700;
let lastRequestStartedAt = 0;
let requestQueue: Promise<void> = Promise.resolve();

export async function queryShikimoriAnime(
  variables: ShikimoriVariables,
): Promise<Anime[]> {
  const result = await getCachedShikimoriAnime(variables);

  if (!result.success) {
    throw new Error(result.message);
  }

  return result.anime;
}

async function getCachedShikimoriAnime(
  variables: ShikimoriVariables,
): Promise<CachedShikimoriResult> {
  "use cache";

  const response = await postShikimoriGraphQL(animeQuery, variables);

  if (!response.ok) {
    if (response.status === 429) {
      cacheLife("minutes");
    } else {
      cacheLife("seconds");
    }
    const retryAfter = response.headers.get("Retry-After");

    return {
      success: false,
      message:
        response.status === 429
          ? `Shikimori is rate-limiting requests.${retryAfter ? ` Retry after ${retryAfter} seconds.` : " Please try again shortly."}`
          : `Shikimori request failed with status ${response.status}.`,
    };
  }

  const result: ShikimoriResponse = await response.json();

  if (result.errors?.length) {
    cacheLife("seconds");
    return {
      success: false,
      message: `Shikimori query failed: ${result.errors.map((error) => error.message).join("; ")}`,
    };
  }

  if (!result.data?.animes) {
    cacheLife("seconds");
    return {
      success: false,
      message: "Shikimori returned no anime data.",
    };
  }

  cacheLife("hours");
  return {
    success: true,
    anime: result.data.animes.map(mapShikimoriAnime),
  };
}

export async function fetchAnimeByIds(animeIds: number[]): Promise<Anime[]> {
  const anime: Anime[] = [];

  for (let index = 0; index < animeIds.length; index += 50) {
    const ids = animeIds.slice(index, index + 50);
    const batch = await queryShikimoriAnime({
      ids: ids.join(","),
      limit: ids.length,
      page: 1,
    });
    anime.push(...batch);
  }

  return anime;
}

export async function searchAnimeForMigrationBatch(
  searches: string[],
): Promise<Anime[][]> {
  const result = await getCachedMigrationSearches(searches);

  if (!result.success) {
    throw new Error(result.message);
  }

  return result.animeGroups;
}

async function getCachedMigrationSearches(
  searches: string[],
): Promise<CachedMigrationResult> {
  "use cache";

  if (
    searches.length === 0 ||
    searches.length > maxMigrationSearchesPerRequest
  ) {
    throw new Error(
      `Provide between 1 and ${maxMigrationSearchesPerRequest} anime titles to search.`,
    );
  }

  const variables: Record<string, string> = {};
  const variableDefinitions = searches
    .map((search, index) => {
      variables[`search${index}`] = search;
      return `$search${index}: String`;
    })
    .join(", ");
  const fields = searches
    .map(
      (_, index) => `
        match${index}: animes(search: $search${index}, limit: 5, censored: true) {
          id
          name
          english
          episodes
          kind
          poster {
            originalUrl
          }
        }
      `,
    )
    .join("\n");
  const query = `query SavedAnimeMigration(${variableDefinitions}) { ${fields} }`;
  const response = await postShikimoriGraphQL(query, variables);

  if (!response.ok) {
    if (response.status === 429) {
      cacheLife("minutes");
    } else {
      cacheLife("seconds");
    }

    const retryAfter = response.headers.get("Retry-After");
    return {
      success: false,
      message:
        response.status === 429
          ? `Shikimori is rate-limiting requests.${retryAfter ? ` Retry after ${retryAfter} seconds.` : " Please try again shortly."}`
          : `Shikimori migration search failed with status ${response.status}.`,
    };
  }

  const result: ShikimoriMigrationResponse = await response.json();

  if (result.errors?.length) {
    cacheLife("seconds");
    return {
      success: false,
      message: `Shikimori migration search failed: ${result.errors.map((error) => error.message).join("; ")}`,
    };
  }

  const animeGroups = searches.map((_, index) => {
    const group = result.data?.[`match${index}`];
    return group?.map(mapShikimoriMigrationAnime) ?? [];
  });

  if (animeGroups.some((group, index) => !result.data?.[`match${index}`])) {
    cacheLife("seconds");
    return {
      success: false,
      message: "Shikimori returned incomplete migration search data.",
    };
  }

  cacheLife("hours");
  return { success: true, animeGroups };
}

async function postShikimoriGraphQL(
  query: string,
  variables: object,
): Promise<Response> {
  const previousRequest = requestQueue;
  let releaseRequest = () => {};
  requestQueue = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });

  await previousRequest;

  try {
    const delay =
      lastRequestStartedAt + requestSpacingMilliseconds - Date.now();

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    lastRequestStartedAt = Date.now();
    return await fetch("https://shikimori.io/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "CityProjectSite/1.0",
      },
      body: JSON.stringify({ query, variables }),
    });
  } finally {
    releaseRequest();
  }
}

export function getShikimoriOrder(sort: AnimeSort): ShikimoriVariables["order"] {
  return sort === "START_DATE_DESC" ? "aired_on" : "popularity";
}

function mapShikimoriAnime(anime: ShikimoriAnime): Anime {
  const id = Number(anime.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Shikimori returned an invalid anime ID.");
  }

  const relatedAnime = anime.related ?? [];

  return {
    id,
    provider: "shikimori",
    format: anime.kind?.toUpperCase() ?? null,
    title: {
      english: anime.english,
      romaji: anime.name,
    },
    popularity: null,
    episodes: anime.episodes,
    episodeCountComplete: anime.episodes !== null,
    nextAiringEpisode:
      anime.episodes === null &&
      anime.nextEpisodeAt &&
      anime.episodesAired !== null
        ? { episode: anime.episodesAired + 1 }
        : null,
    coverImage: anime.poster
      ? {
          extraLarge: anime.poster.originalUrl,
          large: anime.poster.originalUrl,
          medium: anime.poster.originalUrl,
        }
      : null,
    relations: {
      edges: relatedAnime.map((relation) => ({
        relationType: relation.relationKind.toUpperCase(),
        node: relation.anime
          ? {
              id: Number(relation.anime.id),
              type: "ANIME",
            }
          : {
              id: 0,
              type: "MANGA",
            },
      })),
    },
  };
}

function mapShikimoriMigrationAnime(
  anime: ShikimoriMigrationAnime,
): Anime {
  const id = Number(anime.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Shikimori returned an invalid anime ID.");
  }

  return {
    id,
    provider: "shikimori",
    format: anime.kind?.toUpperCase() ?? null,
    title: {
      english: anime.english,
      romaji: anime.name,
    },
    popularity: null,
    episodes: anime.episodes,
    episodeCountComplete: anime.episodes !== null,
    coverImage: anime.poster
      ? {
          extraLarge: anime.poster.originalUrl,
          large: anime.poster.originalUrl,
          medium: anime.poster.originalUrl,
        }
      : null,
    relations: { edges: [] },
  };
}
