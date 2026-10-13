import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  RotateCcw,
  Upload,
  ScanLine,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import jsQR from "jsqr";
import "./QRScanner.css";

export default function QRScanner({ onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const lastScannedRef = useRef("");

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [uploadError, setUploadError] = useState("");

  // =========================
  // CAMERA
  // =========================

  async function startCamera() {
    try {
      setCameraError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera is not supported by this browser."
        );
      }

      stopCamera();

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setScanning(true);

      requestAnimationFrame(scanQRCode);
    } catch (error) {
      console.error(error);

      setCameraError(
        error?.message ||
          "Unable to access camera. Please allow camera permission."
      );

      setCameraActive(false);
      setScanning(false);
    }
  }

  function stopCamera() {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setScanning(false);
  }

  function scanQRCode() {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    if (
      videoRef.current.readyState !==
      videoRef.current.HAVE_ENOUGH_DATA
    ) {
      animationRef.current =
        requestAnimationFrame(scanQRCode);

      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const imageData = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const code = jsQR(
      imageData.data,
      imageData.width,
      imageData.height,
      {
        inversionAttempts: "attemptBoth",
      }
    );

    if (code?.data) {
      if (lastScannedRef.current !== code.data) {
        lastScannedRef.current = code.data;

        setScanning(false);

        onScan(code.data);

        stopCamera();

        return;
      }
    }

    animationRef.current =
      requestAnimationFrame(scanQRCode);
  }

  // =========================
  // UPLOAD QR IMAGE
  // =========================

  function handleQRUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadError("");

    if (!file.type.startsWith("image/")) {
      setUploadError(
        "Please upload a valid QR code image."
      );

      return;
    }

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", {
          willReadFrequently: true,
        });

        canvas.width = image.width;
        canvas.height = image.height;

        context.drawImage(
          image,
          0,
          0,
          image.width,
          image.height
        );

        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );

        const code = jsQR(
          imageData.data,
          imageData.width,
          imageData.height,
          {
            inversionAttempts: "attemptBoth",
          }
        );

        if (code?.data) {
          setUploadError("");
          onScan(code.data);
        } else {
          setUploadError(
            "No QR code was detected in this image. Please upload a clear QR image."
          );
        }
      };

      image.onerror = () => {
        setUploadError(
          "Unable to read the uploaded image."
        );
      };

      image.src = readerEvent.target.result;
    };

    reader.readAsDataURL(file);

    // Allows uploading the same image again
    event.target.value = "";
  }

  // =========================
  // SWITCH CAMERA
  // =========================

  async function switchCamera() {
    const nextMode =
      facingMode === "environment"
        ? "user"
        : "environment";

    setFacingMode(nextMode);

    if (cameraActive) {
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  }

  // =========================
  // CLEANUP
  // =========================

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="qr-scanner">

      {/* HEADER */}

      <div className="qr-scanner-header">
        <div>
          <div className="qr-scanner-title">
            <ShieldCheck size={22} />
            <span>Scan Certificate QR</span>
          </div>

          <p>
            Scan using your camera or upload a QR image.
          </p>
        </div>

        {cameraActive && (
          <div className="camera-live">
            <span></span>
            CAMERA LIVE
          </div>
        )}
      </div>

      {/* CAMERA */}

      <div className="qr-camera-container">

        <video
          ref={videoRef}
          className="qr-video"
          muted
          playsInline
        />

        {!cameraActive && (
          <div className="qr-camera-placeholder">
            <Camera size={50} />

            <h3>Camera Scanner</h3>

            <p>
              Start your camera and point it at the
              certificate QR code.
            </p>
          </div>
        )}

        {cameraActive && (
          <div className="qr-frame">

            <span className="corner top-left"></span>
            <span className="corner top-right"></span>
            <span className="corner bottom-left"></span>
            <span className="corner bottom-right"></span>

            {scanning && (
              <div className="scan-line"></div>
            )}

            <div className="qr-scan-message">
              Align QR code inside the frame
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="qr-hidden-canvas"
        />
      </div>

      {/* CAMERA ERROR */}

      {cameraError && (
        <div className="qr-error">
          <AlertCircle size={20} />
          <span>{cameraError}</span>
        </div>
      )}

      {/* CAMERA BUTTONS */}

      <div className="qr-controls">

        {!cameraActive ? (
          <button
            type="button"
            className="qr-control-btn primary"
            onClick={startCamera}
          >
            <Camera size={18} />
            Start Camera
          </button>
        ) : (
          <button
            type="button"
            className="qr-control-btn danger"
            onClick={stopCamera}
          >
            <CameraOff size={18} />
            Stop Camera
          </button>
        )}

        <button
          type="button"
          className="qr-control-btn secondary"
          onClick={switchCamera}
          disabled={!cameraActive}
        >
          <RotateCcw size={18} />
          Switch Camera
        </button>

      </div>

      {/* DIVIDER */}

      <div className="qr-divider">
        <span></span>
        <strong>OR</strong>
        <span></span>
      </div>

      {/* UPLOAD QR */}

      <div className="qr-upload-section">

        <input
          id="qr-upload-input"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/png"
          onChange={handleQRUpload}
          hidden
        />

        <label
          htmlFor="qr-upload-input"
          className="qr-upload-btn"
        >
          <Upload size={21} />

          <div>
            <strong>Upload QR Image</strong>
            <small>
              PNG, JPG or png
            </small>
          </div>
        </label>

        <p className="qr-upload-help">
          Upload a screenshot or photo containing
          the certificate QR code.
        </p>

      </div>

      {/* UPLOAD ERROR */}

      {uploadError && (
        <div className="qr-error upload-error">
          <AlertCircle size={20} />
          <span>{uploadError}</span>
        </div>
      )}

    </div>
  );
}