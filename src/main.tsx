import React from "react";
import { createRoot } from "react-dom/client";
import { App, loadArtPositions } from "./App";
import { boot } from "./renderer";
import "./style.css";
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
loadArtPositions()
  .then(() => boot())
  .catch(() => document.dispatchEvent(new CustomEvent("asset-error")));
// Development-only simulation handle for reproducible browser QA and profiling.
import { game } from "./game";
declare global {
  interface Window {
    __MAFA__?: typeof game;
  }
}
if (import.meta.env.DEV) window.__MAFA__ = game;
