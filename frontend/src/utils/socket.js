import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (socket) return socket;
  const url = process.env.REACT_APP_SOCKET_URL || "http://localhost:4000";
  socket = io(url, {
    autoConnect: true,
    auth: { token: localStorage.getItem("token") || "" },
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}