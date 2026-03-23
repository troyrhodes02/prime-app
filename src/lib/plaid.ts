import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

function getPlaidEnvironment(env: string): string {
  switch (env) {
    case "production":
      return PlaidEnvironments.production;
    case "development":
      return PlaidEnvironments.development;
    default:
      return PlaidEnvironments.sandbox;
  }
}

const configuration = new Configuration({
  basePath: getPlaidEnvironment(process.env.PLAID_ENV ?? "sandbox"),
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);
