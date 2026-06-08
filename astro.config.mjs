// @ts-check
import { defineConfig, fontProviders } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import icon from "astro-icon";

import netlify from "@astrojs/netlify";

import astroInspectClip from "astro-inspect-clip";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Roboto",
      cssVariable: "--font-roboto",
    },
  ],
  integrations: [icon(), astroInspectClip()],
  adapter: netlify(),
});
