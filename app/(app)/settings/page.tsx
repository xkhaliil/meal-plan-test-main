"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ProPrice from "@/app/components/ProPrice";
import RotatingBadge from "@/app/components/RotatingBadge";
import { useAuthStore } from "@/lib/stores/authStore";
import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  createdAt?: string;
}

interface Stats {
  mine: number;
  catalog: number;
  plans: number;
}

interface Quota {
  limit: number | null;
  remaining: number | null;
}

const PRO_FEATURES = [
  "Unlimited Recipe Bot messages",
  "AI-generated photos for every recipe",
  "Everything in Free, with no daily cap",
];

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [planError, setPlanError] = useState("");
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
  });
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();

  // Read the plan from the API rather than the cached localStorage copy, which
  // goes stale as soon as a subscription changes.
  useEffect(() => {
    const auth = useAuthStore.getState().authHeaders();
    if (!auth.Authorization) return;
    let cancelled = false;

    (async () => {
      const meRes = await fetch("/api/auth/me", { headers: auth });
      const meData = await meRes.json().catch(() => ({}));
      if (cancelled || !meData.user) return;
      setUser(meData.user);

      const [recipesRes, plansRes, chatRes] = await Promise.all([
        fetch("/api/recipes?view=summary", { headers: auth }),
        fetch("/api/meal-plans", { headers: auth }),
        fetch("/api/chat", { headers: auth }),
      ]);
      const recipesData = await recipesRes.json().catch(() => ({}));
      const plansData = await plansRes.json().catch(() => ({}));
      const chatData = await chatRes.json().catch(() => ({}));
      if (cancelled) return;

      setStats({
        mine: recipesData.mine ?? 0,
        catalog: recipesData.total ?? 0,
        plans: (plansData.mealPlans ?? []).length,
      });
      setQuota(chatData.quota ?? null);
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  function startEditing() {
    if (!user) return;
    setForm({
      name: user.name,
      email: user.email,
      currentPassword: "",
      newPassword: "",
    });
    setProfileError("");
    setProfileSaved(false);
    setEditing(true);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setSavingProfile(true);

    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...useAuthStore.getState().authHeaders(),
      },
      // undefined keys drop out of the JSON, which is what the handler treats
      // as "leave this one alone".
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        currentPassword: form.currentPassword || undefined,
        newPassword: form.newPassword || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingProfile(false);

    if (!res.ok) {
      setProfileError(data.error || `Could not save changes (${res.status}).`);
      return;
    }

    setUser(data.user);
    // A changed email means a re-issued token; the old one names an address
    // that no longer exists.
    // A changed email re-issues the token; keep the store's copy current.
    if (data.token) useAuthStore.getState().signIn(data.user, data.token);
    useAuthStore.getState().patchUser({
      name: data.user.name,
      email: data.user.email,
    });
    setEditing(false);
    setProfileSaved(true);
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError("");
    setDeleting(true);

    const res = await fetch("/api/auth/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...useAuthStore.getState().authHeaders(),
      },
      body: JSON.stringify({ password: deletePassword }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setDeleting(false);
      setDeleteError(
        data.error || `Could not delete the account (${res.status}).`
      );
      return;
    }

    // Stay disabled through the redirect; the session is gone either way.
    // The DELETE already cleared the cookie, so this only has to clear the
    // client side — which the store owns.
    await useAuthStore.getState().signOut();
    router.push("/landing");
  }

  async function handleCancelSubscription() {
    setPlanError("");
    setBusy(true);
    const res = await fetch("/api/stripe/cancel", {
      method: "POST",
      headers: useAuthStore.getState().authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setPlanError(
        data.error || `Could not cancel subscription (${res.status}).`
      );
      return;
    }

    setUser((prev) => (prev ? { ...prev, plan: "free" } : prev));
    useAuthStore.getState().patchUser({ plan: "free" });
  }

  async function handleUpgrade() {
    setBusy(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...useAuthStore.getState().authHeaders(),
      },
    });
    const raw = await res.text();
    let data: { url?: string; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      /* non-JSON error body */
    }
    setBusy(false);

    if (!res.ok) {
      setPlanError(data.error ?? `Could not start checkout (${res.status}).`);
      return;
    }
    if (data.url) {
      window.location.href = data.url;
    } else {
      setPlanError("Billing did not return a checkout link.");
    }
  }

  if (!user) return <SettingsSkeleton />;

  const isPro = user.plan === "pro";
  const initial = user.name?.trim().charAt(0).toUpperCase() || "?";
  const memberNo = user.id.slice(-6).toUpperCase();
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="pb-20">
      <h1 className="sr-only">Settings</h1>

      {/* ---------- The member card ---------- */}
      <section className="border-b-2 border-brown px-5 py-12 sm:px-[30px]">
        <div className="mx-auto max-w-5xl">
          <div className="card relative overflow-hidden p-6 shadow-[6px_6px_0_0_#594b3c] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <p className="text-[0.65rem] uppercase tracking-[0.25em] text-brown/50">
                  Member card
                </p>
                {profileSaved && (
                  <span className="tag bg-green text-[0.6rem] text-white">
                    Saved
                  </span>
                )}
              </div>
              <span
                className={`rotate-[-7deg] rounded-pill border-[3px] border-dashed px-4 py-1 font-display text-base uppercase tracking-[0.1em] ${
                  isPro ? "border-green text-green" : "border-red text-red"
                }`}
              >
                {isPro ? "Pro" : "Free"}
              </span>
            </div>

            <div className="mt-7 flex items-center gap-5">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-brown bg-yellow font-display text-3xl uppercase text-brown">
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-3xl uppercase leading-none text-brown sm:text-[40px]">
                  {user.name}
                </h2>
                <p className="mt-2 truncate text-brown/70">{user.email}</p>
              </div>

              <button
                onClick={startEditing}
                className="tag h-9 shrink-0 px-4 transition-colors hover:bg-brown hover:text-yellow"
              >
                Edit details
              </button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-x-12">
              <CardField label="Member no." value={memberNo} />
              <CardField label="Issued" value={memberSince} />
              <CardField label="Your recipes" value={stats?.mine} />
              <CardField label="Meal plans" value={stats?.plans} />
            </div>

            {/* Today's allowance, punched like a loyalty card. */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t-2 border-dashed border-brown/35 pt-6">
              <p className="text-[0.65rem] uppercase tracking-[0.25em] text-brown/50">
                Today&apos;s pass
              </p>
              <DailyPass quota={quota} isPro={isPro} />
            </div>
          </div>
        </div>
      </section>

      {editing && (
        <section className="border-b-2 border-brown px-5 py-12 sm:px-[30px]">
          <div className="mx-auto max-w-5xl">
            <form onSubmit={handleSaveProfile} className="card p-6 sm:p-8">
              <div className="border-b-2 border-brown pb-5">
                <h2 className="font-display text-3xl uppercase leading-none text-brown sm:text-[44px]">
                  Edit details
                </h2>
                <p className="mt-2 text-sm text-brown/70">
                  Your current password is only needed to change the address you
                  sign in with, or to set a new password.
                </p>
              </div>

              {profileError && (
                <div className="alert-error mt-5">{profileError}</div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="account-name">
                    Name
                  </label>
                  <input
                    id="account-name"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="account-email">
                    Email
                  </label>
                  <input
                    id="account-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="account-current">
                    Current password
                  </label>
                  <input
                    id="account-current"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Only for email or password changes"
                    value={form.currentPassword}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        currentPassword: e.target.value,
                      }))
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="account-new">
                    New password{" "}
                    <span className="text-brown/55">(optional)</span>
                  </label>
                  <input
                    id="account-new"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="At least 8 characters"
                    value={form.newPassword}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, newPassword: e.target.value }))
                    }
                    className="input"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn btn-primary"
                >
                  {savingProfile ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* ---------- Plan ---------- */}
      <section className="border-b-2 border-brown px-5 py-12 sm:px-[30px]">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-[clamp(2rem,5vw,64px)] uppercase leading-[0.9] text-brown">
            {isPro ? "You're on Pro" : "Go Pro"}
          </h2>
          <p className="mt-4 max-w-[52ch] text-brown/70">
            {isPro
              ? "Everything's unlocked. Cancel whenever you like — your recipes and plans stay put."
              : "The free plan covers a normal week. Pro takes the limits off."}
          </p>

          {planError && <div className="alert-error mt-6">{planError}</div>}

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <Statement
              isPro={isPro}
              memberSince={memberSince}
              memberNo={memberNo}
            />

            {isPro ? (
              <div className="card flex flex-col p-6 sm:p-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-3xl uppercase leading-none text-green">
                    Pro
                  </h3>
                  <span className="tag bg-green text-white">Active</span>
                </div>
                <p className="mt-4 text-sm text-brown/70">
                  Everything below is switched on for this account.
                </p>
                <div className="mt-6">
                  <FeatureList features={PRO_FEATURES} />
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-4 border-t-2 border-brown pt-6">
                  <button
                    onClick={handleCancelSubscription}
                    disabled={busy}
                    className="btn btn-secondary"
                  >
                    {busy ? "Working..." : "Cancel subscription"}
                  </button>
                  <p className="text-xs text-brown/55">
                    You&apos;ll move to the free plan and keep every recipe
                    you&apos;ve saved.
                  </p>
                </div>
              </div>
            ) : (
              <div className="card flex flex-col p-6 shadow-[6px_6px_0_0_#594b3c] sm:p-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-3xl uppercase leading-none text-red">
                    Pro
                  </h3>
                  <span className="tag bg-green text-white">Upgrade</span>
                </div>
                <p className="mt-4 text-sm text-brown/70">
                  For the weeks you cook properly.
                </p>
                <div className="mt-6">
                  <FeatureList features={PRO_FEATURES} />
                </div>

                <button
                  onClick={handleUpgrade}
                  disabled={busy}
                  className="btn btn-primary mt-8 h-14 w-full text-base"
                >
                  {busy ? "Starting checkout..." : "Upgrade to Pro"}
                </button>
                <ProPrice className="mt-3 block text-center text-xs text-brown/55" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Danger zone ---------- */}
      <section className="px-5 py-12 sm:px-[30px]">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-card border-[3px] border-dashed border-red bg-beige p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-[52ch]">
                <h2 className="font-display text-2xl uppercase leading-none text-red">
                  Delete account
                </h2>
                <p className="mt-3 text-sm text-brown/70">
                  Permanently removes your account, recipes, and meal plans.
                  This cannot be undone.
                </p>
              </div>
              {!confirmingDelete && (
                <button
                  onClick={() => {
                    setDeleteError("");
                    setDeletePassword("");
                    setConfirmingDelete(true);
                  }}
                  className="btn btn-danger"
                >
                  Delete account
                </button>
              )}
            </div>

            {confirmingDelete && (
              <form
                onSubmit={handleDeleteAccount}
                className="mt-7 border-t-2 border-dashed border-red/45 pt-6"
              >
                <p className="text-sm uppercase tracking-[0.15em] text-red">
                  This deletes, permanently:
                </p>
                <ul className="mt-4 space-y-2 text-sm text-brown/80">
                  <li>
                    {stats?.mine ?? "—"} recipes you created — including from
                    anyone else&apos;s meal plans
                  </li>
                  <li>{stats?.plans ?? "—"} of your meal plans</li>
                  <li>Your whole Recipe Bot conversation</li>
                  {isPro && <li>Your Pro subscription, cancelled in Stripe</li>}
                </ul>

                {deleteError && (
                  <div className="alert-error mt-5">{deleteError}</div>
                )}

                <div className="mt-6 max-w-sm">
                  <label className="label" htmlFor="delete-password">
                    Type your password to confirm
                  </label>
                  <input
                    id="delete-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="input"
                  />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={deleting || !deletePassword}
                    className="btn btn-danger"
                  >
                    {deleting ? "Deleting..." : "Delete everything"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="btn btn-secondary"
                  >
                    Keep my account
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="mt-8 text-center text-xs uppercase tracking-[0.2em] text-brown/45">
            <Link href="/recipes" className="transition-colors hover:text-red">
              Back to your catalog →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function CardField({
  label,
  value,
}: {
  label: string;
  value?: number | string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[0.65rem] uppercase tracking-[0.15em] text-brown/50">
        {label}
      </span>
      <span
        className="flex-1 border-b-2 border-dotted border-brown/25"
        aria-hidden
      />
      <span className="font-display text-base uppercase text-brown">
        {value ?? "—"}
      </span>
    </div>
  );
}

/** Recipe Bot messages left today, as punches on a loyalty card. */
function DailyPass({ quota, isPro }: { quota: Quota | null; isPro: boolean }) {
  if (isPro || quota?.remaining === null) {
    return (
      <span className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-green">
        <span className="h-2.5 w-2.5 rounded-full bg-green" aria-hidden />
        Unlimited Recipe Bot
      </span>
    );
  }

  if (!quota || quota.limit === null || quota.remaining === null) {
    return (
      <span className="text-xs uppercase tracking-[0.15em] text-brown/45">
        —
      </span>
    );
  }

  return (
    <span className="flex items-center gap-3">
      <span className="flex gap-1.5" aria-hidden>
        {Array.from({ length: quota.limit }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 border-brown ${
              i < quota.remaining! ? "bg-red" : "bg-transparent"
            }`}
          />
        ))}
      </span>
      <span
        className={`text-xs uppercase tracking-[0.15em] ${
          quota.remaining === 0 ? "text-red" : "text-brown/60"
        }`}
      >
        {quota.remaining} of {quota.limit} bot messages left
      </span>
    </span>
  );
}

/** The plan, printed like a café statement. */
function Statement({
  isPro,
  memberSince,
  memberNo,
}: {
  isPro: boolean;
  memberSince: string;
  memberNo: string;
}) {
  const rows: [string, string][] = [
    ["Plan", isPro ? "Pro" : "Free"],
    ["Bot messages", isPro ? "Unlimited" : "5 / day"],
    ["Recipes", "Unlimited"],
    ["Meal plans", "Unlimited"],
    ["Member no.", memberNo],
    ["Since", memberSince],
  ];

  return (
    <div className="card h-fit p-6">
      <p className="text-center font-display text-xl uppercase leading-none text-brown">
        MealPlan Pro
      </p>
      <p className="mt-2 text-center text-[0.6rem] uppercase tracking-[0.25em] text-brown/45">
        Member statement
      </p>

      <div className="my-5 border-t-2 border-dashed border-brown/35" />

      <dl className="space-y-2.5 font-mono text-[0.7rem] uppercase">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dt className="text-brown/55">{label}</dt>
            <span
              className="flex-1 border-b border-dotted border-brown/25"
              aria-hidden
            />
            <dd className="text-brown">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="my-5 border-t-2 border-dashed border-brown/35" />

      <div className="flex items-baseline justify-between font-display text-base uppercase text-brown">
        <span>Due today</span>
        <span className={isPro ? "text-green" : ""}>
          {isPro ? "Billed monthly" : "$0.00"}
        </span>
      </div>
      <p className="mt-4 text-center text-[0.6rem] uppercase tracking-[0.2em] text-brown/40">
        Thank you · Keep cooking
      </p>
    </div>
  );
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="space-y-3">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-3 text-sm text-brown">
          <span
            aria-hidden
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-brown bg-green text-[0.6rem] text-white"
          >
            ✓
          </span>
          {feature}
        </li>
      ))}
    </ul>
  );
}

function SettingsSkeleton() {
  return (
    <div className="pb-20" aria-hidden>
      <section className="border-b-2 border-brown px-5 py-12 sm:px-[30px] sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="h-4 w-28 animate-pulse rounded-pill bg-brown/10" />
          <div className="mt-5 h-20 w-72 animate-pulse rounded-card bg-brown/10" />
          <div className="mt-6 h-5 w-96 max-w-full animate-pulse rounded-pill bg-brown/10" />
        </div>
      </section>
      <section className="px-5 py-12 sm:px-[30px]">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-64 w-full animate-pulse rounded-card bg-brown/10" />
          <div className="h-40 w-full animate-pulse rounded-card bg-brown/10" />
        </div>
      </section>
    </div>
  );
}
