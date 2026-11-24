"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  type EpisodeCountUpdate,
  applySavedAnimeMigrations,
  getAnimeListSnapshot,
  parseSavedAnimeList,
  subscribeToAnimeList,
  updateSavedAnimeEpisodeCounts,
  type SavedAnime,
} from "@/lib/anime-list";
import type { SavedAnimeMigration } from "@/lib/shikimori/types";

export function useSavedAnimeCollection(): {
  animeList: SavedAnime[];
  error: string | null;
  migrationWarning: string | null;
  refreshError: string | null;
} {
  const snapshot = useSyncExternalStore(
    subscribeToAnimeList,
    getAnimeListSnapshot,
    () => "[]",
  );
  const collection = useMemo(() => {
    try {
      return { animeList: parseSavedAnimeList(snapshot), error: null };
    } catch (caughtError) {
      return {
        animeList: [],
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "Could not read your saved anime list.",
      };
    }
  }, [snapshot]);
  const idsKey = JSON.stringify(
    collection.animeList.map((anime) => ({
      id: anime.id,
      provider: anime.provider ?? "anilist",
    })),
  );
  const lastRefreshKey = useRef<string | null>(null);
  const attemptedMigrationIds = useRef(new Set<number>());
  const [migrationWarning, setMigrationWarning] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    if (!collection.animeList.length || lastRefreshKey.current === idsKey) {
      return;
    }

    lastRefreshKey.current = idsKey;
    const legacyAnime = collection.animeList.filter(
      (anime) =>
        anime.provider !== "shikimori" &&
        !attemptedMigrationIds.current.has(anime.id),
    );

    async function refreshEpisodeCounts() {
      try {
        if (legacyAnime.length > 0) {
          legacyAnime.forEach((anime) =>
            attemptedMigrationIds.current.add(anime.id),
          );
          const migrations: SavedAnimeMigration[] = [];
          for (let index = 0; index < legacyAnime.length; index += 10) {
            const batch = legacyAnime.slice(index, index + 10);
            const migrationResponse = await fetch("/api/anime/migrate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: batch.map(({ id, title }) => ({ id, title })),
              }),
            });
            const migrationResult: unknown = await migrationResponse.json();

            if (!migrationResponse.ok) {
              const message =
                isRecord(migrationResult) &&
                typeof migrationResult.error === "string"
                  ? migrationResult.error
                  : `Saved-list migration failed with status ${migrationResponse.status}.`;
              throw new Error(message);
            }

            if (!isMigrationResponse(migrationResult)) {
              throw new Error("Shikimori returned invalid migration data.");
            }

            migrations.push(...migrationResult.migrations);
          }

          applySavedAnimeMigrations(migrations);
          const unresolvedCount = legacyAnime.length - migrations.length;
          setMigrationWarning(
            unresolvedCount > 0
              ? `${unresolvedCount} saved title${unresolvedCount === 1 ? "" : "s"} could not be matched exactly and were left unchanged.`
              : null,
          );
          return;
        }

        const ids = collection.animeList
          .filter((anime) => anime.provider === "shikimori")
          .map((anime) => anime.id);

        if (ids.length === 0) {
          setRefreshError(null);
          return;
        }

        const updates: EpisodeCountUpdate[] = [];

        for (let index = 0; index < ids.length; index += 50) {
          const batch = ids.slice(index, index + 50);
          const response = await fetch("/api/anime/episode-counts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: batch }),
          });
          const result: unknown = await response.json();

          if (!response.ok) {
            const message =
              isRecord(result) && typeof result.error === "string"
                ? result.error
                : `Episode refresh failed with status ${response.status}.`;
            throw new Error(message);
          }

          if (
            !isEpisodeCountResponse(result) ||
            result.counts.length !== batch.length
          ) {
            throw new Error("Shikimori returned invalid episode-count data.");
          }

          updates.push(...result.counts);
        }

        updateSavedAnimeEpisodeCounts(updates);
        setRefreshError(null);
      } catch (caughtError) {
        setRefreshError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not refresh episode counts from Shikimori.",
        );
      }
    }

    void refreshEpisodeCounts();
  }, [collection.animeList, idsKey]);

  return { ...collection, migrationWarning, refreshError };
}

function isEpisodeCountResponse(
  value: unknown,
): value is { counts: EpisodeCountUpdate[] } {
  return (
    isRecord(value) &&
    Array.isArray(value.counts) &&
    value.counts.every(
      (count) =>
        isRecord(count) &&
        typeof count.id === "number" &&
        Number.isSafeInteger(count.id) &&
        count.provider === "shikimori" &&
        (count.popularity === null || typeof count.popularity === "number") &&
        (count.episodes === null || typeof count.episodes === "number") &&
        typeof count.episodeCountComplete === "boolean",
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMigrationResponse(
  value: unknown,
): value is { migrations: SavedAnimeMigration[] } {
  return (
    isRecord(value) &&
    Array.isArray(value.migrations) &&
    value.migrations.every(
      (migration) =>
        isRecord(migration) &&
        typeof migration.fromId === "number" &&
        Number.isSafeInteger(migration.fromId) &&
        isSavedAnime(migration.anime),
    )
  );
}

function isSavedAnime(value: unknown): value is SavedAnime {
  if (!isRecord(value) || !isRecord(value.title)) {
    return false;
  }

  const coverImage = value.coverImage;
  return (
    typeof value.id === "number" &&
    value.provider === "shikimori" &&
    (value.title.english === null ||
      typeof value.title.english === "string") &&
    (value.title.romaji === null ||
      typeof value.title.romaji === "string") &&
    (value.popularity === null || typeof value.popularity === "number") &&
    (value.episodes === null || typeof value.episodes === "number") &&
    typeof value.episodeCountComplete === "boolean" &&
    (coverImage === null ||
      (isRecord(coverImage) &&
        (coverImage.extraLarge === null ||
          typeof coverImage.extraLarge === "string") &&
        (coverImage.large === null ||
          typeof coverImage.large === "string") &&
        (coverImage.medium === null ||
          typeof coverImage.medium === "string")))
  );
}
