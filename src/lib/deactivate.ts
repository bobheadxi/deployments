import { GitHub } from "@actions/github/lib/utils";

import { DeploymentContext } from "./context";

/**
 * Mark all deployments within this environment as `inactive`.
 */
async function deactivateEnvironment(
  github: InstanceType<typeof GitHub>,
  { log, owner, repo }: DeploymentContext,
  environment: string
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
    const res = await github.rest.repos.createDeploymentStatus({
      owner,
      repo,
      deployment_id: deployment.id,
      state: deactivatedState,
    });
    log.debug(`${environment}.${deployment.id} updated`, {
      state: res.data.state,
      url: res.data.url,
    });
  }

  log.info(`${environment}: ${existing} deployments updated`);
}

export default deactivateEnvironment;
