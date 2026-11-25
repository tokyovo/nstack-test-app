import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const project = Number.isInteger(id) ? getProject(user.id, id) : null;
  if (!project) notFound();
  return (
    <main>
      <h2>{project.name}</h2>
    </main>
  );
}
