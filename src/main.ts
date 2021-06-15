import * as core from "@actions/core";
import { collectDeploymentContext } from "./lib/context";
import { run, Step } from "./steps/steps";

const context = collectDeploymentContext();
console.log(`targeting ${context.owner}/${context.repo}`);

const step = core.getInput("step", { required: true }) as Step;
run(step, context);
