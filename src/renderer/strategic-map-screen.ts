import {
  countHeldSites,
  deriveEntityBlueprint,
  findTravelPath,
  getSiteControl,
  getTravelDestinations,
  isSiteHeld,
  M2_SUBSET,
  type CampaignState,
  type SiteId,
  type WorldGraph,
  type WorldSite,
} from "../core/index";
import type { WorldMapSession } from "./world-map-session";

export type StrategicMapLayer = "world" | "district";

export interface WorldMapBindOptions {
  onTravelArrived?: (siteId: SiteId) => void;
  onEnterDistrict?: () => void;
  interiorGraph?: WorldGraph | null;
}

export interface DistrictMapBindOptions {
  districtLabel: string;
  onAreaArrived?: (siteId: SiteId) => void;
  onReturnToWorldMap?: () => void;
  canReturnToWorldMap?: () => boolean;
}

const TRAVEL_MS = 2800;

function siteLabel(graph: WorldGraph, siteId: SiteId): string {
  const site = graph.sites.find((s) => s.id === siteId);
  return site?.label ?? siteId;
}

function siteById(graph: WorldGraph, siteId: SiteId): WorldSite | undefined {
  return graph.sites.find((s) => s.id === siteId);
}

function stateForRouting(state: CampaignState, layer: StrategicMapLayer): CampaignState {
  if (layer === "district" && state.currentAreaSiteId) {
    return { ...state, currentSiteId: state.currentAreaSiteId };
  }
  return state;
}

function currentPosition(state: CampaignState, layer: StrategicMapLayer): SiteId {
  if (layer === "district" && state.currentAreaSiteId) {
    return state.currentAreaSiteId;
  }
  return state.currentSiteId;
}

/** Shared parchment-style strategic map — world map and district map use the same UI. */
export class StrategicMapScreen {
  private readonly layer: StrategicMapLayer;
  private readonly root: HTMLDivElement;
  private readonly titleEl: HTMLHeadingElement;
  private readonly subtitleEl: HTMLParagraphElement;
  private readonly mapViewport: HTMLDivElement;
  private readonly mapSurface: HTMLDivElement;
  private readonly pathsSvg: SVGSVGElement;
  private readonly sitesLayer: HTMLDivElement;
  private readonly tokenEl: HTMLDivElement;
  private readonly currentSiteEl: HTMLDivElement;
  private readonly routesEl: HTMLDivElement;
  private readonly partyEl: HTMLDivElement;
  private readonly actionEl: HTMLDivElement;
  private readonly errorEl: HTMLDivElement;
  private session: WorldMapSession | null = null;
  private graph: WorldGraph | null = null;
  private unsubscribe: (() => void) | null = null;
  private animating = false;
  private siteButtons = new Map<SiteId, HTMLButtonElement>();

  private onTravelArrived: ((siteId: SiteId) => void) | null = null;
  private onEnterDistrict: (() => void) | null = null;
  private onAreaArrived: ((siteId: SiteId) => void) | null = null;
  private onReturnToWorldMap: (() => void) | null = null;
  private canReturnToWorldMap: (() => boolean) | null = null;
  private interiorGraph: WorldGraph | null = null;
  private districtTravelHandler: ((targetSiteId: SiteId) => boolean) | null = null;

