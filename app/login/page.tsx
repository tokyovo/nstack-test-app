import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/projects");
  return (
    <main>
      <h2>Log in</h2>
      <LoginForm />
    </main>
  );
}
