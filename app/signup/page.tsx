import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpAction } from "@/app/auth-actions";
import { CredentialsForm } from "@/app/credentials-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/projects");
  return (
    <main className="narrow">
      <h1>Sign up</h1>
      <CredentialsForm action={signUpAction} submitLabel="Sign up" passwordAutoComplete="new-password" />
      <p>
        Have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
