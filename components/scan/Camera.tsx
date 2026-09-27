'use client';

import { useEffect, useRef, useState } from 'react';

type Detecteur = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };

/**
 * Lecture du QR par la caméra arrière. API BarcodeDetector quand elle existe (Chrome Android),
 * sinon @zxing/browser, chargé à la demande pour ne pas alourdir la page.
 */
export function Camera({ actif, onLecture, lampe, onErreur }: { actif: boolean; onLecture: (texte: string) => void; lampe: boolean; onErreur: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const flux = useRef<MediaStream | null>(null);
  const rappel = useRef(onLecture);
  const actifRef = useRef(actif);
  const [pret, setPret] = useState(false);
  useEffect(() => { rappel.current = onLecture; actifRef.current = actif; });

  useEffect(() => {
    let arret = false;
    let minuterie: ReturnType<typeof setInterval> | null = null;
    let controleZxing: { stop(): void } | null = null;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
        if (arret) { s.getTracks().forEach((t) => t.stop()); return; }
        flux.current = s;
        const v = video.current!;
        v.srcObject = s;
        await v.play();
        setPret(true);
        const BD = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detecteur; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
        const formats = BD?.getSupportedFormats ? await BD.getSupportedFormats() : [];
        if (BD && formats.includes('qr_code')) {
          const d = new BD({ formats: ['qr_code'] });
          minuterie = setInterval(async () => {
            if (!actifRef.current || v.readyState < 2) return;
            try { const r = await d.detect(v); if (r[0]?.rawValue) rappel.current(r[0].rawValue); } catch { /* image suivante */ }
          }, 250);
        } else {
          const { BrowserQRCodeReader } = await import('@zxing/browser');
          const lecteur = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
          controleZxing = await lecteur.decodeFromVideoElement(v, (res) => { if (res && actifRef.current) rappel.current(res.getText()); });
        }
      } catch {
        onErreur();
      }
    })();
    return () => {
      arret = true;
      if (minuterie) clearInterval(minuterie);
      controleZxing?.stop();
      flux.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onErreur]);

  useEffect(() => {
    const piste = flux.current?.getVideoTracks()[0];
    if (!piste) return;
    void piste.applyConstraints({ advanced: [{ torch: lampe } as MediaTrackConstraintSet] }).catch(() => undefined);
  }, [lampe, pret]);

  return <video ref={video} playsInline muted aria-hidden="true" />;
}
