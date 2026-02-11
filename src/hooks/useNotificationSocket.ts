import { useQubicConnect } from "@/components/connect/QubicConnectContext";
import { useSocketIO } from "./useSocketIO";
import { useEffect } from "react";
import { BACKEND_API_URL } from "@/constants";

// Derive socket URL from the backend API URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || BACKEND_API_URL.replace("/api", "")
  || window.location.origin;

export function useNotificationSocket() {
  const { isConnected, socket, emit, connect, disconnect } = useSocketIO({
    url: SOCKET_URL,
    autoConnect: true,
  });

  const { wallet } = useQubicConnect();

  // Subscribe to user-specific notifications when connected
  useEffect(() => {
    if (isConnected && socket && wallet?.publicKey) {
      emit("subscribe", { userId: wallet.publicKey });
      console.log("Subscribed to notifications");
    }
  }, [isConnected, socket, wallet?.publicKey]);

  return {
    isConnected,
    socket,
    emit,
    connect,
    disconnect,
  };
}
