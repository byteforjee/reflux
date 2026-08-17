import { Space_Grotesk, Inter } from "next/font/google";

export const spaceGroteskBold = Space_Grotesk({
  variable: "--font-display",
  weight: "700",
  subsets: ["latin"],
  display: "swap",
});

export const spaceGroteskRegular = Space_Grotesk({
  variable: "--font-display-regular",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});
