import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
        },
        accent: {
          500: "#2563eb",
          600: "#1d4ed8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
