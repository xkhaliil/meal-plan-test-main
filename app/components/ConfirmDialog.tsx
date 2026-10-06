"use client";

import { useEffect, useRef } from "react";

/**
 * The confirmation every update and delete goes through.
 *
 * Built on <dialog> rather than a div overlay: the browser then owns the focus
 * trap, the Escape key and the inert background, which a hand-rolled modal
 * gets wrong more often than not.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for anything that can't be undone. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // Cancel keeps the focus by default; the point of the dialog is the
      // decision, so put the caret on it.
      confirmRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        // Escape: let the parent own the open state.
        e.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        // The dialog element fills the viewport; a click landing on it rather
        // than on the panel inside is a click on the backdrop.
        if (e.target === ref.current && !busy) onCancel();
      }}
      className="m-auto w-[92vw] max-w-md rounded-3xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-[0_32px_64px_-24px_rgba(24,24,27,0.25)] backdrop:bg-zinc-950/25 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-6 sm:p-7">
        <h2
          id="confirm-title"
          className="font-display text-[28px] leading-tight tracking-tight text-zinc-900"
        >
          {title}
        </h2>

        <div className="mt-3 text-sm leading-relaxed text-zinc-600">{body}</div>

        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={
              destructive
                ? "btn border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700"
                : "btn btn-primary"
            }
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
