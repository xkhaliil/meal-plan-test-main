import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import RichText from "@/app/components/RichText";

/**
 * This renders text written by a language model, so the security property —
 * markup in, markup *not* out — matters as much as the formatting.
 */
describe("RichText", () => {
  it("renders bold runs", () => {
    render(<RichText content="Add **two eggs** and stir." />);
    expect(screen.getByText("two eggs").tagName).toBe("STRONG");
  });

  it("groups bullet lines into a list", () => {
    render(<RichText content={"Shopping:\n- Flour\n- Sugar"} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual(["Flour", "Sugar"]);
  });

  it("keeps numbered steps ordered", () => {
    const { container } = render(
      <RichText content={"1. Heat the pan\n2. Sear the steak"} />
    );
    expect(container.querySelector("ol")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("keeps one list when the model leaves blank lines between items", () => {
    // How models actually write lists. Each blank line used to close the
    // list, so every item rendered as its own list, numbered "1.".
    const { container } = render(
      <RichText
        content={
          "Options:\n\n1. Salmon\n\n2. Tacos\n\n3. Stir fry\n\nWhich one?"
        }
      />
    );
    expect(container.querySelectorAll("ol")).toHaveLength(1);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Which one?").tagName).toBe("P");
  });

  it("continues the model's numbering when a list resumes", () => {
    const { container } = render(
      <RichText content={"1. Prep\n2. Sear\nThen rest it.\n3. Slice"} />
    );
    const lists = container.querySelectorAll("ol");
    expect(lists).toHaveLength(2);
    expect(lists[1].getAttribute("start")).toBe("3");
  });

  it("starts a new list when the kind changes", () => {
    const { container } = render(
      <RichText content={"- Bullet\n1. Numbered"} />
    );
    expect(container.querySelectorAll("ul")).toHaveLength(1);
    expect(container.querySelectorAll("ol")).toHaveLength(1);
  });

  it("renders headings as text, not as markup", () => {
    render(<RichText content="### Method" />);
    expect(screen.getByText("Method")).toBeInTheDocument();
  });

  it("does not interpret HTML from the model", () => {
    const { container } = render(
      <RichText content={'<img src=x onerror="alert(1)"> <b>bold?</b>'} />
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<img");
  });
});
