import { GitHub } from "@actions/github/lib/utils";

import { DeploymentContext } from "./context";
import deactivateEnvironment from "./deactivate";

/**
 * Delete all deployments within this environment.
 */
async function deleteEnvironment(
  github: InstanceType<typeof GitHub>,
  context: DeploymentContext
) {
  const {
    log,
    owner,
    repo,
    coreArgs: { environment },
  } = context;
  const deployments = await deactivateEnvironment(github, context);

  if (deployments) {
    const existing = deployments.data.length;
    for (let i = 0; i < existing; i++) {
      const deployment = deployments.data[i];
      log.info(
        `${environment}.${deployment.id}: deleting deployment (${deployment.sha})"`
      );
      await github.rest.repos.deleteDeployment({
        owner,
        repo,
        deployment_id: deployment.id,
      });
      log.debug(`${environment}.${deployment.id} deleted`);
    }

    log.info(`${environment}: ${existing} deployments deleted`);
  }

  log.info(`deleting environment: "${environment}"`);
  try {
    await github.rest.repos.deleteAnEnvironment({
      owner: context.owner,
      repo: context.repo,
      environment_name: environment,
    });
    log.info(`${environment}: environment deleted`);
  } catch (error: any) {
    if ("status" in error && error.status == 404) {
      log.fail(
        `got a 404 deleting ${environment}, check that your PAT has repo scope and that the pat user is an admin`
      );
    } else {
      log.fail(`error while deleting ${environment}: ${error}`);
      log.debug(error);
    }
  }
}

export default deleteEnvironment;
