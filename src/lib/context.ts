import { context } from "@actions/github";
import {
  getBooleanInput,
  getOptionalInput,
  getRequiredInput,
} from "./input";
import Logger from "./log";

export interface DeploymentContext {
  ref: string;
  sha: string;
  owner: string;
  repo: string;
  log: Logger;
  task: string | undefined;

  coreArgs: {
    description?: string;
    environment: string;
    logsURL: string;
  };
}

/**
 * Generates configuration for this action run.
 */
export function collectDeploymentContext(): DeploymentContext {
  const { ref, sha } = context;

  const customRepository = getOptionalInput("repository");

  const [owner, repo] = customRepository
    ? customRepository.split("/")
    : [context.repo.owner, context.repo.repo];
  if (!owner || !repo) {
    throw new Error(`invalid target repository: ${owner}/${repo}`);
  }

  return {
    ref: getOptionalInput("ref") || ref,
    sha,
    owner,
    repo,
    task: getOptionalInput("task"),
    log: new Logger({ debug: getBooleanInput("debug", false) }),
    coreArgs: {
      environment: getRequiredInput("env"),
      description: getOptionalInput("desc"),
      logsURL:
        getOptionalInput("logs") ||
        `https://github.com/${owner}/${repo}/commit/${sha}/checks`,
    },
  };
}
