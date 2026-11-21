// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import NewsletterConfirm from "./NewsletterConfirm";
import NewsletterUnsubscribe from "./NewsletterUnsubscribe";

const api = vi.hoisted(() => ({
  confirm: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  unsubscribeByEmail: vi.fn(),
  resubscribe: vi.fn(),
}));

vi.mock("@/api/newsletter", () => ({ newsletterApi: api }));
vi.mock("@/hooks/useHomeData", () => ({ useHomeData: () => ({ data: undefined }) }));

const renderPage = (element: React.ReactNode, url: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}>{element}</MemoryRouter>
    </QueryClientProvider>,
  );

afterEach(cleanup);
beforeEach(() => Object.values(api).forEach((mock) => mock.mockReset()));

describe("NewsletterConfirm", () => {
  it("confirms a token in a client effect", async () => {
    api.confirm.mockResolvedValue({ status: "confirmed", email: "reader@example.com" });
    renderPage(<NewsletterConfirm />, "/newsletter/confirm?token=good-token");
    expect(screen.getByText("Confirming your subscription…")).toBeInTheDocument();
    expect(await screen.findByText("You’re on the list")).toBeInTheDocument();
    expect(api.confirm).toHaveBeenCalledWith("good-token");
  });

  it("offers a fresh link for an expired token", async () => {
    api.confirm.mockRejectedValue(new ApiError("expired", 400));
    renderPage(<NewsletterConfirm />, "/newsletter/confirm?token=expired-token");
    expect(await screen.findByText("That confirmation link has expired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send a fresh link" })).toBeInTheDocument();
  });
});

describe("NewsletterUnsubscribe", () => {
  it("unsubscribes a valid token in a client effect", async () => {
    api.unsubscribe.mockResolvedValue({ status: "unsubscribed" });
    renderPage(<NewsletterUnsubscribe />, "/newsletter/unsubscribe?token=good-token");
    expect(await screen.findByText("You’re unsubscribed")).toBeInTheDocument();
    expect(api.unsubscribe).toHaveBeenCalledWith("good-token");
  });

  it("shows the email fallback for an unknown token", async () => {
    api.unsubscribe.mockRejectedValue(new ApiError("missing", 404));
    renderPage(<NewsletterUnsubscribe />, "/newsletter/unsubscribe?token=missing-token");
    expect(await screen.findByText("Unsubscribe by email")).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });
});
