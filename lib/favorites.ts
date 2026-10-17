"use client";
import { useSyncExternalStore } from "react";
const event = "favorites-changed";
const serverSnapshot = () => "[]";
function snapshot() {
  try {
    return localStorage.getItem("mr-favorites") || "[]";
  } catch {
    return "[]";
  }
}
function subscribe(callback: () => void) {
  window.addEventListener(event, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(event, callback);
    window.removeEventListener("storage", callback);
  };
}
export function useFavorites() {
  const value = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  let ids: string[] = [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed))
      ids = parsed.filter((id): id is string => typeof id === "string");
  } catch {}
  function toggle(id: string) {
    try {
      const next = ids.includes(id)
        ? ids.filter((x) => x !== id)
        : [...ids, id].slice(-100);
      localStorage.setItem("mr-favorites", JSON.stringify(next));
      window.dispatchEvent(new Event(event));
    } catch {}
  }
  return { ids, toggle };
}
