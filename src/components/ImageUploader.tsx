"use client";

import { useCallback, useState, useRef } from "react";

interface ImageUploaderProps {
  onImageLoaded: (dataUrl: string, fileName?: string) => void;
}

export default function ImageUploader({ onImageLoaded }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("請上傳圖片檔案（JPG、PNG、WebP）");
        return;
      }
      setError("");
      const reader = new FileReader();
      reader.onload = (e) => {
        onImageLoaded(e.target?.result as string, file.name);
      };
      reader.readAsDataURL(file);
    },
    [onImageLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/fetch-image?url=${encodeURIComponent(url.trim())}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const urlFileName = url.trim().split("/").pop()?.split("?")[0] || "image";
      onImageLoaded(dataUrl, urlFileName);
    } catch {
      setError("無法載入圖片，請確認網址是否正確");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        className={`border-3 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-[#f4a261] bg-[#fff3e0]"
            : "border-[#f4a261] bg-[#fff8ef] hover:bg-[#fff3e0]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-5xl mb-3">🎨</div>
        <div className="text-base font-bold text-[#5a3e2b]">把圖片拖到這裡</div>
        <div className="text-sm text-[#b08968] mt-1">或點擊選擇檔案</div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      <div className="flex items-center gap-3 mt-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
          placeholder="或貼上圖片網址..."
          className="flex-1 px-4 py-3 rounded-full border-2 border-[#f4a261] bg-white text-sm text-[#5a3e2b] placeholder-[#c9a88a] focus:outline-none focus:border-[#e76f51]"
        />
        <button
          onClick={handleUrlSubmit}
          disabled={loading || !url.trim()}
          className="px-6 py-3 rounded-full bg-[#f4a261] text-white font-bold text-sm hover:bg-[#e76f51] disabled:opacity-50 transition-colors"
        >
          {loading ? "載入中..." : "載入"}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-500 text-center">{error}</div>
      )}
    </div>
  );
}
