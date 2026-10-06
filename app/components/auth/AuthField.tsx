"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type AuthFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
  /** Muted guidance under the field; turns red when `invalid` is set. */
  hint?: string;
  /** Marks the field as failing its own rule — the message goes in `hint`. */
  invalid?: boolean;
  /** Extra content under the hint, e.g. the password strength meter. */
  footer?: React.ReactNode;
};

/**
 * A labelled pill input.
 *
 * The id comes from `useId` so the label always points at its own input —
 * "Password" and "Confirm password" on the register page would otherwise have
 * to coordinate hand-written ids. Password fields get a reveal toggle, which is
 * the one thing a sign-in form can offer against a typo it can't see.
 */
export default function AuthField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  autoFocus,
  required,
  hint,
  invalid,
  footer,
}: AuthFieldProps) {
  const id = useId();
  const hintId = hint ? id + "-hint" : undefined;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "input h-11",
            isPassword && "pr-[4.5rem]",
            invalid &&
              "border-red-300 hover:border-red-300 focus:border-red-400"
          )}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={hintId}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            // The label says what happens next; the state is in aria-pressed.
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
      </div>

      {hint && (
        <p
          id={hintId}
          className={cn(
            "mt-1.5 text-xs leading-relaxed",
            invalid ? "text-red-600" : "text-zinc-500"
          )}
        >
          {hint}
        </p>
      )}

      {footer}
    </div>
  );
}
