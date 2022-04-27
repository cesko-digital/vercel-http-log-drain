import {
  array,
  decodeType,
  nullable,
  record,
  string,
} from "typescript-json-decoder";

/** Credentials needed to work with the Vercel API */
export type AccessToken = decodeType<typeof decodeAccessToken>;

/** Decode `AccessToken` from an API response */
export const decodeAccessToken = record({
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

//
// Server-side API Calls
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
}): Promise<AccessToken> {
  const response = await fetch("https://api.vercel.com/v2/oauth/access_token", {
    method: "POST",
    body: new URLSearchParams(request),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  return await response.json().then(decodeAccessToken);
}

//
// Client-side API Calls
//

/** Client-side helper to trade the temporary setup code for regular access token */
export const getAccessTokenFromClient = async (code: string) =>
  await fetch(`/api/get-access-token?code=${code}`)
    .then((r) => r.json())
    .then(decodeAccessToken);

/** Client-side helper to get all available projects */
export async function getProjects(
  accessToken: string,
  teamId: string | null
): Promise<Project[]> {
  const decodeResponse = record({
    projects: array(decodeProject),
  });
  const url = teamId
    ? `https://api.vercel.com/v4/projects?teamId=${teamId}`
    : "https://api.vercel.com/v4/projects";
  const response = fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return await response
    .then((r) => r.json())
    .then(decodeResponse)
    .then((r) => r.projects);
}
