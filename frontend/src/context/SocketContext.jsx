import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  process.env.REACT_APP_API_URL?.replace("/api", "") ||
  "http://localhost:5000";

/**
 * SocketProvider — creates one socket connection per authenticated session.
 * Connect with the JWT token from localStorage so the server can authenticate it.
 * The socket is disconnected on logout (token removal) or component unmount.
 */
export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("zaalima_token");
    if (!token) return;

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = s;
    setSocket(s);

    s.on("connect", () => {
      setConnected(true);
      console.log("🔗 Socket connected:", s.id);
    });

    s.on("disconnect", (reason) => {
      setConnected(false);
      console.log("🔌 Socket disconnected:", reason);
    });

    s.on("connect_error", (err) => {
      console.warn("⚠️ Socket connection error:", err.message);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, []); // single mount — token won't change within a session

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

/** Returns { socket, connected } */
export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
};

export default SocketContext;
