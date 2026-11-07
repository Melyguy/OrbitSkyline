import { Suspense } from "react";
import CollectionBrowsing from "./components/collectionbrowsing";
import type { AnimeSort } from "@/lib/anilist/types";

type HomeSearchParams = {
  search?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

export default function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen w-full flex-col items-center p-8">
          <h1 className="mb-4 text-3xl font-bold">Loading anime</h1>
          <p>Loading popular anime...</p>
        </main>
      }
    >
      <AnimePageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AnimePageContent({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const params = await searchParams;
  const searchValue = Array.isArray(params.search)
    ? params.search[0]
    : params.search;
  const sortValue = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const search = searchValue?.trim().slice(0, 100) || undefined;
  const sort: AnimeSort =
    sortValue === "START_DATE_DESC" ? "START_DATE_DESC" : "POPULARITY_DESC";
  const parsedPage = Number(pageValue);
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0
      ? Math.min(parsedPage, 500)
      : 1;

  return <CollectionBrowsing search={search} sort={sort} page={page} />;
}
