import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listProjects } from "@/lib/projects";
import { createProjectAction, deleteProjectAction, renameProjectAction } from "./actions";
import { ConfirmButton } from "./confirm-button";

export const dynamic = "force-dynamic";

/** The browser refuses a whitespace-only name; the server ignores one anyway. */
const NON_BLANK = { pattern: ".*\\S.*", title: "Name cannot be blank" };

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = listProjects(user.id);
  return (
    <main>
      <h2>Projects</h2>
      <form action={createProjectAction}>
        <label>
          New project name <input name="name" required {...NON_BLANK} />
        </label>
        <button type="submit">Create project</button>
      </form>
      <ul aria-label="Your projects">
        {projects.map((project) => (
          <li key={project.id} className="project-row">
            <Link href={`/projects/${project.id}`}>{project.name}</Link>
            <form action={renameProjectAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <input name="name" required {...NON_BLANK} defaultValue={project.name} aria-label={`Rename ${project.name}`} />
              <button type="submit">Rename</button>
            </form>
            <form action={deleteProjectAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <ConfirmButton message={`Delete project "${project.name}"? This also deletes its tasks.`}>Delete</ConfirmButton>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
