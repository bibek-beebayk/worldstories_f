// @vitest-environment jsdom

import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChipMultiSelect, SortPicker } from "./controls";

const sorts = [
  { value: "newest", label: "Newest", description: "Newest first." },
  { value: "oldest", label: "Oldest", description: "Oldest first." },
];

describe("home section controls", () => {
  it("moves and selects sort chips with arrow keys", () => {
    function Example() {
      const [value, setValue] = useState("newest");
      return <SortPicker options={sorts} value={value} onChange={setValue} />;
    }
    render(<Example />);
    const newest = screen.getByRole("radio", { name: "Newest" });
    newest.focus();
    fireEvent.keyDown(newest, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "Oldest" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Oldest first.")).toBeTruthy();
  });

  it("adds and removes multi-select chips", () => {
    function Example() {
      const [selected, setSelected] = useState<number[]>([]);
      return (
        <ChipMultiSelect
          label="Genres"
          options={[{ value: 1, label: "Folktale" }]}
          selected={selected}
          onChange={setSelected}
        />
      );
    }
    render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("option", { name: "Folktale" }));
    expect(screen.getByText("Folktale")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove Folktale" }));
    expect(screen.queryByRole("button", { name: "Remove Folktale" })).toBeNull();
  });
});
