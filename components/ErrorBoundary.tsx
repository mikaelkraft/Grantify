
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
        <div className="p-10 bg-[#fff0f0] text-[#900] font-sans">
          <h1 className="text-2xl mb-5">Something went wrong.</h1>
          <div className="p-5 bg-[#ffebeb] border border-[#ffcccc] rounded-md whitespace-pre-wrap">
            <h3 className="m-0 mb-2 text-[#c00]">{this.state.error?.toString()}</h3>
            <div className="text-xs text-[#666]">
              {this.state.errorInfo?.componentStack}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
