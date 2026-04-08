import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        luca: {
          primary: "#06C755", // LINE green
          secondary: "#4A90D9",
          background: "#F5F5F5",
        },
      },
    },
  },
  plugins: [],
};

export default config;
