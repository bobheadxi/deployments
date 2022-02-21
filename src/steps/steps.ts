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

          const environments = args.environment.split(",");

          const createDeployments: Array<Promise<any>> = [];
          const deactivateDeployments: Array<Promise<any>> = [];
          for (let i = 0; i < environments.length; i++) {
            if (!args.noOverride) {
              deactivateDeployments.push(
                deactivateEnvironment(context, environments[i])
              );
            }
            createDeployments.push(
              github.rest.repos.createDeployment({
                owner: context.owner,
                repo: context.repo,
                ref: args.gitRef,
                required_contexts: [],
                environment: environments[i],
                auto_merge: false,
                transient_environment: args.transient,
                description: args.description,
              })
            );
          }

          let deploymentsData: Array<{ data: { id: string; url: string } }> =
            [];
          if (deactivateDeployments.length > 0) {
            try {
              await Promise.all(deactivateDeployments);
              deploymentsData = await Promise.all(createDeployments);
            } catch {
              error("Cannot generate deployments");
            }
          }

          if (args.logArgs) {
            console.log("Deployments data");
            console.log(deploymentsData);
          }

          const createStatues = deploymentsData.map((deployment) =>
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

          try {
            await Promise.all(createStatues);
            setOutput(
              "deployments",
              JSON.stringify(
                deploymentsData.map((deployment, index) => ({
                  id: deployment.data.id,
                  url: environments[index],
                }))
              )
            );
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
            status: getInput("status", { required: true }).toLowerCase(),
            deployment: getInput("deployment_id", { required: true }),
            envURL: getInput("env_url", { required: false }),
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

          if (args.logArgs) {
            console.log(
              `finishing deployment for ${args.deployment} with status ${args.status}`
            );
          }

          const newStatus =
            args.status === "cancelled" ? "inactive" : args.status;

          const deployments: Array<{ id: string; url: string }> = JSON.parse(
            args.deployment
          );

          const promises = deployments.map((deployment) =>
            github.rest.repos.createDeploymentStatus({
              owner: context.owner,
              repo: context.repo,
              deployment_id: parseInt(deployment.id, 10),
              auto_inactive: args.autoInactive,
              state: newStatus,
              description: args.description,
              environment_url: args.envURL || deployment.url,
              log_url: args.logsURL,
            })
          );

          try {
            if (args.logArgs) {
              console.log(`finishing deployment with status ${args.status}`);
            }
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
            environment: getInput("env", { required: false }),
          };

          if (args.logArgs) {
            console.log(`'${step}' arguments`, args);
          }

          let environments;

          const isMulti = args.environment.split(",").length > 1;

          if (isMulti) {
            environments = JSON.parse(args.environment);
          } else {
            environments = [args.environment];
          }

          const promises: any = [];

          environments.map((env: any) => {
            promises.push(deactivateEnvironment(context, env));
          });

          try {
            await Promise.all(promises);
          } catch (e) {
            error("Cannot deactivate deployment status");
          }
        }
        break;

      default:
        setFailed(`unknown step type ${step}`);
    }
  } catch (error) {
    setFailed(`unexpected error encountered: ${error}`);
  }
}
