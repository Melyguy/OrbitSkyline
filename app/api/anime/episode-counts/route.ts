import { getSavedAnimeEpisodeCounts } from "@/lib/anilist/episode-counts";

const maxAnimeIdsPerRequest = 50;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "The request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (!isEpisodeCountRequest(body)) {
    return Response.json(
      {
        error: `Provide between 1 and ${maxAnimeIdsPerRequest} valid anime IDs.`,
      },
      { status: 400 },
    );
  }

  const ids = Array.from(new Set(body.ids));

  try {
    const counts = await getSavedAnimeEpisodeCounts(ids);
    return Response.json({ counts });
  } catch (error) {
    console.error("Could not refresh saved anime episode counts.", error);
    return Response.json(
      { error: "AniList could not refresh the saved episode counts." },
      { status: 502 },
    );
  }
}

function isEpisodeCountRequest(value: unknown): value is { ids: number[] } {
  if (
    typeof value !== "object" ||
    value === null ||
    !("ids" in value) ||
    !Array.isArray(value.ids) ||
    value.ids.length === 0 ||
    value.ids.length > maxAnimeIdsPerRequest
  ) {
    return false;
  }

  return value.ids.every(
    (id) => typeof id === "number" && Number.isSafeInteger(id) && id > 0,
  );
}
