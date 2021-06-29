import { getInput } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { GitHub } from "@actions/github/lib/utils";
import Logger from "./log";

export interface DeploymentContext {
  ref: string;
  sha: string;
  owner: string;
  repo: string;
  github: InstanceType<typeof GitHub>;
  log: Logger;

  coreArgs: {
    description?: string;
    environment: string;
    logsURL: string;
  };
}

/**
 * Alternative to @actions/core.getBooleanInput that supports default values
 */
export function getBooleanInput(key: string, defaultTrue: boolean) {
  if (defaultTrue) {
    // unless 'false', always true
    return getInput(key) !== "false";
  }
  // unless 'true', always false
  return getInput(key) === "true";
}

/**
 * Generates configuration for this action run.
 */
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
    ref: getInput("ref") || ref,
    sha,
    owner,
    repo,
    github,
    log: new Logger({ debug: getBooleanInput("debug", false) }),
    coreArgs: {
      environment: getInput("env", { required: true }),
      description: getInput("desc"),
      logsURL:
        getInput("logs") ||
        `https://github.com/${owner}/${repo}/commit/${sha}/checks`,
    },
  };
}
