import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function Home() {
  getDb();
  return (
    <main>
      <h1>Task board</h1>
    </main>
  );
}
