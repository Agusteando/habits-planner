import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PlannerProvider } from "./state/plannerStore";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <PlannerProvider>
        <App />
      </PlannerProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
