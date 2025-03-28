export const OSMOSIS_API_URL =
  "https://osmosis.gulp.dev";

export const defaultConfig = {
  enabled: true,
  logDestination: "cloud" as const,
  enabledAPIs: {
    openai: true,
    anthropic: true,
    langchainOpenai: true,
    langchainAnthropic: true,
  },
};
