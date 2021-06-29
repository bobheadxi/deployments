import { getInput, setOutput, error } from "@actions/core";
import { DeploymentContext, getBooleanInput } from "../lib/context";
import deactivateEnvironment from "../lib/deactivate";

export enum Step {
  Start = "start",
  Finish = "finish",
  DeactivateEnv = "deactivate-env",
}

export async function run(step: Step, context: DeploymentContext) {
  const { log, github, coreArgs } = context;

  try {
    switch (step) {
      case Step.Start:
        {
          const args = {
            ...coreArgs,
          };
          log.debug(`'${step}' arguments`, args);

          let deploymentIDInput = getInput("deployment_id");
          let deploymentID = -1;
          if (!deploymentIDInput) {
            log.info(
              `initializing new deployment for ${args.environment} @ ${context.ref}`
            );
            const deployment = await github.rest.repos.createDeployment({
              owner: context.owner,
              repo: context.repo,
              ref: context.ref,
              required_contexts: [],
              environment: args.environment,
              auto_merge: false,
              transient_environment: true,
            });
            if (deployment.status == 201) {
              deploymentID = deployment.data.id;
            } else {
              log.fail("unexpected 202 on deployment creation", {
                response: deployment,
              });
            }
          } else {
            deploymentID = parseInt(deploymentIDInput, 10);
            log.info(
              `initializing deployment ${deploymentID} for ${args.environment} @ ${context.ref}`
            );
          }

          log.info(
            `created deployment ${deploymentID} for ${args.environment} @ ${context.ref}`
          );
          setOutput("deployment_id", deploymentID);
          setOutput("env", args.environment);

          await github.rest.repos.createDeploymentStatus({
            owner: context.owner,
            repo: context.repo,
            deployment_id: deploymentID,
            state: "in_progress",
            log_url: args.logsURL,
            description: args.description,
            ref: context.ref,
          });

          log.info('deployment status set to "in_progress"');
        }
        break;

      case Step.Finish:
        {
          const args = {
            ...coreArgs,
            deploymentID: getInput("deployment_id", { required: true }),
            envURL: getInput("env_url", { required: false }),
            status: getInput("status", { required: true }).toLowerCase(),
            override: getBooleanInput("override", true),
          };
          log.debug(`'${step}' arguments`, args);

          if (
            args.status !== "success" &&
            args.status !== "failure" &&
            args.status !== "cancelled"
          ) {
            error(`unexpected status ${args.status}`);
            return;
          }
          log.info(
            `finishing deployment for ${args.deploymentID} with status ${args.status}`
          );

          if (args.override) {
            await deactivateEnvironment(context, args.environment);
          }

          // Set cancelled jobs to inactive environment
          const newStatus =
            args.status === "cancelled" ? "inactive" : args.status;
          await github.rest.repos.createDeploymentStatus({
            owner: context.owner,
            repo: context.repo,
            deployment_id: parseInt(args.deploymentID, 10),
            state: newStatus,
            description: args.description,
            ref: context.ref,

            // only set environment_url if deployment worked
            environment_url: newStatus === "success" ? args.envURL : "",
            // set log_url to action by default
            log_url: args.logsURL,
          });

          log.info(`${args.deploymentID} status set to ${newStatus}`);
        }
        break;

      case Step.DeactivateEnv:
        {
          const args = {
            ...coreArgs,
          };
          log.debug(`'${step}' arguments`, args);

          await deactivateEnvironment(context, args.environment);
        }
        break;

      default:
        log.fail(`unknown step type ${step}`);
    }
  } catch (error) {
    log.fail(`unexpected error encountered: ${error.message}`);
  }
}
