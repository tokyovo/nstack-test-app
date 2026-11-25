"use client";

type Props = { message: string; children: React.ReactNode };

/** A submit button that asks the browser to confirm first; cancelling stops the form submit. */
export function ConfirmButton({ message, children }: Props) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
