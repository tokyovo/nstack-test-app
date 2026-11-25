"use client";

import Link from "next/link";
import { startTransition, useEffect, useOptimistic, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { COLUMN_NAMES, STATUSES, neighborStatus, type Status } from "@/lib/statuses";
import type { Task } from "@/lib/tasks";

type Props = { projectId: number; tasks: Task[]; move: (taskId: number, status: Status) => Promise<void> };
type Move = { id: number; status: Status };

const KEY_STEPS: Record<string, -1 | 1> = { ArrowLeft: -1, ArrowRight: 1 };

/**
 * The project's tasks in three columns, one per status. Drag a card to another column,
 * or focus it and press ArrowLeft / ArrowRight, to move it. A card's title links to the task page.
 * The search box shows only tasks whose title or description contains the query (any case).
 */
export function Board({ projectId, tasks, move }: Props) {
  const [shown, applyMove] = useOptimistic(tasks, (current: Task[], { id, status }: Move) =>
    current.map((task) => (task.id === id ? { ...task, status } : task)),
  );
  // A card moved by keyboard remounts in its new column; give it focus back once.
  const refocusId = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? shown.filter((task) => [task.title, task.description].some((text) => text.toLowerCase().includes(needle)))
    : shown;
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
                .map((task) => (
                  <li
                    key={task.id}
                    data-task-id={task.id}
                    className="task-card"
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
                  </li>
                ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
