import type {
  Anime,
  EpisodeCountSummary,
  SavedAnimeMigration,
} from "@/lib/shikimori/types";

export type SavedAnime = Pick<
  Anime,
  | "id"
  | "provider"
  | "title"
  | "popularity"
  | "episodes"
  | "episodeCountComplete"
  | "coverImage"
>;

export type EpisodeCountUpdate = EpisodeCountSummary;

const storageKey = "orbit-anime-list";
export const animeListUpdatedEvent = "orbit-anime-list-updated";

export function getAnimeListSnapshot(): string {
  return window.localStorage.getItem(storageKey) ?? "[]";
}

export function parseSavedAnimeList(snapshot: string): SavedAnime[] {
  let value: unknown;

  try {
    value = JSON.parse(snapshot);
  } catch {
    throw new Error("Your saved anime list is invalid. Clear it and try again.");
  }

  if (!Array.isArray(value) || !value.every(isSavedAnime)) {
    throw new Error("Your saved anime list is invalid. Clear it and try again.");
  }

  return value;
}

export function subscribeToAnimeList(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(animeListUpdatedEvent, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(animeListUpdatedEvent, onChange);
  };
}

export function toggleSavedAnime(anime: SavedAnime, isSaved: boolean): void {
  const savedAnime = parseSavedAnimeList(getAnimeListSnapshot());
  const provider = anime.provider ?? "anilist";
  const nextList = isSaved
    ? savedAnime.filter(
        (saved) =>
          saved.id !== anime.id ||
          (saved.provider ?? "anilist") !== provider,
      )
    : [
        anime,
        ...savedAnime.filter(
          (saved) =>
            saved.id !== anime.id ||
            (saved.provider ?? "anilist") !== provider,
        ),
      ];

  window.localStorage.setItem(storageKey, JSON.stringify(nextList));
  window.dispatchEvent(new Event(animeListUpdatedEvent));
}

export function applySavedAnimeMigrations(
  migrations: SavedAnimeMigration[],
): void {
  const savedAnime = parseSavedAnimeList(getAnimeListSnapshot());
  const migrationsById = new Map(
    migrations.map((migration) => [migration.fromId, migration.anime]),
  );
  const nextList: SavedAnime[] = [];
  const savedKeys = new Set<string>();

  for (const anime of savedAnime) {
    const migration =
      anime.provider === "shikimori"
        ? undefined
        : migrationsById.get(anime.id);
    const migratedAnime: SavedAnime = migration
      ? {
          id: migration.id,
          provider: migration.provider,
          title: migration.title,
          popularity: migration.popularity,
          episodes: migration.episodes,
          episodeCountComplete: migration.episodeCountComplete,
          coverImage: migration.coverImage,
        }
      : anime;
    const key = `${migratedAnime.provider ?? "anilist"}:${migratedAnime.id}`;

    if (!savedKeys.has(key)) {
      savedKeys.add(key);
      nextList.push(migratedAnime);
    }
  }

  window.localStorage.setItem(storageKey, JSON.stringify(nextList));
  window.dispatchEvent(new Event(animeListUpdatedEvent));
}

export function updateSavedAnimeEpisodeCounts(
  updates: EpisodeCountUpdate[],
): void {
  const savedAnime = parseSavedAnimeList(getAnimeListSnapshot());
  const updatesById = new Map(updates.map((update) => [update.id, update]));
  let changed = false;

  const nextList = savedAnime.map((anime) => {
    const update = updatesById.get(anime.id);
    if (!update || anime.provider !== update.provider) {
      return anime;
    }

    if (
      anime.episodes === update.episodes &&
      anime.popularity === update.popularity &&
      anime.episodeCountComplete === update.episodeCountComplete
    ) {
      return anime;
    }

    changed = true;
    return {
      ...anime,
      popularity: update.popularity,
      episodes: update.episodes,
      episodeCountComplete: update.episodeCountComplete,
    };
  });

  if (changed) {
    window.localStorage.setItem(storageKey, JSON.stringify(nextList));
    window.dispatchEvent(new Event(animeListUpdatedEvent));
  }
}

export function formatSavedAnimeEpisodeCount(
  anime: Pick<SavedAnime, "episodes" | "episodeCountComplete">,
): string {
  if (anime.episodes === null) {
    return "?";
  }

  const count = anime.episodes.toLocaleString("en-US");
  return anime.episodeCountComplete === false ? `${count}+` : count;
}

function isSavedAnime(value: unknown): value is SavedAnime {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const anime = value as Partial<SavedAnime>;

  return (
    typeof anime.id === "number" &&
    (anime.provider === undefined || anime.provider === "shikimori") &&
    typeof anime.title === "object" &&
    anime.title !== null &&
    (anime.title.english === null || typeof anime.title.english === "string") &&
    (anime.title.romaji === null || typeof anime.title.romaji === "string") &&
    (anime.popularity === undefined ||
      anime.popularity === null ||
      typeof anime.popularity === "number") &&
    (anime.episodes === null || typeof anime.episodes === "number") &&
    (anime.episodeCountComplete === undefined ||
      typeof anime.episodeCountComplete === "boolean") &&
    (anime.coverImage === null ||
      (typeof anime.coverImage === "object" &&
        (anime.coverImage.extraLarge === null ||
          typeof anime.coverImage.extraLarge === "string") &&
        (anime.coverImage.large === null ||
          typeof anime.coverImage.large === "string") &&
        (anime.coverImage.medium === null ||
          typeof anime.coverImage.medium === "string")))
  );
}
