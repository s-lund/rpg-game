import {
  deriveEntityBlueprint,
  getNeighbors,
  M2_SUBSET,
  type CampaignState,
  type SiteId,
  type WorldGraph,
  type WorldSite,
} from "../core/index";
import type { WorldMapSession } from "./world-map-session";

export interface WorldMapScreenOptions {
  onEnterSite?: () => void;
}

const SCREEN_ID = "emberwatch-world-map";
const TRAVEL_MS = 2800;

function siteLabel(graph: WorldGraph, siteId: SiteId): string {
  const site = graph.sites.find((s) => s.id === siteId);
  return site?.label ?? siteId;
}

function siteById(graph: WorldGraph, siteId: SiteId): WorldSite | undefined {
  return graph.sites.find((s) => s.id === siteId);
}

export class WorldMapScreen {
  private readonly root: HTMLDivElement;
  private readonly mapViewport: HTMLDivElement;
  private readonly mapSurface: HTMLDivElement;
  private readonly pathsSvg: SVGSVGElement;
  private readonly sitesLayer: HTMLDivElement;
  private readonly tokenEl: HTMLDivElement;
  private readonly currentSiteEl: HTMLDivElement;
  private readonly routesEl: HTMLDivElement;
  private readonly partyEl: HTMLDivElement;
  private readonly enterSiteEl: HTMLDivElement;
  private readonly errorEl: HTMLDivElement;
  private session: WorldMapSession | null = null;
  private graph: WorldGraph | null = null;
  private unsubscribe: (() => void) | null = null;
  private animating = false;
  private onEnterSite: (() => void) | null = null;
  private siteButtons = new Map<SiteId, HTMLButtonElement>();

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.id = SCREEN_ID;
    this.root.style.cssText = [
      "position: fixed",
      "inset: 0",
      "z-index: 9500",
      "display: none",
      "flex-direction: column",
      "align-items: center",
      "justify-content: flex-start",
      "overflow: auto",
      "padding: 20px 16px 28px",
      "background: #08080c",
      "color: #e8e4dc",
      "font: 14px/1.5 ui-sans-serif, system-ui, sans-serif",
    ].join(";");

    const title = document.createElement("h1");
    title.textContent = "Frontier overworld";
    title.style.cssText = "margin: 0 0 4px; font-size: 22px; font-weight: 600; color: #c9a86c;";
    this.root.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.textContent =
      "Travel between sites, then enter the current location to fight. Click reachable sites to move your party token.";
    subtitle.style.cssText = "margin: 0 0 16px; max-width: 820px; color: #9a9080; text-align: center;";
    this.root.appendChild(subtitle);

    const main = document.createElement("div");
    main.style.cssText = [
      "display: flex",
      "flex-wrap: wrap",
      "gap: 16px",
      "width: min(960px, 100%)",
      "align-items: flex-start",
      "justify-content: center",
    ].join(";");

    this.mapViewport = document.createElement("div");
    this.mapViewport.style.cssText = [
      "flex: 1 1 520px",
      "max-width: 640px",
      "min-width: 280px",
      "position: relative",
      "aspect-ratio: 4 / 3",
      "overflow: hidden",
      "align-self: flex-start",
      "isolation: isolate",
    ].join(";");

    this.mapSurface = document.createElement("div");
    this.mapSurface.style.cssText = [
      "position: absolute",
      "inset: 0",
      "border-radius: 10px",
      "overflow: hidden",
      "border: 2px solid rgba(120, 90, 50, 0.55)",
      "box-shadow: inset 0 0 80px rgba(0,0,0,0.55), 0 8px 32px rgba(0,0,0,0.45)",
      "background:",
      "radial-gradient(ellipse 90% 70% at 50% 40%, rgba(60,48,32,0.9) 0%, rgba(28,22,16,0.95) 55%, rgba(12,10,8,1) 100%),",
      "linear-gradient(160deg, #3a3020 0%, #1a1410 40%, #0e0c0a 100%)",
    ].join(" ");
    this.mapViewport.appendChild(this.mapSurface);

    this.pathsSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.pathsSvg.setAttribute("viewBox", "0 0 100 100");
    this.pathsSvg.setAttribute("preserveAspectRatio", "none");
    this.pathsSvg.style.cssText = [
      "position: absolute",
      "inset: 0",
      "width: 100%",
      "height: 100%",
      "pointer-events: none",
    ].join("; ");
    this.mapSurface.appendChild(this.pathsSvg);

