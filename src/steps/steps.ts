import { getInput, setOutput, error, setFailed } from "@actions/core";
import { DeploymentContext } from "../lib/context";
import deactivateEnvironment from "../lib/deactivate";

export enum Step {
  Start = "start",
  Finish = "finish",
  DeactivateEnv = "deactivate-env",
}

export async function run(step: Step, context: DeploymentContext) {
  const { github } = context;
  try {
    switch (step) {
      case Step.Start:
        {
          const args = {
            ...context.coreArgs,
            environment: getInput("env", { required: true }),
            noOverride: getInput("no_override") !== "false",
            transient: getInput("transient") === "true",
            gitRef: getInput("ref") || context.ref,
          };
          if (args.logArgs) {
            console.log(`'${step}' arguments`, args);
          }

          let deploymentID = getInput("deployment_id");
          console.log(
            `initializing deployment ${deploymentID} for ${args.environment} @ ${args.gitRef}`
          );

          // mark existing deployments of this environment as inactive
          if (!args.noOverride) {
            await deactivateEnvironment(context, args.environment);
          }

          if (!deploymentID) {
            const deployment = await github.rest.repos.createDeployment({
              owner: context.owner,
              repo: context.repo,
              ref: args.gitRef,
              required_contexts: [],
              environment: args.environment,
              description: args.description,
              auto_merge: false,
              transient_environment: args.transient,
            });
            // TODO: why does typecheck fail on `data.id`?
            deploymentID = (deployment.data as any).id.toString();
          }

          console.log(
            `created deployment ${deploymentID} for ${args.environment} @ ${args.gitRef}`
          );
          setOutput("deployment_id", deploymentID);
          setOutput("env", args.environment);

          await github.rest.repos.createDeploymentStatus({
            owner: context.owner,
            repo: context.repo,
            deployment_id: parseInt(deploymentID, 10),
            state: "in_progress",
            auto_inactive: args.autoInactive,
            log_url: args.logsURL,
            description: args.description,
          });

          console.log('deployment status set to "in_progress"');
        }
        break;

      case Step.Finish:
        {
          const args = {
            ...context.coreArgs,
            deploymentID: getInput("deployment_id", { required: true }),
            envURL: getInput("env_url", { required: false }),
            status: getInput("status", { required: true }).toLowerCase(),
          };
          if (args.logArgs) {
            console.log(`'${step}' arguments`, args);
          }

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
          console.log(
            `finishing deployment for ${args.deploymentID} with status ${args.status}`
          );

          const newStatus =
            args.status === "cancelled" ? "inactive" : args.status;
          await github.rest.repos.createDeploymentStatus({
            owner: context.owner,
            repo: context.repo,
            deployment_id: parseInt(args.deploymentID, 10),
            state: newStatus,
            auto_inactive: args.autoInactive,
            description: args.description,

            // only set environment_url if deployment worked
            environment_url: newStatus === "success" ? args.envURL : "",
            // set log_url to action by default
            log_url: args.logsURL,
          });

          console.log(`${args.deploymentID} status set to ${newStatus}`);
        }
        break;

      case Step.DeactivateEnv:
        {
          const args = {
            ...context.coreArgs,
            environment: getInput("env", { required: true }),
          };
          if (args.logArgs) {
            console.log(`'${step}' arguments`, args);
          }

          await deactivateEnvironment(context, args.environment);
        }
        break;

      default:
        setFailed(`unknown step type ${step}`);
    }
  } catch (error) {
    setFailed(`unexpected error encountered: ${error}`);
  }
}
