// FormFit Cosmic Nebula Theme
import { Platform } from "react-native";

export const colors = {
  bg: "#0B0B14",
  bgAlt: "#13122B",
  surface: "#131226",
  surfaceHigh: "#1F1F2E",
  glass: "rgba(240,240,255,0.06)",
  glassBorder: "rgba(139,92,246,0.35)",

  violet: "#8B5CF6",
  cyan: "#22D3EE",
  magenta: "#E879F9",
  green: "#4ADE80",
  red: "#F43F5E",

  text: "#F1F0F9",
  textDim: "#9C97B8",
  textFaint: "#6B6884",

  neomorphLight: "rgba(140,150,255,0.10)",
  neomorphDark: "rgba(0,0,10,0.65)",
};

export const gradient = {
  primary: [colors.violet, colors.cyan] as const,
  magenta: [colors.magenta, colors.violet] as const,
  success: [colors.green, colors.cyan] as const,
  danger: [colors.red, colors.magenta] as const,
  bg: ["#0B0B14", "#13122B", "#0B0B14"] as const,
  nebula: ["rgba(139,92,246,0.18)", "rgba(34,211,238,0.10)", "transparent"] as const,
};

export const radius = { sm: 12, md: 16, lg: 20, xl: 24, xxl: 28, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const font = {
  family: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
  sizeH1: 32, sizeH2: 24, sizeH3: 20, sizeBody: 16, sizeSm: 14, sizeCaps: 12,
};

export const neomorph = {
  base: {
    backgroundColor: colors.surface,
    shadowColor: "#8C96FF",
    shadowOffset: { width: -3, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
};
