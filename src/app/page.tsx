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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageLoaded = useCallback((dataUrl: string, name?: string) => {
    setOriginalSrc(dataUrl);
    setLineartDataUrl(null);
    setIsConverting(true);
    if (name) {
      setFileName(name.replace(/\.[^.]+$/, ""));
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      requestAnimationFrame(() => {
        setTimeout(() => {
          const result = imageToLineart(canvas);
          setLineartDataUrl(result.toDataURL("image/png"));
          setIsConverting(false);
        }, 50);
      });
    };
    img.src = dataUrl;
  }, []);

  const handleReUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      handleImageLoaded(ev.target?.result as string, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <ImagePreview
              originalSrc={originalSrc}
              lineartDataUrl={lineartDataUrl}
              isConverting={isConverting}
              onClickOriginal={handleReUpload}
            />

            <ActionButtons
              lineartDataUrl={lineartDataUrl}
              isConverting={isConverting}
              fileName={fileName}
            />
          </>
        )}
      </div>

      <footer className="text-center py-4 text-xs text-[#c9a88a]">
        所有圖片處理都在您的瀏覽器中完成，不會上傳到伺服器
      </footer>
    </main>
  );
}
