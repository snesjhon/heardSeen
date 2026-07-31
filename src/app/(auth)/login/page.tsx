"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Installed PWAs can't be the target of a Mail-app link tap (iOS always
// opens Safari instead), and Safari's storage is isolated from the PWA's,
// so a tapped magic link never reaches the app's session. Verifying the
// emailed code in-app sidesteps that hop entirely.
type Status = "idle" | "sending" | "sent" | "verifying" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSendCode(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  async function handleVerifyCode(event: React.FormEvent) {
    event.preventDefault();
    setStatus("verifying");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setStatus("error");
      return;
    }

    router.replace("/");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">heardSeen</h1>
        <p className="text-sm text-neutral-500">
          Sign in with a code sent to your email -- no password needed.
        </p>
      </div>

      {status !== "sent" && status !== "verifying" ? (
        <form onSubmit={handleSendCode} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {status === "sending" ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="flex flex-col gap-3">
          <p className="text-sm text-neutral-500">
            Enter the code we sent to {email}.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm tracking-widest dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            disabled={status === "verifying"}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {status === "verifying" ? "Verifying…" : "Verify code"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="text-sm text-red-600">Something went wrong. Try again.</p>
      )}
    </main>
  );
}
