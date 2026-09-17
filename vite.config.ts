import vike from "vike/plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { telefunc } from "telefunc/vite";

export default defineConfig({
  plugins: [vike(), react(), tailwindcss(), telefunc()],
});
