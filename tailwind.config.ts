import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        hero: {
          dark: "hsl(var(--hero-dark))",
          "gradient-start": "hsl(var(--hero-gradient-start))",
          "gradient-end": "hsl(var(--hero-gradient-end))",
        },
        ad: {
          bg: "hsl(var(--ad-bg))",
          border: "hsl(var(--ad-border))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "0.125rem",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "page-turn": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(-180deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-16px) rotate(6deg)" },
        },
        "drift-slow": {
          "0%": { transform: "translateX(0) translateY(0)" },
          "50%": { transform: "translateX(20px) translateY(-10px)" },
          "100%": { transform: "translateX(0) translateY(0)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        flicker: {
          "0%, 100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
          "25%": { transform: "scale(1.08) rotate(-3deg)", opacity: "0.92" },
          "50%": { transform: "scale(0.96) rotate(2deg)", opacity: "1" },
          "75%": { transform: "scale(1.05) rotate(-1deg)", opacity: "0.95" },
        },
        rise: {
          "0%": { transform: "translateY(0) scale(0.8)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translateY(-48px) scale(1.1)", opacity: "0" },
        },
        "path-dash": {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "page-turn": "page-turn 1s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "drift-slow": "drift-slow 12s ease-in-out infinite",
        "gradient-x": "gradient-x 4s ease infinite",
        flicker: "flicker 2s ease-in-out infinite",
        rise: "rise 3s ease-in infinite",
        "path-dash": "path-dash 1.5s linear infinite",
      },
    },
  },
  plugins: [tailwindAnimate, typography],
} satisfies Config;
