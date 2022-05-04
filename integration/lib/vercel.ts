import {
  array,
  decodeType,
  nullable,
  number,
  record,
  string,
  union,
} from "typescript-json-decoder";

/** Credentials needed to work with the Vercel API */
export type Credentials = decodeType<typeof decodeCredentials>;

/** Decode `Credentials` from an API response */
export const decodeCredentials = record({
  token_type: string,
  access_token: string,
  installation_id: string,
  user_id: string,
  team_id: nullable(string),
});

/** A Vercel project */
export type Project = decodeType<typeof decodeProject>;

/**
 * Decode `Project` from an API response
 *
 * TBD: There are many other properties available in the response if someone is interested.
 */
export const decodeProject = record({
  accountId: string,
  id: string,
  name: string,
});

/** A Vercel log drain */
export type LogDrain = decodeType<typeof decodeLogDrain>;

/** Decode `LogDrain` from an API response */
export const decodeLogDrain = record({
  clientId: string,
  configurationId: string,
  createdAt: number,
  id: string,
  type: union("json", "ndjson", "syslog"),
  name: string,
  ownerId: string,
  projectId: nullable(string),
  url: string,
});

/** What format to send logs in, see https://vercel.com/docs/log-drains */
export type LogDrainType = LogDrain["type"];

//
// API Calls
//

/**
 * Server-side call to trade the setup code for regular access token
 *
 * The client ID and secret are available at the integration setup page.
 * The code is the temporary setup code passed by Vercel to the integration
 * page. The redirect URL should match the redirect URL in your
 * integration’s setup page on Vercel.
 */
export async function getAccessToken(request: {
  client_id: string;
  client_secret: string;
  code: string;
  redirect_uri: string;
}): Promise<Credentials> {
  const response = await fetch("https://api.vercel.com/v2/oauth/access_token", {
    method: "POST",
    body: new URLSearchParams(request),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  return await response.json().then(decodeCredentials);
}

/** Client-side helper to trade the temporary setup code for regular access token */
export const getAccessTokenFromClient = async (code: string) =>
  await fetch(`/api/get-access-token?code=${code}`)
    .then((r) => r.json())
    .then(decodeCredentials);

/** Retrieve a list of all log drains that are defined for the authorized account */
export async function getLogDrains(
  accessToken: string,
  teamId: string | undefined = undefined
): Promise<LogDrain[]> {
  const url = getResourceUrl("/v1/integrations/log-drains", teamId);
  const response = fetch(url, {
    headers: authHeader(accessToken),
  });
  return await response.then((r) => r.json()).then(array(decodeLogDrain));
}

/** Creates a log drain */
export async function createLogDrain(
  accessToken: string,
  teamId: string | null,
  drain: {
    /** The name of the log drain */
    name: string;
    /** The type of log format */
    type: LogDrainType;
    /**
     * The url where you will receive logs. The protocol must be `https://` or `http://`
     * when type is `json` and `ndjson`, and `syslog+tls:` or `syslog:` when the type is
     * `syslog`.
     */
    url: string;
    /** The project identifier to filter logs */
    projectId: string | undefined;
    /**
     * A secret to sign log drain notification headers so a consumer can verify their
     * authenticity
     */
    secret: string | undefined;
  }
): Promise<LogDrain> {
  const url = getResourceUrl("/v1/integrations/log-drains", teamId);
  const response = fetch(url, {
    method: "POST",
    body: JSON.stringify(drain, null, 2),
    headers: {
      "Content-Type": "application/json",
      ...authHeader(accessToken),
    },
  });
  return await response.then((r) => r.json()).then(decodeLogDrain);
}

/** Delete a log drain */
export async function deleteLogDrain(
  accessToken: string,
  drainId: string,
  teamId: string | null
): Promise<void> {
  const url = getResourceUrl(`/v1/integrations/log-drains/${drainId}`, teamId);
  const response = await fetch(url, {
    method: "DELETE",
    headers: authHeader(accessToken),
  });
  switch (response.status) {
    case 204:
      return;
    case 400:
      throw "One of the provided values in the request query is invalid";
    case 403:
      throw "You do not have permission to access this resource";
    case 404:
      throw "The log drain was not found";
    default:
      throw `Unexpected HTTP status code ${response.status}`;
  }
}

/** Client-side helper to get all available projects */
export async function getProjects(
  accessToken: string,
  teamId: string | null
): Promise<Project[]> {
  const decodeResponse = record({
    projects: array(decodeProject),
  });
  const url = getResourceUrl("/v4/projects", teamId);
  const response = fetch(url, {
    headers: authHeader(accessToken),
  });
  return await response
    .then((r) => r.json())
    .then(decodeResponse)
    .then((r) => r.projects);
}

//
// Helpers
//

const authHeader = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

function getResourceUrl(path: string, teamId: string | null = null): string {
  const base = "https://api.vercel.com";
  const appendix = teamId ? `?teamId=${teamId}` : "";
  return `${base}${path}${appendix}`;
}
