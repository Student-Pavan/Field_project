import { useCallback, useEffect, useRef, useState } from "react";

export interface UseWebSocketOptions {
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (event: Event) => void;
  enabled?: boolean;
}

function resolveWsBaseUrl(): string {
  const configured = import.meta.env.VITE_WS_BASE_URL;
  if (configured) {
    return configured;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }
  return "ws://localhost:8000";
}

export function useWebSocket(path: string | null, options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    const enabled = options.enabled !== false;
    if (!path || !enabled) {
      setIsConnected(false);
      return;
    }

    const wsBaseUrl = resolveWsBaseUrl();
    const ws = new WebSocket(`${wsBaseUrl}${path}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      optionsRef.current.onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setLastMessage(parsed);
        optionsRef.current.onMessage?.(parsed);
      } catch {
        setLastMessage(event.data);
        optionsRef.current.onMessage?.(event.data);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      optionsRef.current.onClose?.();
    };

    ws.onerror = (event) => {
      optionsRef.current.onError?.(event);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [path, options.enabled]);

  return { isConnected, send, lastMessage, ws: wsRef };
}
