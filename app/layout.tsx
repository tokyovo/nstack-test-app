import type { Metadata } from "next";
import type { ReactNode } from "react";
import { logOutAction } from "@/app/auth-actions";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = { title: "Task board" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body>
        <header>
          <h1>Task board</h1>
          {user && (
            <>
              <span data-testid="current-user">{user.email}</span>
              <form action={logOutAction}>
                <button type="submit">Log out</button>
              </form>
            </>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
