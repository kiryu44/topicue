import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import packageMetadata from "../package.json" with { type: "json" };

extendZodWithOpenApi(z);

export const createOpenApiDocument = async () => {
  const [{ packExportSchema }, { promptPackConfigSchema }, { publicStandaloneConfigSchema }] =
    await Promise.all([
      import("../src/modules/prompt-pack/application/portable"),
      import("../src/modules/prompt-pack/domain/schema"),
      import("../src/modules/standalone-export/public-schema"),
    ]);
  const registry = new OpenAPIRegistry();
  const registeredPromptPackSchema = registry.register(
    "PromptPackConfigV1",
    promptPackConfigSchema,
  );
  registry.register("PackExportV1", packExportSchema.extend({ pack: registeredPromptPackSchema }));
  registry.register("PublicStandaloneConfigV1", publicStandaloneConfigSchema);

  const generator = new OpenApiGeneratorV31(registry.definitions, {
    sortComponents: "alphabetically",
  });

  return {
    ...generator.generateDocument({
      openapi: "3.1.0",
      info: {
        title: "Topicue Schemas",
        version: packageMetadata.version,
        description:
          "Topicueはローカルファーストで、現行版にHTTP API endpointはありません。Pack編集、JSON Export、OBS公開用のデータ契約をcomponents.schemasへ生成しています。",
      },
    }),
    "x-generated-by": "pnpm openapi:generate",
    "x-topicue-data-model": {
      packStorage: "browser-indexeddb",
      obsSessionStorage: "standalone-local-storage",
      serverPersistence: "none",
    },
  };
};
