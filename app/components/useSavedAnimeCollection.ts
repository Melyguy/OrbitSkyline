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
  getAnimeListSnapshot,
  parseSavedAnimeList,
  subscribeToAnimeList,
  updateSavedAnimeEpisodeCounts,
  type SavedAnime,
} from "@/lib/anime-list";

export function useSavedAnimeCollection(): {
  animeList: SavedAnime[];
  error: string | null;
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
  const idsKey = collection.animeList.map((anime) => anime.id).join(",");
  const lastRefreshKey = useRef<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    if (!idsKey || lastRefreshKey.current === idsKey) {
      return;
    }

    lastRefreshKey.current = idsKey;
    const ids = idsKey.split(",").map(Number);

    async function refreshEpisodeCounts() {
      try {
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
            throw new Error("AniList returned invalid episode-count data.");
          }

          updates.push(...result.counts);
        }

        updateSavedAnimeEpisodeCounts(updates);
        setRefreshError(null);
      } catch (caughtError) {
        setRefreshError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not refresh episode counts from AniList.",
        );
      }
    }

    void refreshEpisodeCounts();
  }, [idsKey]);

  return { ...collection, refreshError };
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
        (count.popularity === null || typeof count.popularity === "number") &&
        (count.episodes === null || typeof count.episodes === "number") &&
        typeof count.episodeCountComplete === "boolean",
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
