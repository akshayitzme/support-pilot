export const LINEAR_POLL_CONF = {
  API_URL: "https://api.linear.app/graphql",
  API_KEY: process.env.LINEAR_API_KEY ?? "",
  POLL_INTERVAL_MS: 60_000,
};
