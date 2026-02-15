import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled app error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Unexpected error
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              The app hit an unexpected error. You can retry or return home.
            </p>
            <div className="flex gap-2">
              <Button onClick={this.handleRetry}>Try again</Button>
              <Button asChild variant="outline">
                <a href="/">Go to home</a>
              </Button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
