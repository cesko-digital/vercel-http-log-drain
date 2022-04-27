import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  AccessToken,
  getAccessTokenFromClient,
  getProjects,
  Project,
} from "lib/vercel";

export default function CallbackPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<AccessToken | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    const fetchAccessToken = async (code: string) =>
      await getAccessTokenFromClient(code).then(setCredentials);
    if (router.isReady && !credentials?.access_token) {
      const { code } = router.query;
      fetchAccessToken(code as string);
    }
  }, [router]);

  useEffect(() => {
    const fetchProjects = async (accessToken: string, teamId: string | null) =>
      await getProjects(accessToken, teamId).then(setProjects);
    if (credentials) {
      const { access_token, team_id } = credentials;
      fetchProjects(access_token, team_id);
    }
  }, [credentials]);

  return (
    <div>
      <div className="w-full max-w-2xl divide-y">
        <section className="py-4 flex items-center space-x-2 justify-center">
          <h1 className="text-lg font-medium">Integration is installed on a</h1>

          {credentials?.access_token && (
            <div className="rounded-md bg-blue-500 text-white text-sm px-2.5 py-0.5">
              {/* If we have a teamId, the installation is made on a team */}
              {credentials.user_id && credentials.team_id
                ? "team"
                : "personal account"}
            </div>
          )}
        </section>

        <section className="py-4">
          <h1 className="text-lg font-medium">Data:</h1>
          <div className="mt-1">
            {credentials?.access_token ? (
              <pre className="text-sm">
                {JSON.stringify(credentials, null, 2)}
              </pre>
            ) : (
              <Loader />
            )}
          </div>
        </section>

        <section className="py-4">
          <h1 className="text-lg font-medium">Projects:</h1>
          <div className="mt-1">
            {projects ? (
              <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                {projects.map((project) => (
                  <div key={project.id} className="truncate">
                    {project.name}
                  </div>
                ))}
              </div>
            ) : (
              <Loader />
            )}
          </div>
        </section>

        <section className="py-4 flex justify-center">
          {/* This redirect should happen programmatically if you're done with everything on your side */}
          <button
            className="bg-black hover:bg-gray-900 text-white px-6 py-1 rounded-md"
            onClick={() => {
              router.push(router.query.next as string);
            }}
          >
            Redirect me back to Vercel
          </button>
        </section>
      </div>
    </div>
  );
}

const Loader = () => <p>Loading…</p>;
