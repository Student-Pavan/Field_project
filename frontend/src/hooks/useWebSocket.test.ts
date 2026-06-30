import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWebSocket } from "./useWebSocket";

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.lastInstance = this;
    queueMicrotask(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event("open"));
    });
  }

  static lastInstance: MockWebSocket | null = null;

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent("close"));
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

vi.stubGlobal("WebSocket", MockWebSocket);

describe("useWebSocket", () => {
  it("connects and receives messages", async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() =>
      useWebSocket("/ws/simulations/test", { onMessage }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isConnected).toBe(true);

    await act(async () => {
      MockWebSocket.lastInstance?.simulateMessage({ type: "tick", progress_pct: 50 });
    });

    expect(onMessage).toHaveBeenCalledWith({ type: "tick", progress_pct: 50 });
    expect(result.current.lastMessage).toEqual({ type: "tick", progress_pct: 50 });
  });

  it("send serializes payload", async () => {
    const { result } = renderHook(() => useWebSocket("/ws/simulations/test"));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.send({ type: "ping" });
    });

    expect(MockWebSocket.lastInstance?.sent).toContain(JSON.stringify({ type: "ping" }));
  });

  it("does not connect when path is null", () => {
    const { result } = renderHook(() => useWebSocket(null));
    expect(result.current.isConnected).toBe(false);
  });
});
