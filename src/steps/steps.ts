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
            environment: getInput("env", { required: false }),
            environments: getInput("envs", { required: false }),
            noOverride: getInput("no_override") !== "false",
            transient: getInput("transient") === "true",
            gitRef: getInput("ref") || context.ref,
          };

          if (args.logArgs) {
            console.log(`'${step}' arguments`, args);
          }

          const isMulti = args.environments && args.environments.length > 1;

          const environments = JSON.parse(args.environments);

          const promises: any = [];
          const deactivatePromises: any = [];
          for (let i = 0; i < environments.length; i++) {
            if (!args.noOverride) {
              deactivatePromises.push(
                deactivateEnvironment(
                  context,
                  isMulti ? environments[i] : args.environment
                )
              );
            }
            promises.push(
              github.rest.repos.createDeployment({
                owner: context.owner,
                repo: context.repo,
                ref: args.gitRef,
                required_contexts: [],
                environment: isMulti ? environments[i] : args.environment,
                auto_merge: false,
                transient_environment: args.transient,
              })
            );
          }

          let deploymentsData: any = [];

          try {
            await Promise.all(deactivatePromises);
            deploymentsData = await Promise.all(promises);
          } catch {
            error("Cannot generate deployments");
          }

          if (args.logArgs) {
            console.log("Deployments data");
            console.log(deploymentsData);
          }

          const secondPromises: any = [];

          deploymentsData.map((deployment: any) => {
            secondPromises.push(
              github.rest.repos.createDeploymentStatus({
                owner: context.owner,
                repo: context.repo,
                deployment_id: parseInt(deployment.data.id, 10),
                state: "in_progress",
                auto_inactive: args.autoInactive,
                log_url: args.logsURL,
                description: args.description,
              })
            );
          });

          try {
            await Promise.all(secondPromises);
            if (!isMulti) {
              setOutput("deployment_id", deploymentsData[0].data.id);
            } else {
              setOutput(
                "deployments",
                JSON.stringify(
                  deploymentsData.map((deployment: any, index: number) => ({
                    ...deployment,
                    url: environments[index],
                  }))
                )
              );
              setOutput("envs", args.environments);
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
            deployments: getInput("deployments", { required: true }),
            deploymentID: getInput("deployment_id", { required: false }),
            envURL: getInput("env_url", { required: false }),
          };

          if (args.logArgs) {
            console.log(`'${step}' arguments`, args);
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

          const isMulti = args.deployments && args.deployments.length > 1;

          if (!isMulti) {
            console.log(
              `finishing deployment for ${args.deploymentID} with status ${args.status}`
            );
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

          const deployments = JSON.parse(args.deployments);

          const promises: any = [];

          deployments.map((deployment: any) => {
            promises.push(
              github.rest.repos.createDeploymentStatus({
                owner: context.owner,
                repo: context.repo,
                deployment_id: parseInt(deployment.data.id, 10),
                auto_inactive: true,
                state: newStatus,
                description: `Deployment URL: ${deployment.url}`,
                environment_url:
                  newStatus === "success" ? `${deployment.url}` : "",
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
            deployments: getInput("deployments", { required: false }),
          };

          if (args.logArgs) {
            console.log(`'${step}' arguments`, args);
          }

          const isMulti = args.deployments && args.deployments.length > 1;

          if (isMulti) {
            const deployments = JSON.parse(args.deployments);
            const promises: any = [];

            deployments.map((deployment: any) => {
              promises.push(deactivateEnvironment(context, deployment.data.id));
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
