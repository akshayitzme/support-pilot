import { AI_CONF, models } from "../config/ai";

export const model = (() => {
  const { provider, modelName } = AI_CONF;

  switch (provider) {
    case "ollama":
      return models.ollama.get(modelName);
    case "google":
      return models.google[modelName];
    case "openai":
      return models.openai[modelName];
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
})();
