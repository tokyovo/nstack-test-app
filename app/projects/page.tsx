import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listProjects } from "@/lib/projects";
import { createProjectAction, deleteProjectAction, renameProjectAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = listProjects(user.id);
  return (
    <main>
      <h2>Projects</h2>
      <form action={createProjectAction}>
        <label>
          New project name <input name="name" required />
        </label>
        <button type="submit">Create project</button>
      </form>
      <ul aria-label="Your projects">
        {projects.map((project) => (
          <li key={project.id}>
            <Link href={`/projects/${project.id}`}>{project.name}</Link>
            <form action={renameProjectAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <input name="name" required defaultValue={project.name} aria-label={`Rename ${project.name}`} />
              <button type="submit">Rename</button>
            </form>
            <form action={deleteProjectAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <button type="submit">Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
