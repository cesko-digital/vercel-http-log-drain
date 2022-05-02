import { getAccessToken } from "lib/vercel";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const { CLIENT_ID, CLIENT_SECRET, REDIRECT_HOST } = process.env;

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_HOST) {
    response.status(500).send("Required server env variables missing");
    return;
  }

  const code = request.query.code;
  if (!code || typeof code !== "string") {
    response.status(400).send("The “code” argument is missing or invalid");
    return;
  }

  const accessTokenResponse = await getAccessToken({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: `${REDIRECT_HOST}/callback`,
    code,
  });

  response.setHeader("Content-Type", "application/json");
  response.status(200).send(accessTokenResponse);
}
