"use client";

export function LoginForm() {
  return (
    <form>
      <label>
        Email <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Password <input name="password" type="password" required autoComplete="current-password" />
      </label>
      <button type="submit">Log in</button>
    </form>
  );
}
