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
          // Repli ZXing : image entière, puis centre du viseur recadré. Le motif Kuba autour du QR
          // trompe parfois le détecteur sur l'image entière (voir docs/billet.md) ; le recadrage le corrige.
          const { BrowserQRCodeReader } = await import('@zxing/browser');
          const lecteur = new BrowserQRCodeReader();
          const entier = document.createElement('canvas');
          const centre = document.createElement('canvas');
          const agrandi = document.createElement('canvas');
          minuterie = setInterval(() => {
            if (!actifRef.current || v.readyState < 2 || !v.videoWidth) return;
            entier.width = v.videoWidth;
            entier.height = v.videoHeight;
            entier.getContext('2d')?.drawImage(v, 0, 0);
            try { rappel.current(lecteur.decodeFromCanvas(entier).getText()); return; } catch { /* essai suivant */ }
            const cote = Math.round(Math.min(v.videoWidth, v.videoHeight) * 0.6);
            centre.width = cote;
            centre.height = cote;
            centre.getContext('2d')?.drawImage(entier, (v.videoWidth - cote) / 2, (v.videoHeight - cote) / 2, cote, cote, 0, 0, cote, cote);
            try { rappel.current(lecteur.decodeFromCanvas(centre).getText()); return; } catch { /* essai suivant */ }
            // Dernier essai sur ce même centre agrandi : corrige certains échecs de ZXing sur une image fixe.
            agrandi.width = Math.round(cote * 1.5);
            agrandi.height = Math.round(cote * 1.5);
            const ctx = agrandi.getContext('2d');
            if (ctx) { ctx.imageSmoothingEnabled = false; ctx.drawImage(centre, 0, 0, agrandi.width, agrandi.height); }
            try { rappel.current(lecteur.decodeFromCanvas(agrandi).getText()); } catch { /* image suivante */ }
          }, 300);
        }
      } catch {
        onErreur();
      }
    })();
    return () => {
      arret = true;
      if (minuterie) clearInterval(minuterie);
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