    this.sitesLayer = document.createElement("div");
    this.sitesLayer.style.cssText = "position: absolute; inset: 0; pointer-events: none;";
    this.mapSurface.appendChild(this.sitesLayer);

    this.tokenEl = document.createElement("div");
    this.tokenEl.setAttribute("aria-label", "Party token");
    this.tokenEl.title = "Your party";
    this.tokenEl.style.cssText = [
      "position: absolute",
      "width: 28px",
      "height: 28px",
      "margin: -14px 0 0 -14px",
      "border-radius: 50%",
      "background: radial-gradient(circle at 35% 30%, #ffe8a0, #c9a030 45%, #8a6010 100%)",
      "border: 2px solid #fff8e0",
      "box-shadow: 0 2px 8px rgba(0,0,0,0.6), 0 0 12px rgba(255,200,80,0.5)",
      "z-index: 20",
      "pointer-events: none",
      "display: flex",
      "align-items: center",
      "justify-content: center",
      "font-size: 14px",
      "line-height: 1",
    ].join("; ");
    this.tokenEl.textContent = "⚔";
    this.mapSurface.appendChild(this.tokenEl);

    main.appendChild(this.mapViewport);

    const sidebar = document.createElement("div");
    sidebar.style.cssText = [
      "flex: 0 1 280px",
      "min-width: 240px",
      "display: flex",
      "flex-direction: column",
      "gap: 12px",
      "position: relative",
      "z-index: 30",
    ].join("; ");

    this.currentSiteEl = document.createElement("div");
    this.currentSiteEl.style.cssText = [
      "padding: 14px 16px",
      "background: rgba(20, 18, 14, 0.92)",
      "border: 1px solid rgba(120, 90, 50, 0.45)",
      "border-radius: 8px",
    ].join("; ");
    sidebar.appendChild(this.currentSiteEl);

    this.enterSiteEl = document.createElement("div");
    this.enterSiteEl.style.cssText = "margin-bottom: 4px;";
    sidebar.appendChild(this.enterSiteEl);

    const routesTitle = document.createElement("div");
    routesTitle.textContent = "Reachable from here";
    routesTitle.style.cssText = "font-size: 12px; font-weight: 600; color: #9a9080; text-transform: uppercase; letter-spacing: 0.04em;";
    sidebar.appendChild(routesTitle);

    this.routesEl = document.createElement("div");
    this.routesEl.style.cssText = "display: flex; flex-direction: column; gap: 6px;";
    sidebar.appendChild(this.routesEl);

    const partyTitle = document.createElement("div");
    partyTitle.textContent = "Your party";
    partyTitle.style.cssText = "font-size: 12px; font-weight: 600; color: #9a9080; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px;";
    sidebar.appendChild(partyTitle);

    this.partyEl = document.createElement("div");
    this.partyEl.style.cssText = [
      "padding: 10px 14px",
      "background: rgba(20, 18, 14, 0.7)",
      "border: 1px solid rgba(80, 70, 55, 0.4)",
      "border-radius: 6px",
      "color: #a8a090",
      "font-size: 13px",
    ].join("; ");
    sidebar.appendChild(this.partyEl);

    this.errorEl = document.createElement("div");
    this.errorEl.style.cssText = "color: #ff8a80; min-height: 18px; font-size: 13px;";
    sidebar.appendChild(this.errorEl);

