import {
  maxMigrationSearchesPerRequest,
  searchAnimeForMigrationBatch,
} from "./api";
import type { Anime, SavedAnimeMigration } from "./types";

export type LegacySavedAnime = {
  id: number;
  title: {
    english: string | null;
    romaji: string | null;
  };
};

export async function migrateLegacySavedAnime(
  legacyAnime: LegacySavedAnime[],
): Promise<SavedAnimeMigration[]> {
  const migrations: SavedAnimeMigration[] = [];
  const primarySearches = legacyAnime.map(getPrimarySearchTitle);
  const primaryIndexes = primarySearches.flatMap((title, index) =>
    title ? [index] : [],
  );
  const primaryResults = await searchInBatches(
    primaryIndexes.map((index) => primarySearches[index] ?? ""),
  );
  const primaryResultsByIndex = new Map(
    primaryIndexes.map((index, resultIndex) => [
      index,
      primaryResults[resultIndex],
    ]),
  );
  const unresolved: number[] = [];

  legacyAnime.forEach((legacy, index) => {
    const searchTitle = primarySearches[index];
    const match =
      searchTitle === null
        ? undefined
        : getExactMatch(
            primaryResultsByIndex.get(index) ?? [],
            searchTitle,
          );

    if (match) {
      migrations.push({ fromId: legacy.id, anime: match });
    } else if (
      isString(legacy.title.romaji) &&
      legacy.title.romaji !== searchTitle
    ) {
      unresolved.push(index);
    }
  });

  if (unresolved.length > 0) {
    const fallbackSearches = unresolved.map(
      (index) => legacyAnime[index].title.romaji ?? "",
    );
    const fallbackResults = await searchInBatches(fallbackSearches);

    unresolved.forEach((legacyIndex, resultIndex) => {
      const legacy = legacyAnime[legacyIndex];
      const match = getExactMatch(
        fallbackResults[resultIndex],
        legacy.title.romaji ?? "",
      );

      if (match) {
        migrations.push({ fromId: legacy.id, anime: match });
      }
    });
  }

  return migrations;
}

function getPrimarySearchTitle(
  anime: LegacySavedAnime,
): string | null {
  if (isString(anime.title.english)) {
    return anime.title.english;
  }

  return isString(anime.title.romaji) ? anime.title.romaji : null;
}

async function searchInBatches(searches: string[]): Promise<Anime[][]> {
  const results: Anime[][] = [];

  for (
    let index = 0;
    index < searches.length;
    index += maxMigrationSearchesPerRequest
  ) {
    const batch = searches.slice(
      index,
      index + maxMigrationSearchesPerRequest,
    );
    results.push(...(await searchAnimeForMigrationBatch(batch)));
  }

  return results;
}

function getExactMatch(anime: Anime[], title: string): Anime | undefined {
  const exactMatches = anime.filter((candidate) =>
    matchesSavedTitle(candidate, title),
  );

  return exactMatches.length === 1 ? exactMatches[0] : undefined;
}

function matchesSavedTitle(anime: Anime, title: string): boolean {
  const normalizedTitle = normalizeTitle(title);
  return [anime.title.english, anime.title.romaji].some(
    (candidate) =>
      candidate !== null && normalizeTitle(candidate) === normalizedTitle,
  );
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function isString(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
