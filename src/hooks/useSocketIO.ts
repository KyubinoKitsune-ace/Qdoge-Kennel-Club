import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAtom } from "jotai";
import { notificationsAtom } from "@/store/notifications";
import toast from "react-hot-toast";

interface UseSocketIOOptions {
  url: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useSocketIO({
  url,
  autoConnect = true,
  reconnectionAttempts = 5,
  reconnectionDelay = 5000,
  onConnect,
  onDisconnect,
  onError,
}: UseSocketIOOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [, setNotifications] = useAtom(notificationsAtom);
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  useEffect(() => {
    const socket = io(url, {
      autoConnect,
      reconnectionAttempts,
      reconnectionDelay,
      path: "/socket.io",
    });

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("Socket connected:", socket.id);
      onConnect?.();
    });

    socket.on("disconnect", (reason) => {
      setIsConnected(false);
      console.log("Socket disconnected:", reason);
      onDisconnect?.();
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      onError?.(error);
    });

    // Listen for notifications
    socket.on("notification", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      if (notification.type === "error") {
        toast.error(notification.message);
      } else {
        toast.success(notification.message);
      }
    });

    // Listen for trade updates
    socket.on("trade_update", (trade) => {
      if (trade.status === "completed") {
        toast.success(`Trade ${trade.id} completed`);
      } else {
        toast.error(`Trade ${trade.id} failed`);
      }
    });

    // Forward all events to registered listeners (supported API; avoids private internals)
    const onAnyHandler = (event: string, ...args: unknown[]) => {
      const data = args[0];
      const handlers = listenersRef.current.get(event);
      if (handlers) {
        handlers.forEach((handler) => handler(data));
      }
    };
    socket.onAny(onAnyHandler);

    socketRef.current = socket;

    return () => {
      if (socket) {
        socket.offAny(onAnyHandler);
        socket.disconnect();
        socket.off();
      }
    };
  }, [url, autoConnect, reconnectionAttempts, reconnectionDelay, onConnect, onDisconnect, onError, setNotifications]);

  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    return false;
  }, []);

  const on = useCallback((event: string, handler: (data: unknown) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(handler);

    return () => {
      listenersRef.current.get(event)?.delete(handler);
    };
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.disconnect();
    }
  }, []);

  return {
    isConnected,
    socket: socketRef.current,
    emit,
    on,
    connect,
    disconnect,
  };
}
