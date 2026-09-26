// Standalone Node tests use Next's empty server implementation of the marker.
// Next itself rejects imports of this marker from a client module graph.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return nextResolve("next/dist/compiled/server-only/empty.js", context);
    }
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      // Production imports follow Next/TypeScript extensionless conventions.
      if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});
