"use client";

import { useState, useCallback, useRef } from "react";
import ImageUploader from "@/components/ImageUploader";
import ImagePreview from "@/components/ImagePreview";
import ActionButtons from "@/components/ActionButtons";
import { imageToLineart } from "@/lib/image-to-lineart";

export default function Home() {
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [lineartDataUrl, setLineartDataUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [fileName, setFileName] = useState<string>("image");
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleImageLoaded = useCallback((dataUrl: string, name?: string) => {
    setOriginalSrc(dataUrl);
    setLineartDataUrl(null);
    if (name) {
      const baseName = name.replace(/\.[^.]+$/, "");
      setFileName(baseName);
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      sourceCanvasRef.current = canvas;
    };
    img.src = dataUrl;
  }, []);

  const handleConvert = useCallback(() => {
    if (!sourceCanvasRef.current) return;
    setIsConverting(true);

    requestAnimationFrame(() => {
      setTimeout(() => {
        const result = imageToLineart(sourceCanvasRef.current!);
        setLineartDataUrl(result.toDataURL("image/png"));
        setIsConverting(false);
      }, 50);
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#fffdf7] flex flex-col">
      <header className="w-full bg-gradient-to-r from-[#ffecd2] to-[#fcb69f] py-6 text-center">
        <h1 className="text-3xl font-bold text-[#5a3e2b]">🖍️ 著色圖魔法屋</h1>
        <p className="text-sm text-[#7a5c45] mt-1">把照片變成好玩的著色圖！</p>
      </header>

      <div className="flex-1 flex flex-col items-center gap-8 p-6 md:p-10">
        {!originalSrc && <ImageUploader onImageLoaded={handleImageLoaded} />}

        {originalSrc && (
          <>
            <ImagePreview
              originalSrc={originalSrc}
              lineartDataUrl={lineartDataUrl}
              isConverting={isConverting}
            />

            <ActionButtons
              lineartDataUrl={lineartDataUrl}
              onConvert={handleConvert}
              isConverting={isConverting}
              hasOriginal={true}
              fileName={fileName}
            />

            <button
              onClick={() => {
                setOriginalSrc(null);
                setLineartDataUrl(null);
                setFileName("image");
                sourceCanvasRef.current = null;
              }}
              className="text-sm text-[#b08968] hover:text-[#5a3e2b] underline transition-colors"
            >
              ← 重新選擇圖片
            </button>
          </>
        )}
      </div>

      <footer className="text-center py-4 text-xs text-[#c9a88a]">
        所有圖片處理都在您的瀏覽器中完成，不會上傳到伺服器
      </footer>
    </main>
  );
}
