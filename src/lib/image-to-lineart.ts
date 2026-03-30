/**
 * Converts a color image to black-and-white line art for coloring pages.
 * Strategy: remove background → extract only the dark outline pixels → clean up.
 * No edge detection needed — we directly keep the artist's existing black lines.
 * Runs entirely in the browser via Canvas API.
 */

function removeBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  // First pass: set all transparent/semi-transparent pixels to white
  const output = new Uint8ClampedArray(data);
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] < 128) {
      output[i * 4] = 255;
      output[i * 4 + 1] = 255;
      output[i * 4 + 2] = 255;
      output[i * 4 + 3] = 255;
    }
  }

  // Second pass: flood-fill from edges to mark near-white background
  const isBackground = new Uint8Array(width * height);
  const stack: number[] = [];

  const isBgColor = (idx: number) => {
    const offset = idx * 4;
    const r = output[offset];
    const g = output[offset + 1];
    const b = output[offset + 2];
    return r > 225 && g > 225 && b > 225;
  };

  // Seed from all 4 edges
  for (let x = 0; x < width; x++) {
    stack.push(x);
    stack.push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width);
    stack.push(y * width + width - 1);
  }

  while (stack.length > 0) {
    const idx = stack.pop()!;
    if (idx < 0 || idx >= width * height) continue;
    if (isBackground[idx]) continue;
    isBackground[idx] = 1;
    if (!isBgColor(idx)) continue;

    const offset = idx * 4;
    output[offset] = 255;
    output[offset + 1] = 255;
    output[offset + 2] = 255;
    output[offset + 3] = 255;

    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) stack.push(idx - 1);
    if (x < width - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - width);
    if (y < height - 1) stack.push(idx + width);
  }

  return output;
}

function extractOutlinePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  // A pixel is an outline if:
  // (a) it's absolutely dark (luminance < 120), OR
  // (b) it's the local minimum in luminance compared to neighbors (local contrast)
  const output = new Uint8ClampedArray(width * height);
  output.fill(255);

  // Pre-compute luminance
  const lum = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    lum[i] = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
  }

  // Use max luminance in 4 cardinal directions to detect outlines
  const radius = 4;
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = y * width + x;
      const pixelLum = lum[idx];

      // (a) Absolutely dark
      if (pixelLum < 120) {
        output[idx] = 0;
        continue;
      }

      // (b) Check if darker than neighbors in ANY direction pair
      // Only applies to somewhat dark pixels — skip light-colored areas entirely
      if (pixelLum >= 180) continue;

      // Look along 4 axes: horizontal, vertical, and 2 diagonals
      // If brighter neighbors exist on both sides of any axis, this is a line
      let matchCount = 0;
      const offsets = [
        [[-radius, 0], [radius, 0]],   // horizontal
        [[0, -radius], [0, radius]],    // vertical
        [[-radius, -radius], [radius, radius]],   // diagonal
        [[-radius, radius], [radius, -radius]],   // anti-diagonal
      ];

      for (const [[dx1, dy1], [dx2, dy2]] of offsets) {
        const n1 = lum[(y + dy1) * width + (x + dx1)];
        const n2 = lum[(y + dy2) * width + (x + dx2)];
        const minNeighbor = Math.min(n1, n2);
        if (minNeighbor - pixelLum > 30) {
          matchCount++;
        }
      }

      // Require at least 2 direction matches to reduce false edges
      if (matchCount >= 2) {
        output[idx] = 0;
      }
    }
  }
  return output;
}

function dilate(
  binary: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(binary.length);
  output.fill(255);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (binary[y * width + x] === 0) {
        output[y * width + x] = 0;
        output[(y - 1) * width + x] = 0;
        output[(y + 1) * width + x] = 0;
        output[y * width + (x - 1)] = 0;
        output[y * width + (x + 1)] = 0;
      }
    }
  }
  return output;
}

