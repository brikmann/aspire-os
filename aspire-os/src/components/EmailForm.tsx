"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function EmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "Something went wrong. Please try again."
        );
      }

      router.push("/thanks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
          disabled={loading}
          className="flex-1 h-12 px-4 rounded-md bg-midnight-light border border-midnight-edge text-silver placeholder:text-silver-dim font-sans font-normal text-[16px] focus:outline-none focus:border-cobalt-soft transition-colors duration-150 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading}
          className="h-12 px-6 rounded-md bg-cobalt text-silver-bright font-sans font-medium text-[16px] tracking-[0.4px] hover:bg-cobalt-dark transition-colors duration-150 disabled:opacity-60 whitespace-nowrap cursor-pointer"
        >
          {loading ? "Sending…" : "Reserve my seat"}
        </button>
      </div>
      {error && (
        <p className="text-[13px] text-red-400 text-left">{error}</p>
      )}
    </form>
  );
}
