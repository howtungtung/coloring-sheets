"use client";

interface ImagePreviewProps {
  originalSrc: string;
  lineartDataUrl: string | null;
  isConverting: boolean;
  onClickOriginal?: () => void;
}

export default function ImagePreview({
  originalSrc,
  lineartDataUrl,
  isConverting,
  onClickOriginal,
}: ImagePreviewProps) {
  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col md:flex-row gap-4 items-stretch">
      <div
        className="flex-1 border-2 border-[#f4a261] rounded-2xl p-4 text-center bg-white cursor-pointer hover:border-[#e76f51] transition-colors group"
        onClick={onClickOriginal}
        title="點擊重新上傳圖片"
      >
        <div className="text-sm text-[#b08968] mb-2 font-bold">✨ 原始圖片</div>
        <img
          src={originalSrc}
          alt="原始圖片"
          className="max-w-full max-h-80 mx-auto rounded-xl object-contain"
        />
        <div className="text-xs text-[#c9a88a] mt-2 group-hover:text-[#e76f51] transition-colors">
          點擊重新上傳
        </div>
      </div>

      <div className="flex items-center justify-center text-3xl text-[#f4a261] md:rotate-0 rotate-90">
        ✨→
      </div>

      <div className="flex-1 border-2 border-[#f4a261] rounded-2xl p-4 text-center bg-white">
        <div className="text-sm text-[#b08968] mb-2 font-bold">🖍️ 著色圖</div>
        {isConverting ? (
          <div className="h-80 flex items-center justify-center text-[#b08968]">
            <div className="text-center">
              <div className="text-4xl mb-2 animate-spin">🎨</div>
              <div>轉換中...</div>
            </div>
          </div>
        ) : lineartDataUrl ? (
          <img
            src={lineartDataUrl}
            alt="著色圖線稿"
            className="max-w-full max-h-80 mx-auto rounded-xl object-contain"
          />
        ) : null}
      </div>
    </div>
  );
}
