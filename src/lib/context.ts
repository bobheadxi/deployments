import { getInput } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { GitHub } from "@actions/github/lib/utils";

export interface DeploymentContext {
  ref: string;
  sha: string;
  owner: string;
  repo: string;
  github: InstanceType<typeof GitHub>;

  coreArgs: {
    autoInactive: boolean;
    logsURL: string;
    description?: string;
    logArgs: boolean;
  };
}

export function collectDeploymentContext(): DeploymentContext {
  const { ref, sha } = context;

  const customRepository = getInput("repository", { required: false });

  const [owner, repo] = customRepository
    ? customRepository.split("/")
    : [context.repo.owner, context.repo.repo];

  if (!owner || !repo) {
    throw new Error(`invalid target repository: ${owner}/${repo}`);
  }

  const github = getOctokit(getInput("token", { required: true }), {
    previews: ["ant-man-preview", "flash-preview"],
  });

  return {
    ref,
    sha,
    owner,
    repo,
    github,
    coreArgs: {
      autoInactive: getInput("auto_inactive") !== "false",
      logsURL:
        getInput("logs") ||
        `https://github.com/${owner}/${repo}/commit/${sha}/checks`,
      description: getInput("desc"),
      logArgs: getInput("log_args") === "true",
    },
  };
}
