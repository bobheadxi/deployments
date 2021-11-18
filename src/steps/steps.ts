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
            numberEnvironment: getInput("num_environment", { required: true }),
            noOverride: getInput("no_override") !== "false",
            transient: getInput("transient") === "true",
            gitRef: getInput("ref") || context.ref,
          };

          const numEnvironment = parseInt(args.numberEnvironment);

          if (args.logArgs) {
            console.log(`'${step}' arguments`, args);
            console.log("Number of environment", numEnvironment);
          }

          const promises: any = [];
          const deactivatePromises: any = [];
          for (let i = 0; i < numEnvironment; i++) {
            if (!args.noOverride) {
              deactivatePromises.push(
                deactivateEnvironment(
                  context,
                  numEnvironment > 1
                    ? `${args.environment}-${i + 1}`
                    : args.environment
                )
              );
            }
            promises.push(
              github.rest.repos.createDeployment({
                owner: context.owner,
                repo: context.repo,
                ref: args.gitRef,
                required_contexts: [],
                environment:
                  numEnvironment > 1
                    ? `${args.environment}-${i + 1}`
                    : args.environment,
                auto_merge: false,
                transient_environment: args.transient,
              })
            );
          }

          let deploymentIDs: any = [];

          try {
            await Promise.all(deactivatePromises);
            deploymentIDs = await Promise.all(promises);
          } catch {
            error("Cannot generate deployments");
          }

          if (args.logArgs) {
            console.log("Deployment ID");
            console.log(deploymentIDs);
          }

          const secondPromises: any = [];

          deploymentIDs.map((deploymentID: any) => {
            secondPromises.push(
              github.rest.repos.createDeploymentStatus({
                owner: context.owner,
                repo: context.repo,
                deployment_id: parseInt(deploymentID.data.id, 10),
                state: "in_progress",
                auto_inactive: args.autoInactive,
                log_url: args.logsURL,
                description: args.description,
              })
            );
          });

          try {
            await Promise.all(secondPromises);
            setOutput("deployment_ids", JSON.stringify(deploymentIDs));
            if (numEnvironment === 1) {
              setOutput("deployment_id", deploymentIDs[0].data.id);
            }
            setOutput("env", args.environment);
          } catch (e) {
            error("Cannot generate deployment status");
          }
        }
        break;

      case Step.Finish:
        {
          const args = {
            ...context.coreArgs,
            transient: getInput("transient") === "true",
            gitRef: getInput("ref") || context.ref,
            status: getInput("status", { required: true }).toLowerCase(),
            deploymentIDs: getInput("deployment_ids", { required: true }),
            envURLs: getInput("env_urls", { required: false }),
            multi: getInput("multi", { required: false }) === "true",
            deploymentID: getInput("deployment_id", { required: true }),
            envURL: getInput("env_url", { required: false }),
          };

          if (args.logArgs) {
            console.log(`'${step}' arguments`, args);
            console.log("Deployment ID");
            console.log(args.deploymentIDs);
            console.log("Env urls");
            console.log(args.envURLs);
          }

          if (
            args.status !== "success" &&
            args.status !== "failure" &&
            args.status !== "cancelled"
          ) {
            error(`unexpected status ${args.status}`);
            return;
          }
          console.log(
            `finishing deployment for ${args.deploymentID} with status ${args.status}`
          );

          const newStatus =
            args.status === "cancelled" ? "inactive" : args.status;

          if (!args.multi) {
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
            return;
          }

          const urlArray = JSON.parse(args.envURLs);

          const deploymentIDs = JSON.parse(args.deploymentIDs);

          const promises: any = [];

          deploymentIDs.map((deploymentID: any, index: number) => {
            promises.push(
              github.rest.repos.createDeploymentStatus({
                owner: context.owner,
                repo: context.repo,
                deployment_id: parseInt(deploymentID.data.id, 10),
                auto_inactive: true,
                state: "success",
                description: `Deployment URL: ${urlArray[index]}`,
                environment_url: `${urlArray[index]}`,
                log_url: args.logsURL,
              })
            );
          });

          try {
            await Promise.all(promises);
          } catch (e) {
            error("Cannot generate deployment status");
          }
        }
        break;

      case Step.DeactivateEnv:
        {
          const args = {
            ...context.coreArgs,
            environment: getInput("env", { required: true }),
            multi: getInput("multi", { required: false }) === "true",
            deploymentIDs: getInput("deployment_ids", { required: false }),
          };
          if (args.logArgs) {
            console.log(`'${step}' arguments`, args);
          }

          if (args.multi) {
            const deploymentIDs = JSON.parse(args.deploymentIDs);
            const promises: any = [];

            deploymentIDs.map((deploymentID: any) => {
              promises.push(
                deactivateEnvironment(context, deploymentID.data.id)
              );
            });

            try {
              await Promise.all(promises);
            } catch (e) {
              error("Cannot deactivate deployment status");
            }
          } else {
            await deactivateEnvironment(context, args.environment);
          }
        }
        break;

      default:
        setFailed(`unknown step type ${step}`);
    }
  } catch (error: any) {
    setFailed(`unexpected error encountered: ${error.message}`);
  }
}
