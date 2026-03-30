/**
 * Converts a color image to black-and-white line art for coloring pages.
 * Uses a pencil-sketch technique (invert + blur + color dodge blend) which
 * produces cleaner outlines than pure edge detection, especially for cartoons.
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

function gaussianBlurSeparable(
  input: Float32Array,
  width: number,
  height: number,
  radius: number
): Float32Array {
  // Generate 1D Gaussian kernel
  const sigma = radius / 2;
  const kernelSize = radius * 2 + 1;
  const kernel = new Float32Array(kernelSize);
  let sum = 0;
  for (let i = 0; i < kernelSize; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < kernelSize; i++) kernel[i] /= sum;

  // Horizontal pass
  const temp = new Float32Array(input.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let k = -radius; k <= radius; k++) {
        const px = Math.min(Math.max(x + k, 0), width - 1);
        val += input[y * width + px] * kernel[k + radius];
      }
      temp[y * width + x] = val;
    }
  }

  // Vertical pass
  const output = new Float32Array(input.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let k = -radius; k <= radius; k++) {
        const py = Math.min(Math.max(y + k, 0), height - 1);
        val += temp[py * width + x] * kernel[k + radius];
      }
      output[y * width + x] = val;
    }
  }
  return output;
}

function colorDodgeBlend(base: Float32Array, blend: Float32Array): Float32Array {
  // Color Dodge: result = base / (1 - blend/255) clamped to 255
  // base = grayscale, blend = inverted + blurred grayscale
  const output = new Float32Array(base.length);
  for (let i = 0; i < base.length; i++) {
    const b = blend[i];
    if (b >= 255) {
      output[i] = 255;
    } else {
      output[i] = Math.min((base[i] * 255) / (255 - b), 255);
    }
  }
  return output;
}

function threshold(data: Float32Array, value: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i++) {
    output[i] = data[i] > value ? 255 : 0;
  }
  return output;
}

function posterize(
  data: Uint8ClampedArray,
  levels: number
): Uint8ClampedArray {
  // Reduce color depth to flatten highlights and gradients into solid blocks.
  // Each channel is quantized to `levels` discrete values.
  const output = new Uint8ClampedArray(data);
  const step = 255 / (levels - 1);
  const halfStep = step / 2;

  for (let i = 0; i < data.length; i += 4) {
    output[i] = Math.round(Math.round((data[i] + halfStep) / step) * step);       // R
    output[i + 1] = Math.round(Math.round((data[i + 1] + halfStep) / step) * step); // G
    output[i + 2] = Math.round(Math.round((data[i + 2] + halfStep) / step) * step); // B
    // Keep alpha unchanged
  }
  return output;
}

function removeBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  // Flood-fill from edges to remove near-white background
  // Makes the background pure white so color dodge doesn't create edge artifacts
  const output = new Uint8ClampedArray(data);
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];

  const isBackground = (idx: number) => {
    const offset = idx * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];
    // Near-white or transparent = background
    return (r > 230 && g > 230 && b > 230) || a < 128;
  };

  // Seed from all 4 edges
  for (let x = 0; x < width; x++) {
    stack.push(x); // top row
    stack.push((height - 1) * width + x); // bottom row
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width); // left col
    stack.push(y * width + width - 1); // right col
  }

  while (stack.length > 0) {
    const idx = stack.pop()!;
    if (idx < 0 || idx >= width * height) continue;
    if (visited[idx]) continue;
    visited[idx] = 1;
    if (!isBackground(idx)) continue;

    // Set to pure white
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

function hollowOutFilledRegions(
  binary: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  // Convert filled black blobs to outlines only using flood fill.
  // For each connected black region, find border pixels (adjacent to white)
  // and set interior pixels to white.
  const output = new Uint8ClampedArray(binary);
  const visited = new Uint8Array(binary.length);
  const LINE_THICKNESS = 4; // keep borders this many pixels thick

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (output[idx] !== 0 || visited[idx]) continue;

      // Flood fill to collect entire connected black region
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

      // Skip thin regions (lines) — no need to hollow
      if (region.length < 20) continue;

      // Mark border pixels: black pixels adjacent to any white pixel
      const regionSet = new Set(region);
      const borderDist = new Map<number, number>();

      // BFS from border pixels inward to compute distance
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

      // BFS to find distance from border
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

      // Remove pixels deeper than LINE_THICKNESS from border
      for (const pixel of region) {
        const dist = borderDist.get(pixel) ?? 0;
        if (dist >= LINE_THICKNESS) {
          output[pixel] = 255;
        }
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
  // Remove small isolated black pixel groups (noise) using flood fill
  const output = new Uint8ClampedArray(binary);
  const visited = new Uint8Array(binary.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (output[idx] === 0 && !visited[idx]) {
        // Flood fill to find connected black region
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

        // Remove if too small
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

function dilate(
  binary: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  // 3x3 cross dilation: spread each black pixel to its 4 direct neighbors
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

export function imageToLineart(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const ctx = sourceCanvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, width, height);

  // 1. Posterize — flatten highlights and gradients into solid color blocks
  const posterized = posterize(imageData.data, 4);

  // 2. Remove background (flood-fill from edges, set near-white to pure white)
  const cleanedData = removeBackground(posterized, width, height);

  // 3. Grayscale on background-removed image
  const gray = grayscale(cleanedData);

  // 4. Invert the grayscale
  const inverted = new Float32Array(gray.length);
  for (let i = 0; i < gray.length; i++) {
    inverted[i] = 255 - gray[i];
  }

  // 5. Heavy Gaussian blur on the inverted image
  const blurRadius = Math.max(Math.round(Math.min(width, height) / 35), 10);
  const blurred = gaussianBlurSeparable(inverted, width, height, blurRadius);

  // 6. Color Dodge blend: original gray / (1 - blurred/255)
  const sketch = colorDodgeBlend(gray, blurred);

  // 7. Threshold — lower value = more/thicker lines
  const binary = threshold(sketch, 220);

  // 8. Dilate to make lines more solid before hollowing
  const dilated = dilate(binary, width, height);

  // 9. Hollow out filled black regions — keep only outlines
  const hollowed = hollowOutFilledRegions(dilated, width, height);

  // 10. Remove small noise clusters
  const minNoiseSize = Math.max(Math.round((width * height) / 30000), 8);
  const final = cleanupSmallNoise(hollowed, width, height, minNoiseSize);

  // Write to output canvas
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext("2d")!;
  const outData = outCtx.createImageData(width, height);

  for (let i = 0; i < final.length; i++) {
    const offset = i * 4;
    outData.data[offset] = final[i];
    outData.data[offset + 1] = final[i];
    outData.data[offset + 2] = final[i];
    outData.data[offset + 3] = 255;
  }

  outCtx.putImageData(outData, 0, 0);
  return outputCanvas;
}
