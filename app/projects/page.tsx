import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  await requireUser();
  return (
    <main>
      <h2>Projects</h2>
    </main>
  );
}
