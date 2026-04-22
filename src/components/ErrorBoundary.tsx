"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-sm text-[#2B0D3E]/60">
          <span className="text-2xl">⚠</span>
          <p>Something went wrong. Try refreshing the page.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-1 rounded-lg border border-[#C9A8E0] px-3 py-1.5 text-xs font-medium text-[#7A3F91] hover:bg-[#F2EAF7] transition"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