  constructor(container: HTMLElement, layer: StrategicMapLayer) {
    this.layer = layer;
    const screenId = layer === "world" ? "emberwatch-world-map" : "emberwatch-district-map";

    this.root = document.createElement("div");
    this.root.id = screenId;
    this.root.style.cssText = [
      "position: fixed",
      "inset: 0",
      layer === "world" ? "z-index: 9500" : "z-index: 9510",
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

    this.titleEl = document.createElement("h1");
    this.titleEl.style.cssText = "margin: 0 0 4px; font-size: 22px; font-weight: 600; color: #c9a86c;";
    this.root.appendChild(this.titleEl);

    this.subtitleEl = document.createElement("p");
    this.subtitleEl.style.cssText = "margin: 0 0 16px; max-width: 820px; color: #9a9080; text-align: center;";
    this.root.appendChild(this.subtitleEl);

    if (layer === "world") {
      this.titleEl.textContent = "Frontier world map";
      this.subtitleEl.textContent =
        "Travel to a location on the map, then enter it to explore within.";
    } else {
      this.titleEl.textContent = "District";
      this.subtitleEl.textContent =
        "Move between areas on the map. Hostile areas trigger encounters when you arrive.";
    }

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
    ].join("; ");

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

    this.actionEl = document.createElement("div");
    sidebar.appendChild(this.actionEl);

    const routesTitle = document.createElement("div");
    routesTitle.textContent = "Reachable from here";
    routesTitle.style.cssText =
      "font-size: 12px; font-weight: 600; color: #9a9080; text-transform: uppercase; letter-spacing: 0.04em;";
    sidebar.appendChild(routesTitle);

    this.routesEl = document.createElement("div");
    this.routesEl.style.cssText = "display: flex; flex-direction: column; gap: 6px;";
    sidebar.appendChild(this.routesEl);

    const partyTitle = document.createElement("div");
    partyTitle.textContent = "Your party";
    partyTitle.style.cssText =
      "font-size: 12px; font-weight: 600; color: #9a9080; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px;";
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

  bindWorld(session: WorldMapSession, graph: WorldGraph, options?: WorldMapBindOptions): void {
    this.resetBindings();
    this.session = session;
    this.graph = graph;
    this.onTravelArrived = options?.onTravelArrived ?? null;
    this.onEnterDistrict = options?.onEnterDistrict ?? null;
    this.interiorGraph = options?.interiorGraph ?? null;
    this.buildMapChrome(graph);
    this.unsubscribe = session.subscribe(() => this.refresh());
    this.refresh();
    this.snapTokenTo(currentPosition(session.getState(), this.layer));
  }

  bindDistrict(
    session: WorldMapSession,
    graph: WorldGraph,
    options: DistrictMapBindOptions & {
      onTravel: (targetSiteId: SiteId) => boolean;
    },
  ): void {
    this.resetBindings();
    this.session = session;
    this.graph = graph;
    this.districtTravelHandler = options.onTravel;
    this.onAreaArrived = options.onAreaArrived ?? null;
    this.onReturnToWorldMap = options.onReturnToWorldMap ?? null;
    this.canReturnToWorldMap = options.canReturnToWorldMap ?? null;
    this.titleEl.textContent = options.districtLabel;
    this.subtitleEl.textContent =
      "District map — click reachable areas to move. Only the entrance returns to the world map.";
    this.buildMapChrome(graph);
    this.unsubscribe = session.subscribe(() => this.refresh());
    this.refresh();
    this.snapTokenTo(currentPosition(session.getState(), this.layer));
  }

  show(): void {
    this.root.style.display = "flex";
  }

  hide(): void {
    this.root.style.display = "none";
  }

  private resetBindings(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.districtTravelHandler = null;
    this.onTravelArrived = null;
    this.onEnterDistrict = null;
    this.onAreaArrived = null;
    this.onReturnToWorldMap = null;
    this.canReturnToWorldMap = null;
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
        "max-width: 110px",
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
      this.snapTokenTo(currentPosition(state, this.layer));
    }
  }