    main.appendChild(sidebar);
    this.root.appendChild(main);
    container.appendChild(this.root);
  }

  bind(session: WorldMapSession, graph: WorldGraph, options?: WorldMapScreenOptions): void {
    this.unsubscribe?.();
    this.session = session;
    this.graph = graph;
    this.onEnterSite = options?.onEnterSite ?? null;
    this.buildMapChrome(graph);
    this.unsubscribe = session.subscribe(() => this.refresh());
    this.refresh();
    this.snapTokenTo(session.getState().currentSiteId);
  }

  show(): void {
    this.root.style.display = "flex";
  }

  hide(): void {
    this.root.style.display = "none";
  }

  private buildMapChrome(graph: WorldGraph): void {
    this.drawPaths(graph);
    this.sitesLayer.replaceChildren();
    this.siteButtons.clear();

    for (const site of graph.sites) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.siteId = site.id;
      btn.title = site.label;
      btn.style.cssText = [
        "position: absolute",
        `left: ${site.mapX}%`,
        `top: ${site.mapY}%`,
        "transform: translate(-50%, -50%)",
        "display: flex",
        "flex-direction: column",
        "align-items: center",
        "gap: 4px",
        "padding: 0",
        "border: none",
        "background: transparent",
        "cursor: default",
        "z-index: 10",
        "pointer-events: auto",
      ].join("; ");

      const marker = document.createElement("span");
      marker.style.cssText = [
        "width: 22px",
        "height: 22px",
        "border-radius: 50%",
        "background: radial-gradient(circle at 40% 35%, #6a5a48, #3a3028)",
        "border: 2px solid rgba(180, 150, 100, 0.5)",
        "box-shadow: 0 2px 6px rgba(0,0,0,0.5)",
        "transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s",
      ].join("; ");
      btn.appendChild(marker);

      const label = document.createElement("span");
      label.textContent = site.label;
      label.style.cssText = [
        "max-width: 100px",
        "font-size: 11px",
        "font-weight: 600",
        "color: #d8d0c0",
        "text-align: center",
        "text-shadow: 0 1px 3px rgba(0,0,0,0.9)",
        "line-height: 1.2",
        "pointer-events: none",
      ].join("; ");
      btn.appendChild(label);

      btn.addEventListener("click", () => this.handleSiteClick(site.id));
      this.sitesLayer.appendChild(btn);
      this.siteButtons.set(site.id, btn);
    }
  }

  private drawPaths(graph: WorldGraph): void {
    this.pathsSvg.replaceChildren();
    const drawn = new Set<string>();

    for (const edge of graph.edges) {
      const from = siteById(graph, edge.from);
      const to = siteById(graph, edge.to);
      if (!from || !to) continue;

      const key = [edge.from, edge.to].sort().join("|");
      if (drawn.has(key)) continue;
      drawn.add(key);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(from.mapX));
      line.setAttribute("y1", String(from.mapY));
      line.setAttribute("x2", String(to.mapX));
      line.setAttribute("y2", String(to.mapY));
      line.setAttribute("stroke", "rgba(160, 130, 80, 0.35)");
      line.setAttribute("stroke-width", "0.6");
      line.setAttribute("stroke-dasharray", "2 1.5");
      this.pathsSvg.appendChild(line);
    }
  }

  private refresh(): void {
    if (!this.session || !this.graph) return;
    const state = this.session.getState();
    this.renderSidebar(state, this.graph);
    this.updateSiteMarkers(state, this.graph);
    if (!this.animating) {
      this.snapTokenTo(state.currentSiteId);
    }
  }

  private renderSidebar(state: CampaignState, graph: WorldGraph): void {
    const currentLabel = siteLabel(graph, state.currentSiteId);
    const neighbors = getNeighbors(graph, state.currentSiteId);

    this.currentSiteEl.innerHTML = [
      "<div style='font-size:11px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.04em'>You are here</div>",
      `<div style='font-size:18px;font-weight:600;color:#e8c878'>${escapeHtml(currentLabel)}</div>`,
      this.animating
        ? "<div style='font-size:12px;color:#9a9080;margin-top:6px'>Traveling…</div>"
        : "",
    ].join("");

    this.enterSiteEl.replaceChildren();
    if (!this.animating && this.onEnterSite) {
      const enterBtn = document.createElement("button");
      enterBtn.type = "button";
      enterBtn.textContent = "Enter site";
      enterBtn.style.cssText = [
        "cursor: pointer",
        "width: 100%",
        "padding: 10px 14px",
        "border: 1px solid rgba(232, 160, 48, 0.65)",
        "border-radius: 6px",
        "background: rgba(180, 120, 30, 0.28)",
        "color: #f0d890",
        "font: 700 14px/1 ui-sans-serif, system-ui, sans-serif",
      ].join("; ");
      enterBtn.addEventListener("click", () => this.onEnterSite?.());
      this.enterSiteEl.appendChild(enterBtn);
    }

    this.routesEl.replaceChildren();
    if (neighbors.length === 0) {
      const none = document.createElement("p");
      none.textContent = "No routes from here.";
      none.style.cssText = "margin: 0; color: #888; font-size: 13px;";
      this.routesEl.appendChild(none);
    } else {
      for (const neighborId of neighbors) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = siteLabel(graph, neighborId);
        btn.disabled = this.animating;
        btn.style.cssText = [
          "cursor: pointer",
          "padding: 8px 12px",
          "border: 1px solid rgba(160, 130, 80, 0.45)",
          "border-radius: 5px",
          "background: rgba(80, 60, 35, 0.25)",
          "color: #d8c8a0",
          "font: 600 13px/1 ui-sans-serif, system-ui, sans-serif",
          "text-align: left",
        ].join("; ");
        if (this.animating) {
          btn.style.opacity = "0.45";
          btn.style.cursor = "not-allowed";
        }
        btn.addEventListener("click", () => this.handleSiteClick(neighborId));
        this.routesEl.appendChild(btn);
      }
    }

    this.partyEl.innerHTML = state.party.members
      .map((m) => {
        const slot = M2_SUBSET.partySlots.find((s) => s.classId === m.classId);
        const spawn = slot?.spawn ?? { x: 0, y: 0 };
        const maxHp = deriveEntityBlueprint(m, spawn).maxHp;
        return `<div style='margin:3px 0'><strong style='color:#e8e4dc'>${escapeHtml(m.name)}</strong> · ${escapeHtml(m.classId)} · <span style='color:#c9b890'>${m.currentHp}/${maxHp} HP</span></div>`;
      })
      .join("");
  }

  private updateSiteMarkers(state: CampaignState, graph: WorldGraph): void {
    const neighbors = new Set(getNeighbors(graph, state.currentSiteId));

    for (const site of graph.sites) {
      const btn = this.siteButtons.get(site.id);
      if (!btn) continue;

      const marker = btn.querySelector("span");
      if (!marker) continue;

      const isCurrent = site.id === state.currentSiteId;
      const isReachable = neighbors.has(site.id);

      btn.style.cursor = isReachable && !this.animating ? "pointer" : "default";
      btn.style.opacity = isCurrent || isReachable ? "1" : "0.45";

      if (isCurrent) {
        marker.style.border = "2px solid #e8a030";
        marker.style.boxShadow = "0 0 12px rgba(232, 160, 48, 0.7), 0 2px 6px rgba(0,0,0,0.5)";
        marker.style.transform = "scale(1.15)";
      } else if (isReachable && !this.animating) {
        marker.style.border = "2px solid #8ecf6a";
        marker.style.boxShadow = "0 0 10px rgba(120, 200, 90, 0.5), 0 2px 6px rgba(0,0,0,0.5)";
        marker.style.transform = "scale(1.08)";
      } else {
        marker.style.border = "2px solid rgba(180, 150, 100, 0.5)";
        marker.style.boxShadow = "0 2px 6px rgba(0,0,0,0.5)";
        marker.style.transform = "scale(1)";
      }
    }
  }

  private snapTokenTo(siteId: SiteId): void {
    const site = this.graph ? siteById(this.graph, siteId) : undefined;
    if (!site) return;
    this.tokenEl.style.transition = "none";
    this.tokenEl.style.left = `${site.mapX}%`;
    this.tokenEl.style.top = `${site.mapY}%`;
    void this.tokenEl.offsetHeight;
    this.tokenEl.style.transition = `left ${TRAVEL_MS}ms ease-in-out, top ${TRAVEL_MS}ms ease-in-out`;
  }

  private animateTokenTo(siteId: SiteId, onComplete: () => void): void {
    const site = this.graph ? siteById(this.graph, siteId) : undefined;
    if (!site) return;

    this.animating = true;
    this.tokenEl.style.transition = `left ${TRAVEL_MS}ms ease-in-out, top ${TRAVEL_MS}ms ease-in-out`;
    this.tokenEl.style.left = `${site.mapX}%`;
    this.tokenEl.style.top = `${site.mapY}%`;

    const finish = (): void => {
      this.tokenEl.removeEventListener("transitionend", finish);
      this.animating = false;
      onComplete();
    };
    this.tokenEl.addEventListener("transitionend", finish);
    this.refresh();
  }

  private handleSiteClick(targetSiteId: SiteId): void {
    if (this.animating || !this.session || !this.graph) return;

    const state = this.session.getState();
    if (targetSiteId === state.currentSiteId) return;

    const neighbors = getNeighbors(this.graph, state.currentSiteId);
    if (!neighbors.includes(targetSiteId)) {
      this.errorEl.textContent = "No route to that site from here.";
      return;
    }

    this.errorEl.textContent = "";
    const graph = this.graph;
    const session = this.session;

    this.animateTokenTo(targetSiteId, () => {
      const moved = session.travelTo(graph, targetSiteId);
      if (!moved) {
        this.errorEl.textContent = "Travel failed.";
        this.snapTokenTo(session.getState().currentSiteId);
      }
      this.refresh();
    });
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
