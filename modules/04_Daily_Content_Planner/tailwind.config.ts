import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1F3A63",
          dark: "#142744",
          light: "#2B4C7E",
        },
        orange: {
          DEFAULT: "#F08A0C",
          hover: "#D97907",
          light: "#FFF4E5",
        },
        yellow: {
          DEFAULT: "#F2BD4F",
          light: "#FEF7E6",
        },
        red: {
          DEFAULT: "#9B2226",
          hover: "#7D1B1E",
          light: "#FDF2F2",
        },
        lightblue: {
          DEFAULT: "#9EC3DD",
          light: "#EBF3F9",
        },
        // Semantic CSS Variable mapped theme colors
        bg: "var(--color-bg)",
        card: "var(--color-card)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        blockshadow: "var(--color-blockshadow)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-bricolage)", "sans-serif"],
      },
      boxShadow: {
        block: "4px 4px 0px var(--color-blockshadow)",
        "block-sm": "2px 2px 0px var(--color-blockshadow)",
        "block-lg": "6px 6px 0px var(--color-blockshadow)",
        "block-orange": "4px 4px 0px #F08A0C",
        "block-navy": "4px 4px 0px #1F3A63",
        "block-red": "4px 4px 0px #9B2226",
        "block-yellow": "4px 4px 0px #F2BD4F",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
