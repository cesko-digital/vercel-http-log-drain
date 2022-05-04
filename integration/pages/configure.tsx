import { ChangeEvent, useState } from "react";
import {
  createLogDrain,
  getLogDrains,
  LogDrain,
  LogDrainType,
} from "lib/vercel";

type Credentials = {
  teamId: string;
  accessToken: string;
};

type State =
  | { tag: "login"; submitting: boolean; error?: string }
  | { tag: "logged_in"; credentials: Credentials; drains: LogDrain[] }
  | {
      tag: "create_new_drain";
      credentials: Credentials;
      drains: LogDrain[];
      submitting: boolean;
      error?: string;
    };

const Page: React.FC = () => {
  const [state, setState] = useState<State>({
    tag: "login",
    submitting: false,
  });

  const handleLogin = async (credentials: Credentials) => {
    const { teamId, accessToken } = credentials;
    try {
      const drains = await getLogDrains(accessToken, teamId);
      setState({ tag: "logged_in", credentials, drains });
    } catch (e) {
      console.error(e);
      setState({ tag: "login", submitting: false, error: "Login failed." });
    }
  };

  const handleDrainCreation = async (params: DrainParams) => {
    if (state.tag !== "create_new_drain") {
      throw "Invalid state";
    }
    const { credentials, drains } = state;
    const { accessToken, teamId } = credentials;
    try {
      const newDrain = await createLogDrain(accessToken, teamId, params);
      setState({
        tag: "logged_in",
        drains: [...drains, newDrain],
        credentials,
      });
    } catch (e) {
      setState({ ...state, submitting: false, error: `${e}` });
    }
  };

  switch (state.tag) {
    case "login":
      return (
        <LoginForm
          onSubmit={(credentials) => {
            setState({ ...state, submitting: true });
            handleLogin(credentials);
          }}
          submitting={state.submitting}
          error={state.error}
        />
      );
    case "logged_in": {
      const { credentials, drains } = state;
      return (
        <DrainList
          drains={state.drains}
          onCreateClick={() =>
            setState({
              tag: "create_new_drain",
              credentials,
              drains,
              submitting: false,
            })
          }
        />
      );
    }
    case "create_new_drain": {
      const { credentials, drains, submitting, error } = state;
      return (
        <NewDrain
          onCancel={() => setState({ tag: "logged_in", credentials, drains })}
          onSubmit={(params) => {
            setState({ ...state, submitting: true, error: undefined });
            handleDrainCreation(params);
          }}
          submitting={submitting}
          error={error}
        />
      );
    }
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
          required
          onChange={(e) => setTeamId(e.target.value)}
        />
        <label htmlFor="accessToken">Access token:</label>
        <input
          type="password"
          id="accessToken"
          disabled={submitting}
          required
          onChange={(e) => setAccessToken(e.target.value)}
        />
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

export type DrainListProps = {
  drains: LogDrain[];
  onCreateClick?: () => void;
};

const DrainList: React.FC<DrainListProps> = ({
  drains,
  onCreateClick = undefined,
}) => (
  <div>
    <p>
      You have {drains.length} existing drain{drains.length !== 1 && "s"}.
    </p>
    <ul>
      {drains.map((drain) => (
        <li key={drain.id}>
          {drain.name} (<code>#{drain.id}</code>, type <code>{drain.type}</code>
          , logs to <a href={drain.url}>{drain.url}</a>)
        </li>
      ))}
    </ul>
    <button onClick={onCreateClick}>Create new drain</button>
  </div>
);

//
// New Drain
//

// TODO: Treat empty strings as undefines?
type DrainParams = {
  name: string;
  type: LogDrainType;
  url: string;
  projectId: string;
  secret: string;
};

type NewDrainProps = {
  submitting?: boolean;
  onSubmit?: (params: DrainParams) => void;
  onCancel?: () => void;
  error?: string;
};

const NewDrain: React.FC<NewDrainProps> = ({
  onSubmit = (params) => console.log(params),
  onCancel = undefined,
  submitting = false,
  error = undefined,
}) => {
  const [params, setParams] = useState<DrainParams>({
    name: "",
    type: "ndjson", // Let’s make this customizable later
    url: "",
    projectId: "",
    secret: randomStr(8),
  });

  const updateParams =
    <Key extends keyof DrainParams>(key: Key) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setParams({ ...params, [key]: e.target.value });

  const handleSubmit = (event: any) => {
    onSubmit(params);
    event.preventDefault();
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Name:</label>
        <input
          type="text"
          name="name"
          id="name"
          value={params.name}
          onChange={updateParams("name")}
          disabled={submitting}
          required
        />
        <br />

        <label htmlFor="url">URL:</label>
        <input
          type="text"
          name="url"
          id="url"
          value={params.url}
          onChange={updateParams("url")}
          disabled={submitting}
          required
        />
        <br />

        <label htmlFor="projectId">Project ID:</label>
        <input
          type="text"
          name="projectId"
          id="projectId"
          value={params.projectId}
          onChange={updateParams("projectId")}
          disabled={submitting}
        />
        <br />

        <label htmlFor="secret">Secret:</label>
        <input
          type="text"
          name="secret"
          id="secret"
          value={params.secret}
          onChange={updateParams("secret")}
          disabled={submitting}
        />
        <br />

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating new drain…" : "Create new drain"}
        </button>
        <button disabled={submitting} onClick={onCancel}>
          Cancel
        </button>
      </form>

      {error && <p>{error}</p>}
    </>
  );
};

//
// Helpers
//

const randomStr = (length: number) =>
  (Math.random() + 1).toString(36).slice(2, 2 + length);

export default Page;
