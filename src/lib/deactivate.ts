import { DeploymentContext } from "./context";

/**
 * Mark all deployments within this environment as `inactive`.
 */
async function deactivateEnvironment(
  { log, github: client, owner, repo }: DeploymentContext,
  environment: string
) {
  const deployments = await client.rest.repos.listDeployments({
    owner,
    repo,
    environment,
  });
  const existing = deployments.data.length;
  if (existing < 1) {
    console.info(`found no existing deployments for env ${environment}`);
    return;
  }

  const deadState = "inactive";
  log.info(
    `found ${existing} existing deployments for env "${environment}" - marking all as "${deadState}"`
  );
  for (let i = 0; i < existing; i++) {
    const deployment = deployments.data[i];

    log.info(
      `setting deployment '${environment}.${deployment.id}' (${deployment.sha}) state to "${deadState}"`
    );
    await client.rest.repos.createDeploymentStatus({
      owner,
      repo,
      deployment_id: deployment.id,
      state: deadState,
    });
  }

  log.info(`${existing} deployments updated`);
}

export default deactivateEnvironment;
