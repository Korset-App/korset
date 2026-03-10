import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import products from "../data/products.json";
import { loadProfile } from "../utils/profile.js";
import { checkProductFit } from "../utils/fitCheck.js";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

function normalizeEAN(text) {
  if (!text) return "";
  const digits = String(text).replace(/\D/g, "");
  if (digits.length > 13) return digits.slice(-13);
  return digits;
}

export default function ScanScreen() {
  const navigate = useNavigate();
  const profile = loadProfile();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");

  const demoProducts = useMemo(() => {
    const ids = ["snickers50", "snickers80", "step50", "cocacola05", "cocacolazero05", "tassay05"];
    return ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  }, []);

  function openProductByEAN(eanRaw) {
    const ean = normalizeEAN(eanRaw);
    if (!ean) return false;
    const found = products.find((p) => String(p.ean || "") === ean);
    if (found) {
      navigate(`/product/${found.id}`);
      return true;
    }
    return false;
  }

  async function startScan() {
    setError("");
    setStatus("Запрашиваем камеру…");
    setIsScanning(true);

    try {
      // 1) Получаем stream вручную (самый стабильный путь)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Video element not found");

      video.srcObject = stream;

      // важные атрибуты для мобилок
      video.setAttribute("playsinline", "true");
      video.muted = true;
      video.autoplay = true;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve();
      });

      // Safari/мобилки иногда не стартуют без explicit play()
      await video.play();

      setStatus("Камера включена. Наведи на штрихкод (EAN).");

      // 2) ZXing: декодим уже работающее видео
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.QR_CODE, // не мешает, если вдруг QR на упаковке
      ]);

      const reader = new BrowserMultiFormatReader(hints, 250);
      readerRef.current = reader;

      reader.decodeFromVideoElement(video, (result, err) => {
        if (result) {
          const raw = result.getText();
          const ok = openProductByEAN(raw);
          if (!ok) {
            setError(`Товар с кодом ${normalizeEAN(raw) || raw} не найден. Введите код вручную.`);
            stopScan();
          } else {
            stopScan();
          }
        }
      });
    } catch (e) {
      console.error(e);
      setError(`Не удалось запустить камеру: ${e?.name || ""} ${e?.message || e}`);
      setIsScanning(false);
      setStatus("");
    }
  }

  function stopScan() {
    try {
      if (readerRef.current) {
        readerRef.current.reset();
        readerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const video = videoRef.current;
      if (video) video.srcObject = null;
    } catch (e) {
      // ignore
    } finally {
      setIsScanning(false);
      setStatus("");
    }
  }

  useEffect(() => {
    return () => stopScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen">
      <div className="scan-btn-container">
        {!isScanning ? (
          <>
            <button className="scan-btn" onClick={startScan}>
              <div className="scan-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M4 7V4h3" />
                  <path d="M20 7V4h-3" />
                  <path d="M4 17v3h3" />
                  <path d="M20 17v3h-3" />
                  <path d="M7 9h10" />
                  <path d="M7 12h10" />
                  <path d="M7 15h10" />
                </svg>
              </div>
              <span>Сканировать штрихкод (EAN)</span>
            </button>

            <p className="scan-hint">Наведи камеру на штрихкод. Если не считывается — введи EAN вручную.</p>

            {error && (
              <div className="card" style={{ marginTop: 10, borderColor: "rgba(239,68,68,0.35)" }}>
                <div style={{ color: "var(--error-bright)", fontSize: 13, lineHeight: 1.4 }}>{error}</div>
              </div>
            )}

            <div className="card" style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 6 }}>Ввод вручную (EAN)</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  className="ai-input"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="например 5000159461122"
                  inputMode="numeric"
                />
                <button
                  className="btn btn-primary"
                  style={{ whiteSpace: "nowrap" }}
                  onClick={() => {
                    const ok = openProductByEAN(manual);
                    if (!ok) setError("Не нашли товар по этому EAN. Проверь код или добавь товар в базу.");
                  }}
                >
                  Открыть
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 10 }}>{status}</div>

            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)", background: "#000" }}>
              <video
                ref={videoRef}
                style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }}
                muted
                playsInline
                autoPlay
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button className="btn btn-secondary btn-full" onClick={stopScan}>
                Остановить
              </button>
            </div>

            {error && <div style={{ marginTop: 10, color: "var(--error-bright)", fontSize: 13 }}>{error}</div>}
          </div>
        )}
      </div>

      <div className="divider" />

      <div className="section">
        <div className="section-title" style={{ marginBottom: 12 }}>
          Быстрый доступ (MVP)
        </div>
        <div style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 10, lineHeight: 1.5 }}>
          Если штрихкод не считывается — выбери товар здесь.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {demoProducts.map((product) => {
            const { fits } = checkProductFit(product, profile);
            return (
              <div key={product.id} className="product-item" onClick={() => navigate(`/product/${product.id}`)}>
                <div className="product-emoji" style={{ display: "grid", placeItems: "center" }}>
                  <span style={{ fontSize: 18 }}>🏷️</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="product-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {product.name}
                  </div>
                  <div className="product-meta">
                    <span className="product-price">{product.priceKzt?.toLocaleString("ru-RU")} ₸</span>
                    <span className="product-shelf">{product.shelf}</span>
                  </div>
                </div>
                <span style={{ fontSize: 16, color: fits ? "var(--success-bright)" : "var(--error-bright)" }}>{fits ? "✓" : "×"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}