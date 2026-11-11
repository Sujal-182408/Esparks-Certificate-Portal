// Public API of the certificate module — import from here:
//   import { CertificateDocument, ScaledCertificate } from "../components/certificate";

export { default as CertificateDocument } from "./CertificateDocument";
export { default as ScaledCertificate } from "./ScaledCertificate";
export { downloadCertificatePdf } from "./certificatePdf";
export { buildVerificationUrl, normalizeCertificate } from "./certificateContent";
