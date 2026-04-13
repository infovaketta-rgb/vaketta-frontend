import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  const apiKey = localStorage.getItem("HOTEL_API_KEY");

  if (!apiKey) {
    throw new Error("HOTEL_API_KEY missing");
  }

  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_BASE ?? "";
    socket = io(url, {
      auth: { apiKey },
      transports: ["websocket"],
    });
  }

  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
