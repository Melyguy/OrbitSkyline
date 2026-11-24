import { migrateLegacySavedAnime } from "@/lib/shikimori/migration";

const maxAnimeItems = 10;

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

  if (!isMigrationRequest(body)) {
    return Response.json(
      {
        error: `Provide between 1 and ${maxAnimeItems} saved anime items.`,
      },
      { status: 400 },
    );
  }

  try {
    const migrations = await migrateLegacySavedAnime(body.items);
    return Response.json({ migrations });
  } catch (error) {
    console.error("Could not migrate saved anime to Shikimori.", error);
    return Response.json(
      { error: "Shikimori could not migrate the saved anime list." },
      { status: 502 },
    );
  }
}

function isMigrationRequest(
  value: unknown,
): value is {
  items: {
    id: number;
    title: { english: string | null; romaji: string | null };
  }[];
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.length <= maxAnimeItems &&
    value.items.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "number" &&
        Number.isSafeInteger(item.id) &&
        item.id > 0 &&
        "title" in item &&
        typeof item.title === "object" &&
        item.title !== null &&
        "english" in item.title &&
        (item.title.english === null ||
          (typeof item.title.english === "string" &&
            item.title.english.length <= 200)) &&
        "romaji" in item.title &&
        (item.title.romaji === null ||
          (typeof item.title.romaji === "string" &&
            item.title.romaji.length <= 200)),
    )
  );
}
