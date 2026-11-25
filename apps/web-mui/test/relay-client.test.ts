import { afterEach, describe, expect, it, vi } from "vitest";

class FakeWS {
  static OPEN = 1;
  static last: FakeWS;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
  constructor(readonly url: string) { FakeWS.last = this; }
}

afterEach(() => vi.unstubAllGlobals());

describe("relay client", () => {
  it("ignores frames that are not JSON", async () => {
    vi.stubGlobal("WebSocket", FakeWS);
    const { createRelayClient } = await import("../src/sync/relay-client.ts");
    const client = createRelayClient("ws://x");
    FakeWS.last.onopen?.();
    expect(() => FakeWS.last.onmessage?.({ data: "{not json" })).not.toThrow();
    FakeWS.last.onmessage?.({ data: JSON.stringify({ id: "1", type: "status", payload: { plugin: "connected", queued: false, tokensQueued: false } }) });
    expect(client.state.status?.plugin).toBe("connected");
  });
});
