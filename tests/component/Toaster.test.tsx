import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
// `act` from Testing Library, not from react: it sets the act environment
// flag React looks for, which a direct import does not.
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Toaster from "@/app/components/Toaster";
import { toast, useToastStore } from "@/lib/stores/toastStore";

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Toaster", () => {
  it("announces an error and stays polite about a success", async () => {
    render(<Toaster />);

    act(() => toast.error("Could not delete that recipe."));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not delete that recipe."
    );

    act(() => toast.success("Subscription cancelled."));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Subscription cancelled."
    );
  });

  it("does not stack the same failure twice", () => {
    render(<Toaster />);

    act(() => {
      toast.error("Couldn't reach the server.");
      toast.error("Couldn't reach the server.");
    });

    // A retried action that fails the same way shouldn't pile up.
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("can be dismissed by hand", async () => {
    const user = userEvent.setup();
    render(<Toaster />);

    act(() => toast.error("Something went wrong."));
    await user.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("expires on its own", () => {
    vi.useFakeTimers();
    render(<Toaster />);

    act(() => toast.success("Saved."));
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4100));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps the live region in the DOM before anything is shown", () => {
    const { container } = render(<Toaster />);
    // A region that appears at the same moment as its first message is often
    // missed by a screen reader.
    expect(container.querySelector("[aria-live]")).not.toBeNull();
  });
});
