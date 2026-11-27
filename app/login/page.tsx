import Link from "next/link";
import { redirect } from "next/navigation";
import { logInAction } from "@/app/auth-actions";
import { CredentialsForm } from "@/app/credentials-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/projects");
  return (
    <main className="narrow">
      <h1>Log in</h1>
      <CredentialsForm action={logInAction} submitLabel="Log in" passwordAutoComplete="current-password" />
      <p>
        No account? <Link href="/signup">Sign up</Link>
      </p>
    </main>
  );
}
