import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  canRecoverStaleBuild,
  isChunkLoadError,
  recoverFromStaleBuild,
} from "@/lib/pwaRecovery";

type AppErrorBoundaryProps = { children: ReactNode };
type AppErrorBoundaryState = { error: Error | null; recovering: boolean };

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null, recovering: false };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error, recovering: false };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (isChunkLoadError(error) && canRecoverStaleBuild()) {
      this.setState({ recovering: true });
      void recoverFromStaleBuild();
    }
  }

  private reload = () => window.location.reload();

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10 text-foreground">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-lg">
          {this.state.recovering ? (
            <RefreshCw className="mx-auto h-9 w-9 animate-spin text-primary" />
          ) : (
            <AlertTriangle className="mx-auto h-9 w-9 text-primary" />
          )}
          <h1 className="mt-4 text-xl font-semibold">
            {this.state.recovering ? "Updating WorldStories" : "WorldStories could not load"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {this.state.recovering
              ? "A newer version is available. The app will reopen automatically."
              : navigator.onLine
                ? "Please reload the app. Your downloads and reading progress will remain on this device."
                : "This page is not currently available offline. Reconnect and try again."}
          </p>
          {!this.state.recovering && (
            <Button className="mt-5 gap-2" onClick={this.reload}>
              <RefreshCw className="h-4 w-4" />
              Reload app
            </Button>
          )}
        </div>
      </main>
    );
  }
}

export default AppErrorBoundary;
