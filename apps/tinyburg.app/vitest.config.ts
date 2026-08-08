import { foldkit } from "@foldkit/vite-plugin";
import { defineConfig } from "vitest/config";

/*
  Scene tests render the real views to a vdom and drive them. There is no DOM
  and no browser: foldkit's runtime schedules through requestAnimationFrame, so
  booting the whole application under jsdom does not work, and Scene sidesteps
  the question by never touching a document at all.

  The foldkit plugin is here for the same reason it is in `vite.config.ts`: it
  stamps view identity onto returned vnodes, which is what makes the differ
  replace a subtree rather than patch it when the producing function changes.
  Without it the tests would diff by position and keys, which is not what ships.
*/
export default defineConfig({
    plugins: [foldkit()],
    test: {
        name: "tinyburg.app",
        environment: "node",
        include: ["test/**/*.test.ts"],
        setupFiles: ["./vitest.setup.ts"],
    },
});
