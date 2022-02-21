import { getOctokit } from "@actions/github";

import { collectDeploymentContext } from "./lib/context";
import { getRequiredInput } from "./lib/input";

import { run, Step } from "./steps/steps";

const context = collectDeploymentContext();
console.log(`targeting ${context.owner}/${context.repo}`);

const token = getRequiredInput("token");
const github = getOctokit(token, {
  previews: ["ant-man-preview", "flash-preview"],
});

const step = getRequiredInput("step") as Step;
run(step, github, context);
