import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { tasksToCsv, tasksToJson } from "@/lib/export";
import { getProject } from "@/lib/projects";
import { listTasks } from "@/lib/tasks";

/** Downloads every task in the project (`?format=csv|json`); checks auth, then membership, then format. */
export async function GET(request: Request, { params }: RouteContext<"/projects/[id]/export">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 307);
  const id = Number((await params).id);
  const project = Number.isInteger(id) ? getProject(user.id, id) : null;
  if (!project) return new Response("Not found", { status: 404 });
  const format = new URL(request.url).searchParams.get("format");
  if (format !== "csv" && format !== "json") return new Response("Unknown format", { status: 400 });
  const tasks = listTasks(user.id, project.id);
  const [contentType, body] =
    format === "csv"
      ? ["text/csv; charset=utf-8", tasksToCsv(tasks)]
      : ["application/json; charset=utf-8", tasksToJson(project, tasks)];
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="project-${project.id}-tasks.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
