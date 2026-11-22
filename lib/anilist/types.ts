
export type Anime = {
  id: number;
  format: string | null;
  title: {
    english: string | null;
    romaji: string | null;
  };
  popularity?: number | null;
  episodes: number | null;
  nextAiringEpisode?: {
    episode: number;
  } | null;
  episodeCountComplete?: boolean;
  coverImage: {
    extraLarge: string | null;
    large: string | null;
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

export type AnimeSort =
  | "POPULARITY_DESC"
  | "START_DATE_DESC";

export type EpisodeCountSummary = {
  id: number;
  popularity: number | null;
  episodes: number | null;
  episodeCountComplete: boolean;
};

export type AniListPage = {
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
