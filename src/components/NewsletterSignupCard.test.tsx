// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NewsletterSignupCard from "./NewsletterSignupCard";

const state = vi.hoisted(() => ({
  loggedIn: false,
  status: undefined as undefined | { status: "none" | "pending" | "confirmed" | "unsubscribed"; email: string },
  subscribe: vi.fn(),
  updateMe: vi.fn(),
}));

vi.mock("@/hooks/useIsLoggedIn", () => ({ useIsLoggedIn: () => state.loggedIn }));
vi.mock("@/hooks/useNewsletterStatus", () => ({
  NEWSLETTER_STATUS_QUERY_KEY: ["newsletter-status"],
  useNewsletterStatus: () => ({ data: state.status }),
}));
vi.mock("@/api/newsletter", () => ({
  newsletterApi: { subscribe: state.subscribe, updateMe: state.updateMe },
}));

const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NewsletterSignupCard variant="blog" source="blog" />
    </QueryClientProvider>,
  );

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  state.loggedIn = false;
  state.status = undefined;
  state.subscribe.mockReset().mockResolvedValue({ detail: "sent" });
  state.updateMe.mockReset().mockResolvedValue({ status: "confirmed", email: "reader@example.com" });
});

describe("NewsletterSignupCard", () => {
  it("moves from the email form to Check your inbox and can reset", async () => {
    renderCard();
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "reader@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send me the digest" }));
    await screen.findByText("Check your inbox");
    expect(state.subscribe).toHaveBeenCalledWith("reader@example.com", "blog");
    fireEvent.click(screen.getByRole("button", { name: "Use another email" }));
    expect(screen.getByRole("button", { name: "Send me the digest" })).toBeInTheDocument();
  });

  it("shows an error and keeps the form available", async () => {
    state.subscribe.mockRejectedValue(new Error("Email service unavailable"));
    renderCard();
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "reader@example.com" } });
    fireEvent.submit(screen.getByRole("button", { name: "Send me the digest" }).closest("form")!);
    expect(await screen.findByRole("status")).toHaveTextContent("Email service unavailable");
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });

  it("lets a logged-in reader turn the digest on with one button", async () => {
    state.loggedIn = true;
    state.status = { status: "none", email: "reader@example.com" };
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Turn on weekly digest" }));
    await waitFor(() => expect(state.updateMe).toHaveBeenCalledWith(true, "blog"));
  });

  it("stays hidden for a confirmed reader", () => {
    state.loggedIn = true;
    state.status = { status: "confirmed", email: "reader@example.com" };
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
  });
});
