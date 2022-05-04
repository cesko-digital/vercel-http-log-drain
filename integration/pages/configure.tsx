import { ChangeEvent, useState } from "react";
import { assert, randomString } from "lib/utils";
import {
  createLogDrain,
  deleteLogDrain,
  getLogDrains,
  getProjects,
  LogDrain,
  LogDrainType,
  Project,
} from "lib/vercel";

type Session = {
  teamId: string;
  accessToken: string;
  drains: LogDrain[];
  projects: Project[];
};

type State =
  | { tag: "login"; submitting: boolean; error?: string }
  | { tag: "logged_in"; session: Session }
  | {
      tag: "create_new_drain";
      session: Session;
      submitting: boolean;
      error?: string;
    };

const Page: React.FC = () => {
  const [state, setState] = useState<State>({
    tag: "login",
    submitting: false,
  });

  const handleLogin = async (teamId: string, accessToken: string) => {
    try {
      const drains = await getLogDrains(accessToken, teamId);
      const projects = await getProjects(accessToken, teamId);
      const session: Session = { teamId, accessToken, drains, projects };
      setState({ tag: "logged_in", session });
    } catch (e) {
      setState({ tag: "login", submitting: false, error: "Login failed." });
      console.error(e);
    }
  };

  const handleDrainCreation = async (params: DrainParams) => {
    assert(state.tag === "create_new_drain", "Invalid state");
    const { session } = state;
    const { accessToken, teamId } = session;
    try {
      const newDrain = await createLogDrain(accessToken, teamId, params);
      const drains = [...session.drains, newDrain];
      setState({ tag: "logged_in", session: { ...session, drains } });
    } catch (e) {
      setState({ ...state, submitting: false, error: `${e}` });
    }
  };

  const handleDrainDeletion = async (drainId: string) => {
    assert(state.tag === "logged_in", "Invalid state");
    try {
      const { session } = state;
      const { accessToken, teamId } = session;
      await deleteLogDrain(accessToken, drainId, teamId);
      const drains = session.drains.filter((drain) => drain.id !== drainId);
      setState({ ...state, session: { ...session, drains } });
    } catch (e) {
      console.error(e);
    }
  };

  switch (state.tag) {
    case "login":
      return (
        <LoginForm
          onSubmit={(teamId, accessToken) => {
            setState({ ...state, submitting: true });
            handleLogin(teamId, accessToken);
          }}
          submitting={state.submitting}
          error={state.error}
        />
      );
    case "logged_in": {
      const { session } = state;
      return (
        <DrainList
          drains={session.drains}
          onDeleteClick={handleDrainDeletion}
          onCreateClick={() =>
            setState({
              tag: "create_new_drain",
              submitting: false,
              session,
            })
          }
        />
      );
    }
    case "create_new_drain": {
      const { session, submitting, error } = state;
      return (
        <NewDrain
          onCancel={() => setState({ tag: "logged_in", session })}
          onSubmit={(params) => {
            setState({ ...state, submitting: true, error: undefined });
            handleDrainCreation(params);
          }}
          projects={session.projects}
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
  onSubmit?: (teamId: string, accessToken: string) => void;
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
    onSubmit(teamId, accessToken);
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
  onDeleteClick?: (id: string) => void;
};

const DrainList: React.FC<DrainListProps> = ({
  drains,
  onCreateClick = () => console.log("Create new drain"),
  onDeleteClick = (id) => console.log(`Delete drain ${id}`),
}) => (
  <div>
    <p>
      You have {drains.length} existing drain{drains.length !== 1 && "s"}.
    </p>
    <ul>
      {drains.map((drain) => (
        <li key={drain.id}>
          {drain.name} (<code>#{drain.id}</code>, type <code>{drain.type}</code>
          , logs to <a href={drain.url}>{drain.url}</a>){" "}
          <button onClick={() => onDeleteClick(drain.id)}>Delete</button>
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
  projects: Project[];
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
  projects,
}) => {
  const [params, setParams] = useState<DrainParams>({
    name: "",
    type: "ndjson", // Let’s make this customizable later
    url: "",
    projectId: "",
    secret: randomString(8),
  });

  const updateParams =
    <Key extends keyof DrainParams>(key: Key) =>
    (e: ChangeEvent<any>) =>
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

        <label htmlFor="projectId">Project filter:</label>
        <select id="projectId" onChange={updateParams("projectId")}>
          <option key="none" value="">
            none
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
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

export default Page;
