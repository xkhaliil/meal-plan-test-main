import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "@/app/components/Pagination";

describe("Pagination", () => {
  it("renders nothing when everything fits on one page", () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onChange={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows every page while they fit", () => {
    render(<Pagination page={1} totalPages={5} onChange={vi.fn()} />);
    for (const n of [1, 2, 3, 4, 5]) {
      expect(
        screen.getByRole("button", { name: `Page ${n}` })
      ).toBeInTheDocument();
    }
  });

  it("windows long ranges around the current page, keeping the ends", () => {
    render(<Pagination page={6} totalPages={12} onChange={vi.fn()} />);

    // Ends and neighbours are reachable...
    for (const n of [1, 5, 6, 7, 12]) {
      expect(
        screen.getByRole("button", { name: `Page ${n}` })
      ).toBeInTheDocument();
    }
    // ...the rest are collapsed.
    expect(screen.queryByRole("button", { name: "Page 3" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Page 10" })).toBeNull();
  });

  it("marks the current page for assistive tech", () => {
    render(<Pagination page={3} totalPages={5} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("disables the arrows at each end", () => {
    const { unmount } = render(
      <Pagination page={1} totalPages={4} onChange={vi.fn()} />
    );
    expect(
      screen.getByRole("button", { name: "Previous page" })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
    unmount();

    render(<Pagination page={4} totalPages={4} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("reports the page the user asked for", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Pagination page={2} totalPages={4} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Page 4" }));
    expect(onChange).toHaveBeenCalledWith(4);

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
