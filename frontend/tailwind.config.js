/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        graphite: "#0B0E11",
        panel: "#12161B",
        hairline: "#232A31",
        amber: "#FF8A3D",
        cyan: "#4FD1C5",
        danger: "#FF5470",
        ink: "#E8ECEF",
        muted: "#8B959E",
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};
