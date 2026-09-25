import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthField from "@/app/components/auth/AuthField";

/**
 * The field the login and register forms are built from. What matters is the
 * wiring a screen reader and a password manager depend on — the label pointing
 * at its own input, the hint being announced with it, and the reveal toggle
 * changing the input type rather than the value.
 */
describe("AuthField", () => {
  it("associates the label with its own input", async () => {
    const user = userEvent.setup();
    render(
      <>
        <AuthField
          label="Password"
          type="password"
          value=""
          onChange={vi.fn()}
        />
        <AuthField
          label="Confirm password"
          type="password"
          value=""
          onChange={vi.fn()}
        />
      </>
    );

    // Two fields on one page must not share an id, or the second label would
    // focus the first input.
    await user.click(screen.getByLabelText("Confirm password"));
    expect(screen.getByLabelText("Confirm password")).toHaveFocus();
    expect(screen.getByLabelText("Password")).not.toHaveFocus();
  });

  it("reports what the user typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AuthField label="Email" value="" onChange={onChange} />);

    await user.type(screen.getByLabelText("Email"), "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("reveals and re-hides the password without touching its value", async () => {
    const user = userEvent.setup();
    render(
      <AuthField
        label="Password"
        type="password"
        value="hunter22"
        onChange={vi.fn()}
      />
    );

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("hunter22");

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("does not submit the form it sits in", () => {
    render(
      <AuthField label="Password" type="password" value="" onChange={vi.fn()} />
    );
    expect(
      screen.getByRole("button", { name: /show password/i })
    ).toHaveAttribute("type", "button");
  });

  it("announces the hint with the input, and marks a failing field invalid", () => {
    const { rerender } = render(
      <AuthField
        label="Password"
        type="password"
        value="short"
        onChange={vi.fn()}
        hint="At least 8 characters."
      />
    );

    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      "At least 8 characters."
    );
    expect(screen.getByLabelText("Password")).not.toHaveAttribute(
      "aria-invalid"
    );

    rerender(
      <AuthField
        label="Password"
        type="password"
        value="short"
        onChange={vi.fn()}
        hint="A few more — 8 characters minimum."
        invalid
      />
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });
});
