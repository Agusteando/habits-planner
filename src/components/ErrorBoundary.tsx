import React from "react";

interface ErrorBoundaryState {
  error?: Error;
}

const KNOWN_STORAGE_KEYS = [
  "habit-planner-rpg-v6",
  "habit-planner-rpg-v7",
  "habit-planner-rpg-v8",
  "habit-planner-rpg-v9",
  "habit-planner-rpg-v10"
];

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fallback-screen">
          <section className="fallback-card">
            <h1>Planner could not start.</h1>
            <p>{this.state.error.message}</p>
            <button onClick={() => {
              for (const key of KNOWN_STORAGE_KEYS) localStorage.removeItem(key);
              location.reload();
            }}>
              Reset local plan
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
