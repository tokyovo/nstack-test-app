import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { monthGrid, monthName, monthParam, monthTitle, parseMonth, shiftMonth, type Month } from "@/lib/calendar";
import { isOverdue, localToday } from "@/lib/due-dates";
import { getProject } from "@/lib/projects";
import { listTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function MonthLink({ base, month, rel, children }: { base: string; month: Month | null; rel: string; children: string }) {
  if (!month) return null;
  return (
    <Link className="button" href={`${base}?month=${monthParam(month)}`} rel={rel}>
      {children}
    </Link>
  );
}

/**
 * The project's tasks on their due dates, one month at a time (`?month=YYYY-MM`, else the server's local month).
 * A Mon-Sun grid on wide screens; on phones one column of only the days with tasks. Tasks without a due date
 * are counted under the grid.
 */
export default async function CalendarPage({ params, searchParams }: PageProps<"/projects/[id]/calendar">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const project = Number.isInteger(id) ? getProject(user.id, id) : null;
  if (!project) notFound();
  const tasks = listTasks(user.id, project.id);
  const today = localToday();
  const { month: monthValue } = await searchParams;
  const month = parseMonth(typeof monthValue === "string" ? monthValue : "", today);
  const cells = monthGrid(month);
  const prefix = `${monthParam(month)}-`;
  const due = tasks.filter((task) => task.dueDate?.startsWith(prefix));
  const undated = tasks.filter((task) => task.dueDate === null).length;
  const base = `/projects/${project.id}/calendar`;
  const name = monthName(month);
  return (
    <main className="calendar-page">
      <p className="back-link">
        <Link href={`/projects/${project.id}`}>{project.name}</Link>
      </p>
      <div className="calendar-title">
        <h2>{monthTitle(month)}</h2>
        <nav aria-label="Months" className="calendar-nav">
          <MonthLink base={base} month={shiftMonth(month, -1)} rel="prev">
            Previous month
          </MonthLink>
          <MonthLink base={base} month={shiftMonth(month, 1)} rel="next">
            Next month
          </MonthLink>
        </nav>
      </div>
      {due.length === 0 && <p className="board-empty">No tasks due this month</p>}
      <ol className="calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <li key={weekday}>{weekday}</li>
        ))}
      </ol>
      <ol className="calendar-grid" aria-label={monthTitle(month)}>
        {cells.map((cell, index) => {
          if (!cell) return <li key={`blank-${index}`} className="calendar-blank" aria-hidden="true" />;
          const dayTasks = due.filter((task) => task.dueDate === cell.date);
          const classes = ["calendar-day", dayTasks.length > 0 && "has-tasks", cell.date === today && "today"];
          return (
            <li
              key={cell.date}
              className={classes.filter(Boolean).join(" ")}
              aria-current={cell.date === today ? "date" : undefined}
            >
              <h3 aria-label={`${cell.weekday} ${cell.day} ${name}`}>
                <span className="calendar-long">{cell.weekdayShort} </span>
                {cell.day}
                <span className="calendar-long"> {name}</span>
              </h3>
              {dayTasks.length > 0 && (
                <ul>
                  {dayTasks.map((task) => (
                    <li key={task.id} className={task.status === "done" ? "done" : undefined}>
                      <Link href={`/projects/${project.id}/tasks/${task.id}`}>{task.title}</Link>
                      {isOverdue(task, today) && <span className="overdue-label">Overdue</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      {undated > 0 && (
        <p className="calendar-undated">
          {undated === 1 ? "1 task has no due date" : `${undated} tasks have no due date`}
        </p>
      )}
    </main>
  );
}
