import {
  createDefaultRng,
  createInitialState,
  dispatch,
  type Action,
  type GameEvent,
  type InitialStateConfig,
  type Session,
} from "../core/index";

/** Thin bridge: owns core session, emits events to read-only consumers. */
export class CombatSession {
  private session: Session;
  private readonly listeners = new Set<(events: GameEvent[]) => void>();

  constructor(config: InitialStateConfig) {
    this.session = { state: createInitialState(config), nextSeq: 1 };
  }

  getState() {
    return this.session.state;
  }

  subscribe(listener: (events: GameEvent[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(action: Action): boolean {
    const prevLen = this.session.state.eventLog.length;
    this.session = dispatch(this.session, action, createDefaultRng());
    const newEvents = this.session.state.eventLog.slice(prevLen);
    if (newEvents.length > 0) {
      for (const listener of this.listeners) {
        listener(newEvents);
      }
      return true;
    }
    return false;
  }
}
