import { GitHub } from "@actions/github/lib/utils";

import { DeploymentContext } from "./context";

/**
 * Mark all deployments within this environment as `inactive`.
 */
async function deactivateEnvironment(
  github: InstanceType<typeof GitHub>,
  { log, owner, repo, coreArgs: { environment } }: DeploymentContext
) {
  const deployments = await github.rest.repos.listDeployments({
    owner,
    repo,
    environment,
    per_page: 100,
  });
  const existing = deployments.data.length;
  if (existing === 0) {
    log.info(`found no existing deployments for env ${environment}`);
    return;
  }

  const deactivatedState = "inactive";
  log.info(`${environment}: found ${existing} existing deployments for env`);
  for (let i = 0; i < existing; i++) {
    const deployment = deployments.data[i];
    log.info(
      `${environment}.${deployment.id}: setting deployment (${deployment.sha}) state to "${deactivatedState}"`
    );

    // Check existing status, to avoid setting it to the already current value.
    // See https://github.com/bobheadxi/deployments/issues/92.
    const getStatusRes = await github.rest.repos.listDeploymentStatuses({
      owner,
      repo,
      deployment_id: deployment.id,
      per_page: 1, // we only need the latest status
    })

    // If a previous status exists, and it is inactive, then we don't need to update it.
    if (getStatusRes.data.length === 1 && getStatusRes.data[0].state === deactivatedState) {
      log.debug(`${environment}.${deployment.id} is already ${deactivatedState}; skipping.`);
      continue;
    }

    // Otherwise, set the deployment to "inactive".
    const createStatusRes = await github.rest.repos.createDeploymentStatus({
      owner,
      repo,
      deployment_id: deployment.id,
      state: deactivatedState,
    });
    log.debug(`${environment}.${deployment.id} updated`, {
      state: createStatusRes.data.state,
      url: createStatusRes.data.url,
    });
  }

  log.info(`${environment}: ${existing} deployments updated`);
  return deployments;
}

export default deactivateEnvironment;
