// Browser entry bundled by scripts/excalidraw.sh. It renders window.__SCENE__ (an
// .excalidraw file's JSON) to an SVG in dark mode, with the fonts it uses embedded, and
// sets the page title to DONE or ERROR for the headless run to read.
import { exportToSvg } from "@excalidraw/excalidraw";

const scene = window.__SCENE__;
exportToSvg({
  elements: scene.elements,
  appState: {
    ...(scene.appState || {}),
    exportBackground: false,
    exportWithDarkMode: true,
    exportEmbedScene: false,
  },
  files: scene.files || {},
})
  .then((svg) => {
    document.body.replaceChildren(svg);
    document.title = "DONE";
  })
  .catch((error) => {
    document.body.textContent = `ERROR ${error}`;
    document.title = "ERROR";
  });
