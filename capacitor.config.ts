import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "co.minjae.sprout",
  appName: "Sprout",
  webDir: ".next-native",
  ios: {
    // "never": the web view runs under the home indicator and the page paints the safe area itself (pb-safe),
    // so dark mode shows no light band at the bottom. Rubber-banding is off via overscroll-behavior in CSS.
    contentInset: "never",
    backgroundColor: "#FAF6EE",
    preferredContentMode: "mobile",
    scheme: "Sprout",
  },
  plugins: {
    LocalNotifications: {
      presentationOptions: ["banner", "sound"],
    },
  },
};

export default config;
