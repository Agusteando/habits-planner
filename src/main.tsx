import React, { Component, ErrorInfo, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { PlannerProvider } from "./state/PlannerContext";
import { DragProvider } from "./state/DragContext";
import "./styles.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return <main className="crash"><h1>Planner could not start.</h1><p>{this.state.error.message}</p><button onClick={() => { localStorage.removeItem("habit-planner-rpg-v5"); location.reload(); }}>Reset local plan</button></main>;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary><PlannerProvider><DragProvider><App /></DragProvider></PlannerProvider></ErrorBoundary>
  </React.StrictMode>
);
