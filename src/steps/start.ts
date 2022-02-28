import { GitHub } from "@actions/github/lib/utils";

import { DeploymentContext } from "../lib/context";
import deactivateEnvironment from "../lib/deactivate";

export type StartArgs = {
  deploymentID?: string;
  override: boolean;
  payload?: { [key: string]: any };
};

async function createStart(
  github: InstanceType<typeof GitHub>,
  context: DeploymentContext,
  stepArgs: StartArgs
) {
  if (stepArgs.override) {
    await deactivateEnvironment(github, context);
  }

  const {
    log,
    owner,
    repo,
    ref,
    coreArgs: { environment, description, logsURL },
  } = context;

  let deploymentID = -1;
  if (!stepArgs.deploymentID) {
    log.info(`initializing new deployment for ${environment} @ ${ref}`);
    const deployment = await github.rest.repos.createDeployment({
      owner: owner,
      repo: repo,
      ref: ref,
      required_contexts: [],
      environment: environment,
      description: description,
      auto_merge: false,
      transient_environment: true,
      payload: stepArgs.payload,
    });
    if (deployment.status == 201) {
      deploymentID = deployment.data.id;
    } else {
      log.fail(`unexpected ${deployment.status} on deployment creation`, {
        response: deployment,
      });
    }
  } else {
    deploymentID = parseInt(stepArgs.deploymentID, 10);
    log.info(
      `initializing deployment ${deploymentID} for ${environment} @ ${ref}`
    );
  }
  log.info(`created deployment ${deploymentID} for ${environment} @ ${ref}`);

  const {
    data: { id: statusID },
  } = await github.rest.repos.createDeploymentStatus({
    owner: owner,
    repo: repo,
    deployment_id: deploymentID,
    state: "in_progress",
    log_url: logsURL,
    description: description,
    ref: ref,
  });
  log.info(`created deployment status ${statusID} with status "in_progress"`);

  return {
    deploymentID,
    statusID,
  };
}

export default createStart;
