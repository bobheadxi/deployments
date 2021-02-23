import * as core from "@actions/core";
import * as github from "@actions/github";

import deactivateEnvironment from './deactivate';

async function run() {
  try {
    const { repo, ref, sha } = github.context;
    const step = core.getInput('step', { required: true })
    const coreArgs = {
      autoInactive: core.getInput('auto_inactive') !== 'false',
      logsURL: core.getInput('logs') || `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}/checks`,
      description: core.getInput('desc'),
      logArgs: core.getInput('log_args') === 'true',
    }

    const client = new github.GitHub(core.getInput('token', { required: true }), {
      previews: ['ant-man-preview', 'flash-preview'],
    });
    switch (step) {
    case 'start':
      {
        const args = {
          ...coreArgs,
          environment: core.getInput('env', { required: true }),
          noOverride: core.getInput('no_override') !== 'false',
          transient: core.getInput('transient') === 'true',
          gitRef: core.getInput('ref') || ref,
        }
        if (args.logArgs) {
          console.log(`'${step}' arguments`, args)
        }

        let deploymentID = core.getInput('deployment_id');
        console.log(`initializing deployment ${deploymentID} for ${args.environment} @ ${args.gitRef}`);

        // mark existing deployments of this environment as inactive
        if (!args.noOverride) {
          await deactivateEnvironment(client, repo, args.environment);
        }

        if (!deploymentID) {
          const deployment = await client.repos.createDeployment({
            owner: repo.owner,
            repo: repo.repo,
            ref: args.gitRef,
            required_contexts: [],
            environment: args.environment,
            auto_merge: false,
            transient_environment: args.transient,
          });
          deploymentID = deployment.data.id.toString();
        }

        console.log(`created deployment ${deploymentID} for ${args.environment} @ ${args.gitRef}`);
        core.setOutput('deployment_id', deploymentID);
        core.setOutput('env', args.environment);

        await client.repos.createDeploymentStatus({
          ...repo,
          deployment_id: parseInt(deploymentID, 10),
          state: 'in_progress',
          auto_inactive: coreArgs.autoInactive,
          log_url: coreArgs.logsURL,
          description: coreArgs.description,
        });

        console.log('deployment status set to "in_progress"');
      }
      break;

    case 'finish':
      {
        const args = {
          ...coreArgs,
          deploymentID: core.getInput('deployment_id', { required: true }),
          envURL: core.getInput('env_url', { required: false }),
          status: core.getInput('status', { required: true }).toLowerCase(),
        }
        if (args.logArgs) {
          console.log(`'${step}' arguments`, args)
        }

        if (status !== 'success' && status !== 'failure' && status !== 'cancelled') {
          core.error(`unexpected status ${status}`);
          return;
        }
        console.log(`finishing deployment for ${args.deploymentID} with status ${status}`);

        const newStatus = (status === 'cancelled') ? 'inactive' : status;
        await client.repos.createDeploymentStatus({
          ...repo,
          deployment_id: parseInt(args.deploymentID, 10),
          state: newStatus,
          auto_inactive: args.autoInactive,
          description: args.description,

          // only set environment_url if deployment worked
          environment_url: (newStatus === 'success') ? args.envURL : '',
          // set log_url to action by default
          log_url: args.logsURL,
        });

        console.log(`${args.deploymentID} status set to ${newStatus}`);
      }
      break;

    case 'deactivate-env':
      {
        const args = {
          ...coreArgs,
          environment: core.getInput('env', { required: true }),
        }
        if (args.logArgs) {
          console.log(`'${step}' arguments`, args)
        }

        await deactivateEnvironment(client, repo, args.environment);
      }
      break;

    default:
      core.setFailed(`unknown step type ${step}`);
    }
  } catch (error) {
    core.setFailed(`unexpected error encounterd: ${error.message}`);
  }
}

run();
