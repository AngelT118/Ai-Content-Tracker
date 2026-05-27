import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 132,
            height: 132,
            borderRadius: 66,
            background: "#E8A5B8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#3D2E25",
            fontSize: 92,
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
