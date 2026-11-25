import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject, listMembers } from "@/lib/projects";
import { inviteMemberAction } from "../actions";
import { InviteForm } from "./invite-form";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const project = Number.isInteger(id) ? getProject(user.id, id) : null;
  if (!project) notFound();
  const members = listMembers(user.id, project.id);
  return (
    <main>
      <h2>{project.name}</h2>
      <section>
        <h3>Members</h3>
        <ul aria-label="Members">
          {members.map((member) => (
            <li key={member.id}>{member.email}</li>
          ))}
        </ul>
        <InviteForm action={inviteMemberAction.bind(null, project.id)} />
      </section>
    </main>
  );
}
