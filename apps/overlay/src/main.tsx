import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { OverlayTipAlertSchema, type OverlayTipAlert } from "@cripto-tip/shared";
import "./style.css";

function streamIdFromPath() {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts[0] === "overlay" && parts[1] ? parts[1] : "str_mock";
}

export function OverlayApp() {
  const [alert, setAlert] = useState<OverlayTipAlert | null>(null);

  useEffect(() => {
    const apiBase = import.meta.env.OVERLAY_PUBLIC_API_BASE ?? "http://localhost:4000";
    const wsBase = apiBase.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsBase}/overlay/${streamIdFromPath()}/ws`);
    ws.onmessage = (event) => {
      const parsed = OverlayTipAlertSchema.safeParse(JSON.parse(String(event.data)));
      if (parsed.success) setAlert(parsed.data);
    };
    return () => ws.close();
  }, []);

  return (
    <main className="overlay" aria-live="polite">
      {alert ? (
        <section className={`tip ${alert.effect}`}>
          <p className="name">{alert.viewer_name}</p>
          <p className="amount">{alert.amount}</p>
          <p className="message">{alert.message}</p>
        </section>
      ) : null}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<OverlayApp />);
