export const OSMOSIS_API_URL =
  "https://ftgrv77m9f.execute-api.us-west-2.amazonaws.com/prod";

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
