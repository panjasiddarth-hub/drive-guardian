import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { API_BASE } from '../utils/api';

export default function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(API_BASE, {
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket.IO connected");
    });

    socketRef.current.on("connect_error", (err) => {
      console.warn("Socket.IO error:", err.message);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return socketRef.current;
}
