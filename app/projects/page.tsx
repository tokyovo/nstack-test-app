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
    <main className="projects-page">
      <h1>Projects</h1>
      {projects.length === 0 ? (
        <p className="projects-empty">No projects yet. Create your first project below.</p>
      ) : (
        <ul aria-label="Your projects" className="project-list">
          {projects.map((project) => (
            <li key={project.id} className="project-row">
              <Link href={`/projects/${project.id}`} className="project-name">
                {project.name}
              </Link>
              <form action={renameProjectAction}>
                <input type="hidden" name="projectId" value={project.id} />
                <input name="name" required {...NON_BLANK} defaultValue={project.name} aria-label={`Rename ${project.name}`} />
                <button type="submit">Rename</button>
              </form>
              <form action={deleteProjectAction}>
                <input type="hidden" name="projectId" value={project.id} />
                <ConfirmButton message={`Delete project "${project.name}"? This also deletes its tasks.`} className="danger quiet">
                  Delete
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}
      <section className="new-project" aria-label="New project">
        <form action={createProjectAction}>
          <label>
            New project name <input name="name" required {...NON_BLANK} />
          </label>
          <button type="submit" className="primary">
            Create project
          </button>
        </form>
      </section>
    </main>
  );
}
