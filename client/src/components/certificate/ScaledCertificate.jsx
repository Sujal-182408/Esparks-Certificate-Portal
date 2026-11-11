// ============================================================
// <ScaledCertificate> — fit the 1500 × 1000 certificate to any screen
// ============================================================
//
// The certificate has a fixed design size. Instead of writing separate
// mobile CSS (which would make the screen differ from the PDF), we
// measure the available width and shrink the whole certificate with
// `transform: scale()`. Text, artwork and QR code scale together.
//
// ResizeObserver re-measures when the window or the container resizes.
// It only updates state when the scale actually changes, so resizing
// doesn't cause unnecessary re-renders.
// ============================================================

import { useLayoutEffect, useRef, useState } from "react";
import { CERT_HEIGHT, CERT_WIDTH } from "./certificateContent";

export default function ScaledCertificate({ children }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // useLayoutEffect: measure before the browser paints, so the user never
  // sees a full-size certificate flash before it is scaled.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const update = () => {
      const next = Math.min(1, container.clientWidth / CERT_WIDTH);
      setScale((current) => (Math.abs(current - next) < 0.001 ? current : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="cert-scale-container" style={{ height: CERT_HEIGHT * scale }}>
      <div
        className="cert-scale-inner"
        data-cert-scaler=""
        style={{
          width: CERT_WIDTH,
          height: CERT_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
