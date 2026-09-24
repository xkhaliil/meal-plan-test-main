import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "@/app/components/ConfirmDialog";

/**
 * Every destructive action in the app funnels through this, so the contract
 * that matters is: nothing happens unless the user confirms.
 */
function setup(
  props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}
) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      open
      title="Delete this recipe?"
      body={<p>This cannot be undone.</p>}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />
  );
  return { onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("shows the title and body when open", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: "Delete this recipe?" })
    ).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("stays closed when `open` is false", () => {
    setup({ open: false });
    expect(document.querySelector("dialog")?.open).toBeFalsy();
  });

  it("confirms only when the confirm button is pressed", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = setup({ confirmLabel: "Delete it" });

    await user.click(screen.getByRole("button", { name: "Delete it" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancels without confirming", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = setup({ cancelLabel: "Keep it" });

    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("locks both buttons while the action is in flight", () => {
    setup({ busy: true, confirmLabel: "Delete it", cancelLabel: "Keep it" });

    expect(screen.getByRole("button", { name: "Working..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Keep it" })).toBeDisabled();
  });

  it("labels itself for screen readers", () => {
    setup();
    expect(document.querySelector("dialog")).toHaveAttribute(
      "aria-labelledby",
      "confirm-title"
    );
  });
});
