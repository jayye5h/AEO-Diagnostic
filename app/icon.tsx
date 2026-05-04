import { ImageResponse } from "next/og";

// Image metadata
export const size = {
    width: 32,
    height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #22d3ee, #8b5cf6, #a3e635)",
                    color: "#fff",
                    fontSize: "18px",
                    fontWeight: 900,
                    fontFamily: "sans-serif",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
                }}
            >
                A
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    );
}