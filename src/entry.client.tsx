import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { installChunkLoadRecovery } from "@/lib/pwaRecovery";

installChunkLoadRecovery();

hydrateRoot(
  document,
  <StrictMode>
    <AppErrorBoundary>
      <HydratedRouter />
    </AppErrorBoundary>
  </StrictMode>
);
