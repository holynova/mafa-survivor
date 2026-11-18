import { SurvivorApp } from "./SurvivorApp";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initializeGameAssets,renderMetrics,setLobbyAssetSelection } from "./renderer";
import "./style.css";
import { game } from "./game";

const survivor=new URLSearchParams(location.search).has("survivor");
game.survivorMode=survivor;
setLobbyAssetSelection(survivor?"warrior":game.classId,game.mapId);
const root = createRoot(document.getElementById("root")!);
root.render(survivor ? <SurvivorApp /> : <App />);
initializeGameAssets();

// Development-only simulation handle for reproducible browser QA and profiling.
declare global {
  interface Window {
    __MAFA__?: typeof game;
    __MAFA_RENDER__?: typeof renderMetrics;
  }
}
if (import.meta.env.DEV) {window.__MAFA__ = game;window.__MAFA_RENDER__=renderMetrics;}
