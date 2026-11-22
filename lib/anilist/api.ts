import { cacheLife } from "next/cache";
import type { Anime, AnimeSort, AniListPage } from "./types";
import { animeFields } from "./queries";

type AniListVariables = {
  page?: number;
  ids?: number[];
  search?: string;
  sort?: AnimeSort | AnimeSort[];
};

type CachedAniListResult =
  | {
      success: true;
      page: NonNullable<AniListPage["data"]>["Page"];
    }
  | {
      success: false;
      message: string;
    };

export async function queryAniList(
  query: string,
  variables: AniListVariables,
): Promise<NonNullable<AniListPage["data"]>["Page"]> {
  const result = await getCachedAniListPage(query, variables);

  if (!result.success) {
    throw new Error(result.message);
  }

  return result.page;
}

async function getCachedAniListPage(
  query: string,
  variables: AniListVariables,
): Promise<CachedAniListResult> {
  "use cache";

  const response = await fetch("https://graphql.anilist.co/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      cacheLife("minutes");
    } else {
      cacheLife("seconds");
    }
    return {
      success: false,
      message:
        response.status === 429
          ? "AniList is temporarily rate-limiting requests. Please try again shortly."
          : `AniList request failed with status ${response.status}.`,
    };
  }

  const result: AniListPage = await response.json();

  if (result.errors?.length) {
    cacheLife("seconds");
    return {
      success: false,
      message: `AniList query failed: ${result.errors.map((error) => error.message).join("; ")}`,
    };
  }

  const page = result.data?.Page;

  if (!page) {
    cacheLife("seconds");
    return {
      success: false,
      message: "AniList returned no anime data.",
    };
  }

  cacheLife("hours");
  return { success: true, page };
}

export async function fetchAnimeByIds(
  animeIds: number[],
): Promise<Anime[]> {
  const anime: Anime[] = [];

  for (let index = 0; index < animeIds.length; index += 50) {
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
      { ids: animeIds.slice(index, index + 50) },
    );
    anime.push(...(page?.media ?? []));
  }

  return anime;
}
