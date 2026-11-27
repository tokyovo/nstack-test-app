import Link from "next/link";

/** The app's 404 page, for unknown URLs and for notFound() (e.g. a project the user cannot see). */
export default function NotFound() {
  return (
    <main className="narrow">
      <h1>Page not found</h1>
      <p>This page does not exist, or you do not have access to it.</p>
      <p>
        <Link href="/projects" className="button primary">
          Back to projects
        </Link>
      </p>
    </main>
  );
}