  private renderSidebar(state: CampaignState, graph: WorldGraph): void {
    const pos = currentPosition(state, this.layer);
    const currentLabel = siteLabel(graph, pos);
    const routingState = stateForRouting(state, this.layer);
    const destinations = getTravelDestinations(routingState, graph);

    const currentSite = siteById(graph, pos);
    const tier = currentSite?.tier ?? 1;
    const control = getSiteControl(state, pos);
    const progressGraph = this.layer === "district" ? graph : (this.interiorGraph ?? graph);
    const { held, total } = countHeldSites(state, progressGraph);
    const progressLabel = this.layer === "district" ? "Areas secured" : "Districts";

    const breadcrumb =
      this.layer === "district"
        ? "<div style='font-size:11px;color:#666;margin-bottom:6px'>World map → district</div>"
        : "";

    this.currentSiteEl.innerHTML = [
      breadcrumb,
      "<div style='font-size:11px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.04em'>You are here</div>",
      `<div style='font-size:18px;font-weight:600;color:#e8c878'>${escapeHtml(currentLabel)}</div>`,
      `<div style='font-size:12px;color:#9a9080;margin-top:4px'>Tier ${tier} · ${control === "held" ? "Held" : "Hostile"}</div>`,
      `<div style='font-size:12px;color:#7ab8a8;margin-top:4px'>${progressLabel}: ${held}/${total}</div>`,
      this.animating
        ? "<div style='font-size:12px;color:#9a9080;margin-top:6px'>Traveling…</div>"
        : "",
    ].join("");

    this.actionEl.replaceChildren();
    if (!this.animating) {
      if (this.layer === "world" && currentSite?.districtId && this.onEnterDistrict) {
        const enterBtn = document.createElement("button");
        enterBtn.type = "button";
        enterBtn.textContent = `Enter ${currentSite.label}`;
        enterBtn.style.cssText = this.primaryButtonStyle("rgba(40, 70, 100, 0.35)", "rgba(120, 180, 220, 0.55)", "#b8d8f0");
        enterBtn.addEventListener("click", () => this.onEnterDistrict?.());
        this.actionEl.appendChild(enterBtn);
      } else if (this.layer === "district" && this.canReturnToWorldMap?.() && this.onReturnToWorldMap) {
        const backBtn = document.createElement("button");
        backBtn.type = "button";
        backBtn.textContent = "Return to world map";
        backBtn.style.cssText = this.primaryButtonStyle("rgba(60, 50, 35, 0.5)", "rgba(160, 130, 80, 0.5)", "#d8c8a0");
        backBtn.addEventListener("click", () => this.onReturnToWorldMap?.());
        this.actionEl.appendChild(backBtn);
      } else if (this.layer === "district") {
        const hint = document.createElement("p");
        hint.textContent = "Move deeper into the district — return to the world map from the entrance.";
        hint.style.cssText = "margin: 0; color: #888; font-size: 12px; line-height: 1.4;";
        this.actionEl.appendChild(hint);
      } else {
        const hint = document.createElement("p");
        hint.textContent = "Click a reachable location on the map.";
        hint.style.cssText = "margin: 0; color: #888; font-size: 12px; line-height: 1.4;";
        this.actionEl.appendChild(hint);
      }
    }

    this.routesEl.replaceChildren();
    if (destinations.length === 0) {
      const none = document.createElement("p");
      none.textContent = "No routes from here.";
      none.style.cssText = "margin: 0; color: #888; font-size: 13px;";
      this.routesEl.appendChild(none);
    } else {
      for (const destId of destinations) {
        const btn = document.createElement("button");
        btn.type = "button";
        const destControl = isSiteHeld(state, destId) ? " · Held" : " · Hostile";
        btn.textContent = `${siteLabel(graph, destId)}${destControl}`;
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
        btn.addEventListener("click", () => this.handleSiteClick(destId));
        this.routesEl.appendChild(btn);
      }
    }

    this.partyEl.innerHTML = state.party.members
      .map((m) => {
        const slot = M2_SUBSET.partySlots.find((s) => s.classId === m.classId);
        const spawn = slot?.spawn ?? { x: 0, y: 0 };
        const blueprint = deriveEntityBlueprint(m, spawn);
        return `<div style='margin:3px 0'><strong style='color:#e8e4dc'>${escapeHtml(m.name)}</strong> · ${escapeHtml(m.classId)} · <span style='color:#c9b890'>${m.currentHp}/${blueprint.maxHp} HP</span></div>`;
      })
      .join("");
  }

  private primaryButtonStyle(bg: string, border: string, color: string): string {
    return [
      "cursor: pointer",
      "width: 100%",
      "padding: 10px 14px",
      `border: 1px solid ${border}`,
      "border-radius: 6px",
      `background: ${bg}`,
      `color: ${color}`,
      "font: 700 14px/1 ui-sans-serif, system-ui, sans-serif",
    ].join("; ");
  }

