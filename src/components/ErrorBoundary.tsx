import React from "react";

interface ErrorBoundaryState {
  error?: Error;
}

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
              localStorage.removeItem("habit-planner-rpg-v6");
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
