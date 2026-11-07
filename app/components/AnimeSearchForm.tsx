import { useSearchParams } from "next/navigation";

export function AnimeSearchForm() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const sort =
    searchParams.get("sort") === "START_DATE_DESC"
      ? "START_DATE_DESC"
      : "POPULARITY_DESC";

  return (
    <form action="/" method="get" className="flex min-w-0 gap-2">
      <label htmlFor="anime-search" className="sr-only">
        Search all anime
      </label>
      <input
        id="anime-search"
        type="search"
        name="search"
        defaultValue={search}
        maxLength={100}
        placeholder="Search anime..."
        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-200/50 focus:ring-2 focus:ring-amber-200/20 sm:w-44 sm:flex-none"
      />
      <label htmlFor="anime-sort" className="sr-only">
        Sort anime
      </label>
      <select
        id="anime-sort"
        name="sort"
        defaultValue={sort}
        className="max-w-36 rounded-lg border border-white/10 bg-slate-950/70 px-2 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-200/50 focus:ring-2 focus:ring-amber-200/20 sm:text-sm"
      >
        <option value="POPULARITY_DESC">Popular</option>
        <option value="START_DATE_DESC">Recently released</option>
      </select>
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-amber-200 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-100 sm:text-sm"
      >
        Search
      </button>
    </form>
  );
}