import { setOutput, error } from "@actions/core";
import { GitHub } from "@actions/github/lib/utils";

import { DeploymentContext } from "../lib/context";
import deactivateEnvironment from "../lib/deactivate";
import {
  getBooleanInput,
  getOptionalInput,
  getRequiredInput,
} from "../lib/input";

import createStart, { StartArgs } from "./start";
import createFinish, { FinishArgs } from "./finish";

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
          const stepArgs: StartArgs = {
            deploymentID: getOptionalInput("deployment_id"),
            override: getBooleanInput("override", false), // default to false on start
          };
          log.debug(`'${step}' arguments`, {
            stepArgs,
            coreArgs,
          });
          const { deploymentID, statusID } = await createStart(
            github,
            context,
            stepArgs
          );
          setOutput("deployment_id", deploymentID);
          setOutput("status_id", statusID);
          // set for ease of reference
          setOutput("env", coreArgs.environment);
        }
        break;

      case Step.Finish:
        {
          const stepArgs: FinishArgs = {
            status: getRequiredInput("status").toLowerCase(),
            deploymentID: getRequiredInput("deployment_id"),
            envURL: getOptionalInput("env_url"),
            override: getBooleanInput("override", true), // default to true on finish
            autoInactive: getBooleanInput("auto_inactive", false),
          };
          log.debug(`'${step}' arguments`, {
            stepArgs,
            coreArgs,
          });
          const { statusID } = (await createFinish(
            github,
            context,
            stepArgs
          )) || { statusID: -1 };
          setOutput("status_id", statusID);
        }
        break;

      case Step.DeactivateEnv:
        {
          log.debug(`'${step}' arguments`, { coreArgs });

          await deactivateEnvironment(github, context);
        }
        break;

      case Step.DeleteEnv:
        {
          log.debug(`'${step}' arguments`, { coreArgs });

          await github.rest.repos.deleteAnEnvironment({
            owner: context.owner,
            repo: context.repo,
            environment_name: coreArgs.environment,
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
