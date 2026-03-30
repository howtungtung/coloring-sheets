/**
 * Converts a color image to black-and-white line art using edge detection.
 * Runs entirely in the browser via Canvas API.
 */

function grayscale(data: Uint8ClampedArray): Float32Array {
  const gray = new Float32Array(data.length / 4);
  for (let i = 0; i < gray.length; i++) {
    const offset = i * 4;
    gray[i] = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
  }
  return gray;
}

function gaussianBlur(gray: Float32Array, width: number, height: number): Float32Array {
  const kernel = [1, 4, 6, 4, 1, 4, 16, 24, 16, 4, 6, 24, 36, 24, 6, 4, 16, 24, 16, 4, 1, 4, 6, 4, 1];
  const kernelSize = 5;
  const half = Math.floor(kernelSize / 2);
  const kernelSum = 256;
  const output = new Float32Array(gray.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const px = Math.min(Math.max(x + kx, 0), width - 1);
          const py = Math.min(Math.max(y + ky, 0), height - 1);
          const weight = kernel[(ky + half) * kernelSize + (kx + half)];
          sum += gray[py * width + px] * weight;
        }
      }
      output[y * width + x] = sum / kernelSum;
    }
  }
  return output;
}

function sobelEdgeDetection(gray: Float32Array, width: number, height: number): Float32Array {
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  const output = new Float32Array(gray.length);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = gray[(y + ky) * width + (x + kx)];
          const ki = (ky + 1) * 3 + (kx + 1);
          gx += pixel * sobelX[ki];
          gy += pixel * sobelY[ki];
        }
      }
      output[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return output;
}

function threshold(edges: Float32Array, thresholdValue: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(edges.length);
  for (let i = 0; i < edges.length; i++) {
    output[i] = edges[i] > thresholdValue ? 0 : 255;
  }
  return output;
}

export function imageToLineart(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const ctx = sourceCanvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, width, height);

  const gray = grayscale(imageData.data);
  const blurred = gaussianBlur(gray, width, height);
  const edges = sobelEdgeDetection(blurred, width, height);
  const binary = threshold(edges, 30);

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext("2d")!;
  const outData = outCtx.createImageData(width, height);

  for (let i = 0; i < binary.length; i++) {
    const offset = i * 4;
    outData.data[offset] = binary[i];
    outData.data[offset + 1] = binary[i];
    outData.data[offset + 2] = binary[i];
    outData.data[offset + 3] = 255;
  }

  outCtx.putImageData(outData, 0, 0);
  return outputCanvas;
}