  private updateSiteMarkers(state: CampaignState, graph: WorldGraph): void {
    const routingState = stateForRouting(state, this.layer);
    const pos = currentPosition(state, this.layer);
    const reachable = new Set(getTravelDestinations(routingState, graph));

    for (const site of graph.sites) {
      const btn = this.siteButtons.get(site.id);
      if (!btn) continue;

      const marker = btn.querySelector("span");
      if (!marker) continue;

      const isCurrent = site.id === pos;
      const isReachable = reachable.has(site.id);
      const held = isSiteHeld(state, site.id);

      btn.style.cursor = isReachable && !this.animating ? "pointer" : "default";
      btn.style.opacity = isCurrent || isReachable || held ? "1" : "0.55";

      const labelEl = btn.querySelectorAll("span")[1];
      if (labelEl) {
        const base = site.label;
        labelEl.textContent = held ? `${base} (Held)` : base;
      }

      if (isCurrent) {
        marker.style.border = "2px solid #e8a030";
        marker.style.boxShadow = "0 0 12px rgba(232, 160, 48, 0.7), 0 2px 6px rgba(0,0,0,0.5)";
        marker.style.transform = "scale(1.15)";
      } else if (isReachable && !this.animating) {
        marker.style.border = "2px solid #8ecf6a";
        marker.style.boxShadow = "0 0 10px rgba(120, 200, 90, 0.5), 0 2px 6px rgba(0,0,0,0.5)";
        marker.style.transform = "scale(1.08)";
      } else if (held) {
        marker.style.border = "2px solid #5ab8c8";
        marker.style.boxShadow = "0 0 10px rgba(90, 184, 200, 0.45), 0 2px 6px rgba(0,0,0,0.5)";
        marker.style.transform = "scale(1.02)";
      } else {
        marker.style.border = "2px solid rgba(200, 90, 80, 0.65)";
        marker.style.boxShadow = "0 0 6px rgba(180, 70, 60, 0.35), 0 2px 6px rgba(0,0,0,0.5)";
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

  private handleSiteClick(targetSiteId: SiteId): void {
    if (this.animating || !this.session || !this.graph) return;

    const state = this.session.getState();
    const pos = currentPosition(state, this.layer);
    if (targetSiteId === pos) return;

    const routingState = stateForRouting(state, this.layer);
    const path = findTravelPath(routingState, this.graph, targetSiteId);
    if (!path) {
      this.errorEl.textContent = "No route — secure areas along the way first.";
      return;
    }

    this.errorEl.textContent = "";

    this.animateAlongPath(path.slice(1), () => {
      if (this.layer === "district" && this.districtTravelHandler) {
        const moved = this.districtTravelHandler(targetSiteId);
        if (!moved) {
          this.errorEl.textContent = "Travel failed.";
          this.snapTokenTo(currentPosition(this.session!.getState(), this.layer));
        } else {
          this.onAreaArrived?.(targetSiteId);
        }
      } else if (this.session && this.graph) {
        const moved = this.session.travelTo(this.graph, targetSiteId);
        if (!moved) {
          this.errorEl.textContent = "Travel failed.";
          this.snapTokenTo(this.session.getState().currentSiteId);
        } else {
          this.onTravelArrived?.(targetSiteId);
        }
      }
      this.refresh();
    });
  }

  private animateAlongPath(waypoints: SiteId[], onComplete: () => void): void {
    if (waypoints.length === 0) {
      onComplete();
      return;
    }

    this.animating = true;
    let index = 0;

    const step = (): void => {
      if (index >= waypoints.length) {
        this.animating = false;
        onComplete();
        return;
      }

      const siteId = waypoints[index]!;
      index += 1;
      const site = this.graph ? siteById(this.graph, siteId) : undefined;
      if (!site) {
        step();
        return;
      }

      this.tokenEl.style.transition = `left ${TRAVEL_MS}ms ease-in-out, top ${TRAVEL_MS}ms ease-in-out`;
      this.tokenEl.style.left = `${site.mapX}%`;
      this.tokenEl.style.top = `${site.mapY}%`;

      const finish = (): void => {
        this.tokenEl.removeEventListener("transitionend", finish);
        step();
      };
      this.tokenEl.addEventListener("transitionend", finish);
      this.refresh();
    };

    step();
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @deprecated Use StrategicMapScreen — kept as alias for existing imports. */
export class WorldMapScreen extends StrategicMapScreen {
  constructor(container: HTMLElement) {
    super(container, "world");
  }

  bind(session: WorldMapSession, graph: WorldGraph, options?: WorldMapBindOptions): void {
    this.bindWorld(session, graph, options);
  }
}