function cleanupSmallNoise(
  binary: Uint8ClampedArray,
  width: number,
  height: number,
  minSize: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(binary);
  const visited = new Uint8Array(binary.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (output[idx] === 0 && !visited[idx]) {
        const region: number[] = [];
        const stack = [idx];
        while (stack.length > 0) {
          const current = stack.pop()!;
          if (visited[current]) continue;
          visited[current] = 1;
          if (output[current] !== 0) continue;
          region.push(current);

          const cx = current % width;
          const cy = (current - cx) / width;
          if (cx > 0) stack.push(cy * width + cx - 1);
          if (cx < width - 1) stack.push(cy * width + cx + 1);
          if (cy > 0) stack.push((cy - 1) * width + cx);
          if (cy < height - 1) stack.push((cy + 1) * width + cx);
        }

        if (region.length < minSize) {
          for (const pixel of region) {
            output[pixel] = 255;
          }
        }
      }
    }
  }
  return output;
}

function hollowOutFilledRegions(
  binary: Uint8ClampedArray,
  width: number,
  height: number,
  lineThickness: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(binary);
  const visited = new Uint8Array(binary.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (output[idx] !== 0 || visited[idx]) continue;

      const region: number[] = [];
      const stack = [idx];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited[current]) continue;
        visited[current] = 1;
        if (output[current] !== 0) continue;
        region.push(current);

        const cx = current % width;
        const cy = (current - cx) / width;
        if (cx > 0) stack.push(cy * width + cx - 1);
        if (cx < width - 1) stack.push(cy * width + cx + 1);
        if (cy > 0) stack.push((cy - 1) * width + cx);
        if (cy < height - 1) stack.push((cy + 1) * width + cx);
      }

      if (region.length < 20) continue;

      // BFS from border inward
      const regionSet = new Set(region);
      const borderDist = new Map<number, number>();
      const bfsQueue: number[] = [];

      for (const pixel of region) {
        const px = pixel % width;
        const py = (pixel - px) / width;
        let isBorder = false;
        for (let dy = -1; dy <= 1 && !isBorder; dy++) {
          for (let dx = -1; dx <= 1 && !isBorder; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = px + dx;
            const ny = py + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
              isBorder = true;
            } else if (!regionSet.has(ny * width + nx)) {
              isBorder = true;
            }
          }
        }
        if (isBorder) {
          borderDist.set(pixel, 0);
          bfsQueue.push(pixel);
        }
      }

      let head = 0;
      while (head < bfsQueue.length) {
        const current = bfsQueue[head++];
        const dist = borderDist.get(current)!;
        const cx = current % width;
        const cy = (current - cx) / width;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nIdx = (cy + dy) * width + (cx + dx);
            if (regionSet.has(nIdx) && !borderDist.has(nIdx)) {
              borderDist.set(nIdx, dist + 1);
              bfsQueue.push(nIdx);
            }
          }
        }
      }

      for (const pixel of region) {
        const dist = borderDist.get(pixel) ?? 0;
        if (dist >= lineThickness) {
          output[pixel] = 255;
        }
      }
    }
  }

  return output;
}

export function imageToLineart(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const ctx = sourceCanvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, width, height);

  // 1. Remove background
  const noBackground = removeBackground(imageData.data, width, height);

  // 2. Extract outline pixels (absolute dark + local contrast detection)
  const lines = extractOutlinePixels(noBackground, width, height);

  // 3. Dilate to connect broken line segments
  const dilated = dilate(lines, width, height);

  // 4. Hollow out any large filled dark regions into outlines
  const hollowed = hollowOutFilledRegions(dilated, width, height, 3);

  // 5. Remove small noise
  const minNoiseSize = Math.max(Math.round((width * height) / 15000), 10);
  const cleaned = cleanupSmallNoise(hollowed, width, height, minNoiseSize);

  // Write output
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext("2d")!;
  const outData = outCtx.createImageData(width, height);

  for (let i = 0; i < cleaned.length; i++) {
    const offset = i * 4;
    outData.data[offset] = cleaned[i];
    outData.data[offset + 1] = cleaned[i];
    outData.data[offset + 2] = cleaned[i];
    outData.data[offset + 3] = 255;
  }

  outCtx.putImageData(outData, 0, 0);
  return outputCanvas;
}
