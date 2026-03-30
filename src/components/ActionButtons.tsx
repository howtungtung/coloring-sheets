"use client";

interface ActionButtonsProps {
  lineartDataUrl: string | null;
  isConverting: boolean;
  fileName: string;
}

export default function ActionButtons({
  lineartDataUrl,
  isConverting,
  fileName,
}: ActionButtonsProps) {
  const handleDownload = () => {
    if (!lineartDataUrl) return;
    const link = document.createElement("a");
    link.href = lineartDataUrl;
    link.download = `${fileName}-coloring.png`;
    link.click();
  };

  const handlePrint = () => {
    if (!lineartDataUrl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const img = printWindow.document.createElement("img");
    img.src = lineartDataUrl;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100vh";
    img.style.objectFit = "contain";
    img.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    printWindow.document.title = "著色圖列印";
    const style = printWindow.document.createElement("style");
    style.textContent = "body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}@media print{body{margin:0}img{max-width:100%;max-height:100%}}";
    printWindow.document.head.appendChild(style);
    printWindow.document.body.appendChild(img);
  };

  if (isConverting) {
    return (
      <div className="text-sm text-[#b08968]">轉換中...</div>
    );
  }

  if (!lineartDataUrl) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
      <button
        onClick={handleDownload}
        className="px-8 py-3 rounded-full bg-[#f4a261] text-white font-bold text-base hover:bg-[#e76f51] transition-colors"
      >
        ⬇️ 下載圖片
      </button>
      <button
        onClick={handlePrint}
        className="px-8 py-3 rounded-full bg-[#e76f51] text-white font-bold text-base hover:bg-[#d35440] transition-colors"
      >
        🖨️ 列印出來
      </button>
    </div>
  );
}
