import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FBF7F2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 70,
            background: "#E8A5B8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#3D2E25",
            fontSize: 96,
            fontStyle: "italic",
            fontFamily: "serif",
            fontWeight: 400,
            paddingBottom: 8,
          }}
        >
          a
        </div>
      </div>
    ),
    { ...size }
  );
}
