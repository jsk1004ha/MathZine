import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f7f2e8",
          border: "2px solid #111111",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%"
        }}
      >
        <span
          style={{
            color: "#111111",
            fontFamily: "Georgia",
            fontSize: 34,
            fontWeight: 700,
            lineHeight: 1
          }}
        >
          M
        </span>
      </div>
    ),
    size
  );
}
