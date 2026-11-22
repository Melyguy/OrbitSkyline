import { cacheLife } from "next/cache";
import type { Anime, AnimeSort, AniListPage } from "./types";
import { animeFields } from "./queries";

export async function queryAniList(
  query: string,
  variables: {
    page?: number;
    ids?: number[];
    search?: string;
    sort?: AnimeSort | AnimeSort[];
  },
): Promise<NonNullable<AniListPage["data"]>["Page"]> {
  "use cache";
  cacheLife("hours");

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
