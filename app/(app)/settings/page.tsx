"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import ProPrice from "@/app/components/ProPrice";
import { requestJson } from "@/lib/apiClient";
import { useAuthStore } from "@/lib/stores/authStore";
import { toast } from "@/lib/stores/toastStore";
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

// The same list as the landing page's Pro plan.
const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited Recipe Bot messages",
  "A generated photo for each recipe the bot writes",
];

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [planError, setPlanError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

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
      const me = await requestJson<{ user?: User }>(
        "/api/auth/me",
        { headers: auth },
        "Could not load your account."
      );
      if (cancelled) return;
      if (!me.ok || !me.data.user) {
        // Without this the page sat on its skeleton for ever, saying nothing.
        toast.error(me.ok ? "Could not load your account." : me.error);
        return;
      }
      setUser(me.data.user);

      const [recipes, plans, chat] = await Promise.all([
        requestJson<{ mine?: number; total?: number }>(
          "/api/recipes?view=summary",
          { headers: auth },
          "Could not load your recipe totals."
        ),
        requestJson<{ mealPlans?: unknown[] }>(
          "/api/meal-plans",
          { headers: auth },
          "Could not load your meal plans."
        ),
        requestJson<{ quota?: Quota }>(
          "/api/chat",
          { headers: auth },
          "Could not load your Recipe Bot quota."
        ),
      ]);
      if (cancelled) return;

      // The counts are decoration beside the account itself; a failure here
      // leaves them at zero rather than interrupting.
      setStats({
        mine: (recipes.ok && recipes.data.mine) || 0,
        catalog: (recipes.ok && recipes.data.total) || 0,
        plans: plans.ok ? (plans.data.mealPlans ?? []).length : 0,
      });
      setQuota(chat.ok ? (chat.data.quota ?? null) : null);
    })();

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

    const result = await requestJson<{ user: User; token?: string }>(
      "/api/auth/me",
      {
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
      },
      "Could not save your changes."
    );
    setSavingProfile(false);

    if (!result.ok) {
      setProfileError(result.error);
      return;
    }

    const data = result.data;
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

    const result = await requestJson(
      "/api/auth/me",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...useAuthStore.getState().authHeaders(),
        },
        body: JSON.stringify({ password: deletePassword }),
      },
      "Could not delete the account."
    );

    if (!result.ok) {
      setDeleting(false);
      setDeleteError(result.error);
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
    const result = await requestJson(
      "/api/stripe/cancel",
      { method: "POST", headers: useAuthStore.getState().authHeaders() },
      "Could not cancel the subscription."
    );
    setBusy(false);
    // Either way the decision has been made; a failure belongs on the page
    // behind the dialog, not inside it.
    setConfirmingCancel(false);

    if (!result.ok) {
      setPlanError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success("Your subscription has been cancelled.");

    setUser((prev) => (prev ? { ...prev, plan: "free" } : prev));
    useAuthStore.getState().patchUser({ plan: "free" });
  }

  async function handleUpgrade() {
    setBusy(true);
    const result = await requestJson<{ url?: string }>(
      "/api/stripe/checkout",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...useAuthStore.getState().authHeaders(),
        },
      },
      "Could not start checkout."
    );
    setBusy(false);

    if (!result.ok) {
      setPlanError(result.error);
      toast.error(result.error);
      return;
    }
    if (result.data.url) {
      window.location.href = result.data.url;
    } else {
      const message = "Billing did not return a checkout link.";
      setPlanError(message);
      toast.error(message);
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
      <section className="px-5 pb-8 pt-10 sm:px-8 sm:pt-14">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow">Your account</p>
          <h1 className="mt-4 text-5xl tracking-tight sm:text-6xl">Settings</h1>
        </div>
      </section>

      {/* ---------- The member card ---------- */}
      <section className="px-5 pb-10 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="card relative overflow-hidden p-6 shadow-[0_12px_32px_-16px_rgba(24,24,27,0.18)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <p className="eyebrow">Member card</p>
                {profileSaved && (
                  <span className="tag bg-emerald-50 text-emerald-700">
                    Saved
                  </span>
                )}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  isPro
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {isPro ? "Pro" : "Free"}
              </span>
            </div>

            <div className="mt-7 flex items-center gap-5">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-900 font-display text-2xl text-white">
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-3xl tracking-tight sm:text-4xl">
                  {user.name}
                </h2>
                <p className="mt-1.5 truncate text-zinc-400">{user.email}</p>
              </div>

              <button
                onClick={startEditing}
                className="btn btn-secondary min-h-9 shrink-0 px-4 text-[13px]"
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
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 pt-6">
              <p className="eyebrow">Today&apos;s pass</p>
              <DailyPass quota={quota} isPro={isPro} />
            </div>
          </div>
        </div>
      </section>

      {editing && (
        <section className="px-5 pb-10 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <form onSubmit={handleSaveProfile} className="card p-6 sm:p-8">
              <div className="border-b border-zinc-100 pb-5">
                <h2 className="text-3xl tracking-tight sm:text-4xl">
                  Edit details
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
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
                    <span className="text-zinc-500">(optional)</span>
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
      <section className="px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl tracking-tight sm:text-5xl">
            {isPro ? "You're on Pro" : "Go Pro"}
          </h2>
          <p className="mt-4 max-w-[52ch] text-lg text-zinc-400">
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
                  <h3 className="text-3xl tracking-tight">Pro</h3>
                  <span className="tag bg-emerald-50 text-emerald-700">
                    Active
                  </span>
                </div>
                <p className="mt-4 text-sm text-zinc-400">
                  Everything below is switched on for this account.
                </p>
                <div className="mt-6">
                  <FeatureList features={PRO_FEATURES} />
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-zinc-100 pt-6">
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(true)}
                    disabled={busy}
                    className="btn btn-secondary"
                  >
                    {busy ? "Working..." : "Cancel subscription"}
                  </button>
                  <p className="text-xs text-zinc-500">
                    You&apos;ll move to the free plan and keep every recipe
                    you&apos;ve saved.
                  </p>
                </div>
              </div>
            ) : (
              <div className="card flex flex-col p-6 shadow-[0_12px_32px_-16px_rgba(24,24,27,0.18)] sm:p-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-3xl tracking-tight">Pro</h3>
                  <span className="tag">Upgrade</span>
                </div>
                <p className="mt-4 text-sm text-zinc-400">
                  For the weeks you cook properly.
                </p>
                <div className="mt-6">
                  <FeatureList features={PRO_FEATURES} />
                </div>

                <button
                  onClick={handleUpgrade}
                  disabled={busy}
                  className="btn btn-primary mt-8 h-12 w-full"
                >
                  {busy ? "Starting checkout..." : "Upgrade to Pro"}
                </button>
                <ProPrice className="mt-3 block text-center text-xs text-zinc-500" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Danger zone ---------- */}
      <section className="px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-red-100 bg-red-50/40 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-[52ch]">
                <h2 className="text-2xl tracking-tight">Delete account</h2>
                <p className="mt-3 text-sm text-zinc-500">
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
                className="mt-7 border-t border-red-100 pt-6"
              >
                <p className="text-sm font-medium text-red-700">
                  This deletes, permanently:
                </p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-500">
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

          <p className="mt-8 text-center text-xs uppercase tracking-[0.2em] text-zinc-400">
            <Link
              href="/recipes"
              className="transition-colors hover:text-zinc-900"
            >
              Back to your catalog →
            </Link>
          </p>
        </div>
      </section>

      <ConfirmDialog
        open={confirmingCancel}
        destructive
        busy={busy}
        title="Cancel Pro?"
        confirmLabel="Cancel subscription"
        cancelLabel="Keep Pro"
        onCancel={() => setConfirmingCancel(false)}
        onConfirm={handleCancelSubscription}
        body={
          <>
            <p>
              Your subscription is cancelled at Stripe straight away — not at
              the end of the billing period — so Pro features stop now and there
              are no further charges.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>The Recipe Bot goes back to five messages a day</li>
              <li>New recipes stop getting generated photos</li>
              <li>
                Your recipes, meal plans and shopping lists stay exactly as they
                are
              </li>
            </ul>
            <p className="mt-3">You can subscribe again whenever you like.</p>
          </>
        }
      />
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
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="flex-1" aria-hidden />
      <span className="text-sm font-medium tabular-nums text-zinc-900">
        {value ?? "—"}
      </span>
    </div>
  );
}

