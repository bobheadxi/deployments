import { setOutput, error } from "@actions/core";
import { GitHub } from "@actions/github/lib/utils";

import { DeploymentContext } from "../lib/context";
import deactivateEnvironment from "../lib/deactivate";
import {
  getBooleanInput,
  getOptionalInput,
  getRequiredInput,
} from "../lib/input";

export enum Step {
  Start = "start",
  Finish = "finish",
  DeactivateEnv = "deactivate-env",
  DeleteEnv = "delete-env",
}

export async function run(
  step: Step,
  github: InstanceType<typeof GitHub>,
  context: DeploymentContext
) {
  const { log, coreArgs } = context;

  try {
    switch (step) {
      case Step.Start:
        {
          const args = {
            ...coreArgs,
          };
          log.debug(`'${step}' arguments`, args);

          let deploymentIDInput = getOptionalInput("deployment_id");
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
              description: args.description,
              auto_merge: false,
              transient_environment: true,
            });
            if (deployment.status == 201) {
              deploymentID = deployment.data.id;
            } else {
              log.fail(
                `unexpected ${deployment.status} on deployment creation`,
                {
                  response: deployment,
                }
              );
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
            deploymentID: getRequiredInput("deployment_id"),
            envURL: getOptionalInput("env_url"),
            status: getRequiredInput("status").toLowerCase(),
            override: getBooleanInput("override", true),
          };
          log.debug(`'${step}' arguments`, args);

          if (
            args.status !== "success" &&
            args.status !== "failure" &&
            args.status !== "cancelled" &&
            args.status !== "error" &&
            args.status !== "inactive" &&
            args.status !== "in_progress" &&
            args.status !== "queued" &&
            args.status !== "pending"
          ) {
            error(`unexpected status ${args.status}`);
            return;
          }
          log.info(
            `finishing deployment for ${args.deploymentID} with status ${args.status}`
          );

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
            // if we are overriding previous deployments, let GitHub deactivate past
            // deployments for us as a fallback
            auto_inactive: args.override,
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

          await deactivateEnvironment(github, context, args.environment);
        }
        break;

      case Step.DeleteEnv:
        {
          const args = {
            ...coreArgs,
          };
          log.debug(`'${step}' arguments`, args);

          await github.rest.repos.deleteAnEnvironment({
            owner: context.owner,
            repo: context.repo,
            environment_name: args.environment,
          });
        }
        break;

      default:
        log.fail(`unknown step type ${step}`);
    }
  } catch (error) {
    log.fail(`unexpected error encountered: ${error}`);
  }
}
