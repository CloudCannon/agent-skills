import { registerAstroComponent } from "@cloudcannon/editable-regions/astro";
import { componentMap } from "./componentMap";

for (const [key, component] of Object.entries(componentMap)) {
  registerAstroComponent(key, component);
}