/** Recipe Bot messages left today, as punches on a loyalty card. */
function DailyPass({ quota, isPro }: { quota: Quota | null; isPro: boolean }) {
  if (isPro || quota?.remaining === null) {
    return (
      <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
        Unlimited Recipe Bot
      </span>
    );
  }

  if (!quota || quota.limit === null || quota.remaining === null) {
    return <span className="text-sm text-zinc-400">—</span>;
  }

  return (
    <span className="flex items-center gap-3">
      <span className="flex gap-1.5" aria-hidden>
        {Array.from({ length: quota.limit }).map((_, i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full ${
              i < quota.remaining! ? "bg-zinc-900" : "bg-zinc-200"
            }`}
          />
        ))}
      </span>
      <span
        className={`text-sm ${
          quota.remaining === 0 ? "text-zinc-900" : "text-zinc-500"
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
      <p className="text-center font-display text-2xl tracking-tight text-zinc-900">
        MealPlan Pro
      </p>
      <p className="mt-2 text-center text-[11px] uppercase tracking-[0.25em] text-zinc-400">
        Member statement
      </p>

      <div className="my-5 border-t border-zinc-100" />

      <dl className="space-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dt className="text-zinc-500">{label}</dt>
            <span className="flex-1" aria-hidden />
            <dd className="font-medium text-zinc-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="my-5 border-t border-zinc-100" />

      <div className="flex items-baseline justify-between text-sm font-semibold text-zinc-900">
        <span>Due today</span>
        <span className={isPro ? "text-emerald-700" : ""}>
          {isPro ? "Billed monthly" : "$0.00"}
        </span>
      </div>
      <p className="mt-4 text-center text-[11px] uppercase tracking-[0.2em] text-zinc-400">
        Thank you · Keep cooking
      </p>
    </div>
  );
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="space-y-3">
      {features.map((feature) => (
        <li
          key={feature}
          className="flex items-start gap-3 text-sm text-zinc-700"
        >
          <span
            aria-hidden
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white"
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
      <section className="px-5 pb-8 pt-10 sm:px-8 sm:pt-14">
        <div className="mx-auto max-w-5xl">
          <div className="h-4 w-28 animate-pulse rounded-full bg-zinc-100" />
          <div className="mt-5 h-20 w-72 animate-pulse rounded-3xl bg-zinc-100" />
          <div className="mt-6 h-5 w-96 max-w-full animate-pulse rounded-full bg-zinc-100" />
        </div>
      </section>
      <section className="px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-64 w-full animate-pulse rounded-3xl bg-zinc-100" />
          <div className="h-40 w-full animate-pulse rounded-3xl bg-zinc-100" />
        </div>
      </section>
    </div>
  );
}
