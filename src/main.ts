import * as core from "@actions/core";
import * as github from "@actions/github";

async function run() {
  try {
    const { repo, ref, sha } = github.context;

    const token = core.getInput('token', { required: true });
    const step = core.getInput('step', { required: true });
    const logsURL = core.getInput('logs', { required: false });
    const description = core.getInput('desc', { required: true });

    const client = new github.GitHub(token);
    switch (step) {
    case 'start':
      {
        const environment = core.getInput('env', { required: true });
        const transient = core.getInput('desc', { required: false }) === 'true';

        const deployment = await client.repos.createDeployment({
          owner: repo.owner,
          repo: repo.repo,
          ref: ref,
          required_contexts: [],
          environment,
          auto_merge: false,
          transient_environment: transient,
        });

        const deploymentID = deployment.data.id.toString();
        core.debug(`created deployment ${deploymentID}`);
        core.setOutput('deployment_id', deploymentID);
    
        await client.repos.createDeploymentStatus({
          ...repo,
          deployment_id: deployment.data.id,
          state: 'in_progress',
          log_url: logsURL || `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}/checks`,
          description,
        });

        core.debug('deployment status set to "in_progress"');
      }
    case 'finish':
      {
        const deploymentID = core.getInput('deployment_id', { required: true });
        const envURL = core.getInput('env_url', { required: true });
        const status = core.getInput('status', { required: true });
        if (status !== 'success' && status !== 'failure' && status !== 'cancelled') {
          core.error(`unexpected status ${status}`);
          return;
        }

        const newStatus = status === 'cancelled' ? 'inactive' : status;
        await client.repos.createDeploymentStatus({
          ...repo,
          deployment_id: parseInt(deploymentID, 10),
          state: newStatus,
          log_url: logsURL || `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}/checks`,
          environment_url: envURL,
          description,
        });

        core.debug(`${deploymentID} status set to ${newStatus}`);
      }
    default:
      core.setFailed(`unknown step type ${step}`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
