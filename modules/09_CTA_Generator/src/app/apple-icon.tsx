import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// "c" from Oi Regular (SIL OFL), outlined in a 100×100 box. Same glyph as icon.svg.
const C_PATH =
  "M50.6 75.2L50.6 75.2Q39.4 75.2 32.4 72.0Q25.4 68.8 22.2 63.0Q19.0 57.2 19.0 49.5L19.0 49.5Q19.0 41.8 22.1 36.3Q25.1 30.8 30.7 27.8Q36.2 24.8 43.6 24.8L43.6 24.8Q50.9 24.8 54.8 27.1Q58.8 29.3 59.0 35.6L59.0 35.6Q59.8 33.3 59.6 31.0Q59.4 28.6 59.2 26.4L59.2 26.4Q61.4 26.4 64.2 26.3Q67.0 26.2 69.9 26.1Q72.9 26.0 75.6 26.0Q78.2 25.9 80.1 25.9L80.1 25.9Q80.5 27.7 80.7 30.4Q80.9 33.2 81.0 36.4Q81.0 39.6 80.9 42.7Q80.7 45.8 80.3 48.2L80.3 48.2Q78.3 48.5 75.4 48.7Q72.4 48.8 69.0 48.9Q65.5 49.0 62.1 48.9Q58.6 48.8 55.8 48.7Q52.9 48.5 51.2 48.2L51.2 48.2L51.1 45.8L47.9 45.8L47.9 53.5L51.1 53.5L51.1 50.8Q65.3 50.2 80.7 50.8L80.7 50.8Q80.4 59.1 77.3 64.5Q74.2 69.9 67.8 72.6Q61.3 75.2 50.6 75.2Z";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#22223b" }}>
        <svg width="180" height="180" viewBox="0 0 100 100">
          <path d={C_PATH} fill="#f2e9e4" />
        </svg>
      </div>
    ),
    size,
  );
}
