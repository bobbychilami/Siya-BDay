import { defineConfig } from "vite";

export default defineConfig({
  base: "/Siya-BDay/",
  optimizeDeps: {
    include: ["gsap", "gsap/ScrollTrigger"],
  },
  build: {
    target: "es2020",
  },
});
