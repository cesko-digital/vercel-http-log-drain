import { getLogDrains, LogDrain } from "lib/vercel";
import { useState } from "react";

type Credentials = {
  teamId: string;
  accessToken: string;
};

type State =
  | { tag: "login" }
  | { tag: "logging_in" }
  | { tag: "login_failed" }
  | { tag: "logged_in"; credentials: Credentials; drains: LogDrain[] };

const Page: React.FC = () => {
  const [state, setState] = useState<State>({ tag: "login" });
  const fetchLogDrains = async (credentials: Credentials) => {
    const { teamId, accessToken } = credentials;
    try {
      const drains = await getLogDrains(accessToken, teamId);
      setState({ tag: "logged_in", credentials, drains });
    } catch (e) {
      console.error(e);
      setState({ tag: "login_failed" });
    }
  };
  const handleLogin = (credentials: Credentials) => {
    setState({ tag: "logging_in" });
    fetchLogDrains(credentials);
  };
  switch (state.tag) {
    case "login":
      return <LoginForm onSubmit={handleLogin} />;
    case "logging_in":
      return <LoginForm submitting={true} />;
    case "login_failed":
      return <LoginForm onSubmit={handleLogin} error="Login failed." />;
    case "logged_in":
      return <DrainList drains={state.drains} />;
  }
};

//
// Login Form
//

type LoginFormProps = {
  submitting?: boolean;
  onSubmit?: (credentials: Credentials) => void;
  error?: string;
};

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit = () => {},
  submitting = false,
  error = undefined,
}) => {
  const [accessToken, setAccessToken] = useState("");
  const [teamId, setTeamId] = useState("");
  const handleSubmit = (event: any) => {
    onSubmit({ teamId, accessToken });
    event.preventDefault();
  };
  return (
    <>
      <form onSubmit={handleSubmit}>
        <label htmlFor="teamId">Team ID:</label>
        <input
          type="text"
          id="teamId"
          disabled={submitting}
          onChange={(e) => setTeamId(e.target.value)}
        ></input>
        <label htmlFor="accessToken">Access token:</label>
        <input
          type="password"
          id="accessToken"
          disabled={submitting}
          onChange={(e) => setAccessToken(e.target.value)}
        ></input>
        <button type="submit" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      {error && <p>{error}</p>}
    </>
  );
};

//
// Drains Overview
//

const DrainList: React.FC<{ drains: LogDrain[] }> = ({ drains }) => (
  <ul>
    {drains.map((drain) => (
      <li key={drain.id}>
        {drain.name} (<code>#{drain.id}</code>, type <code>{drain.type}</code>,
        logs to <a href={drain.url}>{drain.url}</a>)
      </li>
    ))}
  </ul>
);

export default Page;
