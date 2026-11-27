"use client";

import Link from "next/link";
import { unstable_rethrow, useRouter } from "next/navigation";
import { startTransition, useEffect, useOptimistic, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { isOverdue } from "@/lib/due-dates";
import { COLUMN_NAMES, STATUSES, neighborStatus, type Status } from "@/lib/statuses";
import type { Member } from "@/lib/projects";
import type { Label } from "@/lib/labels";
import type { Task } from "@/lib/tasks";
import { LabelChip } from "./label-chip";

type Props = {
  projectId: number;
  tasks: Task[];
  members: Member[];
  labels: Label[];
  /** The viewer; "My tasks" shows the tasks assigned to them. */
  userId: number;
  /** The server's local date (YYYY-MM-DD); cards due before it, and not Done, are marked overdue. */
  today: string;
  /** Resolves true when the server stored the move. */
  move: (taskId: number, status: Status) => Promise<boolean>;
  /** The URL's `q`, `for` and `label` on load; an unknown `for` or `label` shows all tasks. */
  initialQuery: string;
  initialAssignee: string;
  initialLabel: string;
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

function isAssignee(value: string, members: Member[]): boolean {
  return [ALL, MINE, UNASSIGNED].includes(value) || members.some((member) => String(member.id) === value);
}

/** Label filter values: "all" or a project label's id. */
function isLabel(value: string, labels: Label[]): boolean {
  return value === ALL || labels.some((label) => String(label.id) === value);
}

function matchesLabel(task: Task, label: string): boolean {
  return label === ALL || task.labels.some((taskLabel) => String(taskLabel.id) === label);
}

type Filters = { query: string; assignee: string; label: string };

/** Mirrors the search and filters in the URL (`?q=&for=&label=`) without adding a history entry. */
function replaceUrl({ query, assignee, label }: Filters) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query);
  if (assignee !== ALL) params.set("for", assignee);
  if (label !== ALL) params.set("label", label);
  const search = params.toString();
  window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
}

const KEY_STEPS: Record<string, -1 | 1> = { ArrowLeft: -1, ArrowRight: 1 };

/**
 * The project's tasks in three columns, one per status. Drag a card to another column,
 * or focus it and press ArrowLeft / ArrowRight, to move it. A card's title links to the task page.
 * A move the server refuses puts the card back and shows an alert until the next move succeeds.
 * Cards past their due date and not in Done say "Overdue"; a card with a checklist shows "Checklist <done>/<total>".
 * The search box shows only tasks whose title or description contains the query (any case);
 * the assignee filter narrows that further to all, the viewer's, unassigned, or one member's tasks,
 * and the label filter to the tasks with one label. All three live in the URL, so a reload or a shared link shows the same board.
 * Each column heading has the count of its visible cards beside it; Done cards are dimmed.
 * An empty column says "No tasks"; above the columns, a project without tasks points to the New task form, and one
 * whose tasks all fail the search or filters says nothing matches.
 */
export function Board({
  projectId,
  tasks,
  members,
  labels,
  userId,
  today,
  move,
  initialQuery,
  initialAssignee,
  initialLabel,
}: Props) {
  const [shown, applyMove] = useOptimistic(tasks, (current: Task[], { id, status }: Move) =>
    current.map((task) => (task.id === id ? { ...task, status } : task)),
  );
  // A card moved by keyboard remounts in its new column; give it focus back once.
  const refocusId = useRef<number | null>(null);
  const router = useRouter();
  const [moveError, setMoveError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [assignee, setAssignee] = useState(() => (isAssignee(initialAssignee, members) ? initialAssignee : ALL));
  const [label, setLabel] = useState(() => (isLabel(initialLabel, labels) ? initialLabel : ALL));
  const needle = query.trim().toLowerCase();
  const visible = shown.filter(
    (task) =>
      matchesAssignee(task, assignee, userId) &&
      matchesLabel(task, label) &&
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
      let moved = false;
      try {
        moved = await move(task.id, status);
      } catch (error) {
        unstable_rethrow(error); // a redirect (expired session) or not-found still navigates
      }
      setMoveError(moved ? null : `Could not move "${task.title}"`);
      if (!moved) router.refresh(); // e.g. a task deleted in another tab leaves the board
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
        Search tasks{" "}
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            replaceUrl({ query: event.target.value, assignee, label });
          }}
        />
      </label>
      <label className="board-filter">
        Show tasks for{" "}
        <select
          value={assignee}
          onChange={(event) => {
            setAssignee(event.target.value);
            replaceUrl({ query, assignee: event.target.value, label });
          }}
        >
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
      <label className="board-filter">
        Label{" "}
        <select
          value={label}
          onChange={(event) => {
            setLabel(event.target.value);
            replaceUrl({ query, assignee, label: event.target.value });
          }}
        >
          <option value={ALL}>All labels</option>
          {labels.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      {moveError && (
        <p role="alert" className="board-error">
          {moveError}
        </p>
      )}
      {shown.length === 0 && (
        <p className="board-start">
          No tasks yet. Add the first one under <a href="#new-task">New task</a>.
        </p>
      )}
      {shown.length > 0 && visible.length === 0 && (
        <p role="status" className="board-empty">
          No tasks match the search or filters
        </p>
      )}
      {STATUSES.map((status) => {
        const name = COLUMN_NAMES[status];
        const headingId = `column-${status}`;
        const columnTasks = visible.filter((task) => task.status === status);
        return (
          <section
            key={status}
            aria-labelledby={headingId}
            className="board-column"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, status)}
          >
            <div className="column-header">
              <h3 id={headingId}>{name}</h3>
              <span className="column-count">{columnTasks.length}</span>
            </div>
            <ul>
              {columnTasks.map((task) => {
                const overdue = isOverdue(task, today);
                const classes = ["task-card", overdue && "overdue", task.status === "done" && "done"];
                return (
                  <li
                    key={task.id}
                    data-task-id={task.id}
                    className={classes.filter(Boolean).join(" ")}
                    tabIndex={0}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", String(task.id))}
                    onKeyDown={(event) => onKeyDown(event, task)}
                  >
                    <strong>
                      <Link href={`/projects/${projectId}/tasks/${task.id}`}>{task.title}</Link>
                    </strong>
                    {task.labels.length > 0 && (
                      <ul aria-label="Task labels" className="task-labels">
                        {task.labels.map((label) => (
                          <li key={label.id}>
                            <LabelChip label={label} />
                          </li>
                        ))}
                      </ul>
                    )}
                    <p>{task.assigneeEmail ?? "Unassigned"}</p>
                    <p className="due">{task.dueDate ? `Due ${task.dueDate}` : "No due date"}</p>
                    {overdue && <p className="overdue-label">Overdue</p>}
                    {task.checklistTotal > 0 && (
                      <>
                        <p className="checklist-progress">{`Checklist ${task.checklistDone}/${task.checklistTotal}`}</p>
                        <div className="checklist-bar" aria-hidden="true">
                          <span style={{ width: `${(100 * task.checklistDone) / task.checklistTotal}%` }} />
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
            {columnTasks.length === 0 && <p className="column-empty">No tasks</p>}
          </section>
        );
      })}
    </div>
  );
}
