import localFont from "next/font/local";

export const spaceGroteskBold = localFont({
  src: "../reflux-brand-assets/typography/fonts/SpaceGrotesk-Bold.ttf",
  variable: "--font-display",
  weight: "700",
  display: "swap",
});

export const spaceGroteskRegular = localFont({
  src: "../reflux-brand-assets/typography/fonts/SpaceGrotesk-Regular.ttf",
  variable: "--font-display-regular",
  weight: "400",
  display: "swap",
});

export const inter = localFont({
  src: "../reflux-brand-assets/typography/fonts/Inter-Regular.ttf",
  variable: "--font-body",
  weight: "100 900",
  display: "swap",
});
