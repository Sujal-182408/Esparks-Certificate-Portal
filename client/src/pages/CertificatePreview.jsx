// ============================================================
// pages/CertificatePreview.jsx — DEVELOPMENT ONLY
// ============================================================
//
// /dev/certificate-preview?variant=internship|course|duration|revoked|long-name
// add &capture=1 to see the html2canvas output (exactly what goes in the PDF)
//
// Renders the certificate with sample data so designers/developers can
// check the layout without a database. This route is registered only
// when `import.meta.env.DEV` is true (see App.jsx), so it never ships.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { renderCertificateCanvas } from "../components/certificate/certificatePdf";
import {
  CertificateDocument,
  ScaledCertificate,
  buildVerificationUrl,
  normalizeCertificate,
} from "../components/certificate";
import "./CertificatePage.css";

const BASE = {
  certificate_no: "EITS-INTR-2026-1002",
  certificate_type: "INTR",
  recipient_name: "aisha khan",
  course_name: "Software Development",
  start_date: "2026-08-01",
  end_date: "2026-10-31",
  issue_date: "2026-11-02",
  verification_token: "3f8b2c1e-7a4d-4e2b-9c6f-1d2e3f4a5b6c",
  status: "issued",
};

const SAMPLES = {
  internship: BASE,
  // Course certificate, no programme dates -> "for a duration of" / plain line
  course: {
    ...BASE,
    certificate_no: "EITS-CERT-2026-1015",
    certificate_type: "CERT",
    recipient_name: "Rahul Verma",
    course_name: "Full Stack Web Development",
    start_date: "",
    end_date: "",
  },
  // Dates not stored yet -> falls back to the internship duration
  duration: { ...BASE, start_date: "", end_date: "", duration_months: 3 },
  revoked: { ...BASE, status: "revoked" },
  "long-name": {
    ...BASE,
    recipient_name: "Mohammed Abdul Rahman Siddiqui Al-Hashimi",
    course_name: "Cloud Infrastructure & DevSecOps Engineering",
  },
};

export default function CertificatePreview() {
  const [searchParams] = useSearchParams();
  const raw = SAMPLES[searchParams.get("variant")] || SAMPLES.internship;
  const certificate = normalizeCertificate(raw);
  const capture = searchParams.get("capture") === "1";

  const certificateRef = useRef(null);
  const [captured, setCaptured] = useState("");

  // capture=1: run the real PDF renderer and show its output instead.
  useEffect(() => {
    if (!capture) return;
    renderCertificateCanvas(certificateRef.current).then((canvas) =>
      setCaptured(canvas.toDataURL("image/png")),
    );
  }, [capture]);

  if (captured) {
    return <img src={captured} alt="PDF render" style={{ display: "block", width: 1500, height: 1000 }} />;
  }

  return (
    <div className="certificate-page">
      <ScaledCertificate>
        <CertificateDocument
          ref={certificateRef}
          certificate={certificate}
          verificationUrl={buildVerificationUrl(certificate.verificationToken)}
        />
      </ScaledCertificate>
    </div>
  );
}
