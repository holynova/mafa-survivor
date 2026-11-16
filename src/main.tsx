import { SurvivorApp } from "./SurvivorApp";
import React from "react";
import { createRoot } from "react-dom/client";
import { App, loadArtPositions } from "./App";
import { boot,renderMetrics } from "./renderer";
import "./style.css";
const root = createRoot(document.getElementById("root")!);
root.render(new URLSearchParams(location.search).has("survivor") ? <SurvivorApp /> : <App />);
loadArtPositions()
  .then(() => boot())
  .catch(() => document.dispatchEvent(new CustomEvent("asset-error")));
// Development-only simulation handle for reproducible browser QA and profiling.
import { game } from "./game";
declare global {
  interface Window {
    __MAFA__?: typeof game;
    __MAFA_RENDER__?: typeof renderMetrics;
  }
}
if (import.meta.env.DEV) {window.__MAFA__ = game;window.__MAFA_RENDER__=renderMetrics;}
