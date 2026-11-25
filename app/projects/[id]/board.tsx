"use client";

import Link from "next/link";
import { startTransition, useEffect, useOptimistic, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { isOverdue } from "@/lib/due-dates";
import { COLUMN_NAMES, STATUSES, neighborStatus, type Status } from "@/lib/statuses";
import type { Member } from "@/lib/projects";
import type { Task } from "@/lib/tasks";

type Props = {
  projectId: number;
  tasks: Task[];
  members: Member[];
  /** The viewer; "My tasks" shows the tasks assigned to them. */
  userId: number;
  /** The server's local date (YYYY-MM-DD); cards due before it, and not Done, are marked overdue. */
  today: string;
  move: (taskId: number, status: Status) => Promise<void>;
};
type Move = { id: number; status: Status };

/** Assignee filter values: "all", "mine", "unassigned", or a member's id. */
const ALL = "all";
const MINE = "mine";
const UNASSIGNED = "unassigned";

function matchesAssignee(task: Task, assignee: string, userId: number): boolean {
  if (assignee === ALL) return true;
  if (assignee === MINE) return task.assigneeId === userId;
  if (assignee === UNASSIGNED) return task.assigneeId === null;
  return task.assigneeId === Number(assignee);
}

const KEY_STEPS: Record<string, -1 | 1> = { ArrowLeft: -1, ArrowRight: 1 };

/**
 * The project's tasks in three columns, one per status. Drag a card to another column,
 * or focus it and press ArrowLeft / ArrowRight, to move it. A card's title links to the task page.
 * Cards past their due date and not in Done say "Overdue".
 * The search box shows only tasks whose title or description contains the query (any case);
 * the assignee filter narrows that further to all, the viewer's, unassigned, or one member's tasks.
 */
export function Board({ projectId, tasks, members, userId, today, move }: Props) {
  const [shown, applyMove] = useOptimistic(tasks, (current: Task[], { id, status }: Move) =>
    current.map((task) => (task.id === id ? { ...task, status } : task)),
  );
  // A card moved by keyboard remounts in its new column; give it focus back once.
  const refocusId = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [assignee, setAssignee] = useState(ALL);
  const needle = query.trim().toLowerCase();
  const visible = shown.filter(
    (task) =>
      matchesAssignee(task, assignee, userId) &&
      (!needle || [task.title, task.description].some((text) => text.toLowerCase().includes(needle))),
  );
  useEffect(() => {
    if (refocusId.current === null) return;
    const card = document.querySelector<HTMLElement>(`[data-task-id="${refocusId.current}"]`);
    if (card && card !== document.activeElement) {
      card.focus();
      refocusId.current = null;
    }
  });

  function moveTo(task: Task, status: Status | null) {
    if (!status || status === task.status) return;
    startTransition(async () => {
      applyMove({ id: task.id, status });
      await move(task.id, status);
    });
  }

  function onKeyDown(event: KeyboardEvent, task: Task) {
    const step = KEY_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const status = neighborStatus(task.status, step);
    if (!status) return; // already in the end column: nothing moves, nothing to refocus
    refocusId.current = task.id;
    moveTo(task, status);
  }

  function onDrop(event: DragEvent, status: Status) {
    event.preventDefault();
    const task = shown.find((t) => t.id === Number(event.dataTransfer.getData("text/plain")));
    if (task) moveTo(task, status);
  }

  return (
    <div className="board">
      <label className="board-search">
        Search tasks <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <label className="board-filter">
        Show tasks for{" "}
        <select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
          <option value={ALL}>All</option>
          <option value={MINE}>My tasks</option>
          <option value={UNASSIGNED}>Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.email}
            </option>
          ))}
        </select>
      </label>
      {STATUSES.map((status) => {
        const name = COLUMN_NAMES[status];
        const headingId = `column-${status}`;
        return (
          <section
            key={status}
            aria-labelledby={headingId}
            className="board-column"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, status)}
          >
            <h3 id={headingId}>{name}</h3>
            <ul>
              {visible
                .filter((task) => task.status === status)
                .map((task) => {
                  const overdue = isOverdue(task, today);
                  return (
                    <li
                      key={task.id}
                      data-task-id={task.id}
                      className={overdue ? "task-card overdue" : "task-card"}
                      tabIndex={0}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", String(task.id))}
                      onKeyDown={(event) => onKeyDown(event, task)}
                    >
                      <strong>
                        <Link href={`/projects/${projectId}/tasks/${task.id}`}>{task.title}</Link>
                      </strong>
                      <p>{task.assigneeEmail ?? "Unassigned"}</p>
                      <p>{task.dueDate ? `Due ${task.dueDate}` : "No due date"}</p>
                      {overdue && <p className="overdue-label">Overdue</p>}
                    </li>
                  );
                })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
