import { Suspense } from "react";
import CollectionBrowsing from "./components/collectionbrowsing";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen w-full flex-col items-center p-8">
          <h1 className="mb-4 text-3xl font-bold">10 most popular anime</h1>
          <p>Loading popular anime...</p>
        </main>
      }
    >
      <CollectionBrowsing />
    </Suspense>
  );
}
