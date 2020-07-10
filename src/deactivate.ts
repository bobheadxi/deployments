async function deactivateEnvironment(
  client: any,
  repo: {
    owner: string;
    repo: string;
  },
  environment: string
): Promise<void> {
  const deployments = await client.repos.listDeployments({
    repo: repo.repo,
    owner: repo.owner,
    environment,
  });
  const existing = deployments.data.length;
  if (existing < 1) {
    console.log(`found no existing deployments for env ${environment}`);
    return;
  }

  const deadState = "inactive";
  console.log(
    `found ${existing} existing deployments for env ${environment} - marking as ${deadState}`
  );
  for (let i = 0; i < existing; i++) {
    const deployment = deployments.data[i];

    console.log(
      `setting deployment '${environment}.${deployment.id}' (${deployment.sha}) state to "${deadState}"`
    );
    await client.repos.createDeploymentStatus({
      ...repo,
      deployment_id: deployment.id,
      state: deadState,
    });
  }

  console.log(`${existing} deployments updated`);
}

export default deactivateEnvironment;
