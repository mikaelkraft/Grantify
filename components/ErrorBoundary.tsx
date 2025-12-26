
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", backgroundColor: "#fff0f0", color: "#900", fontFamily: "sans-serif" }}>
          <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>Something went wrong.</h1>
          <div style={{ padding: "20px", backgroundColor: "#ffebeb", border: "1px solid #ffcccc", borderRadius: "5px", whiteSpace: "pre-wrap" }}>
            <h3 style={{ margin: "0 0 10px", color: "#c00" }}>{this.state.error?.toString()}</h3>
            <div style={{ fontSize: "12px", color: "#666" }}>
              {this.state.errorInfo?.componentStack}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
