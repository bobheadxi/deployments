"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.Step = void 0;
const core_1 = require("@actions/core");
const deactivate_1 = __importDefault(require("../lib/deactivate"));
var Step;
(function (Step) {
    Step["Start"] = "start";
    Step["Finish"] = "finish";
    Step["DeactivateEnv"] = "deactivate-env";
})(Step = exports.Step || (exports.Step = {}));
function run(step, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const { github } = context;
        try {
            switch (step) {
                case Step.Start:
                    {
                        const args = Object.assign(Object.assign({}, context.coreArgs), { environment: core_1.getInput("env", { required: true }), noOverride: core_1.getInput("no_override") !== "false", transient: core_1.getInput("transient") === "true", gitRef: core_1.getInput("ref") || context.ref });
                        if (args.logArgs) {
                            console.log(`'${step}' arguments`, args);
                        }
                        let deploymentID = core_1.getInput("deployment_id");
                        console.log(`initializing deployment ${deploymentID} for ${args.environment} @ ${args.gitRef}`);
                        // mark existing deployments of this environment as inactive
                        if (!args.noOverride) {
                            yield deactivate_1.default(context, args.environment);
                        }
                        if (!deploymentID) {
                            const deployment = yield github.rest.repos.createDeployment({
                                owner: context.owner,
                                repo: context.repo,
                                ref: args.gitRef,
                                required_contexts: [],
                                environment: args.environment,
                                auto_merge: false,
                                transient_environment: args.transient,
                            });
                            // TODO: why does typecheck fail on `data.id`?
                            deploymentID = deployment.data.id.toString();
                        }
                        console.log(`created deployment ${deploymentID} for ${args.environment} @ ${args.gitRef}`);
                        core_1.setOutput("deployment_id", deploymentID);
                        core_1.setOutput("env", args.environment);
                        yield github.rest.repos.createDeploymentStatus({
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
                        const args = Object.assign(Object.assign({}, context.coreArgs), { deploymentID: core_1.getInput("deployment_id", { required: true }), envURL: core_1.getInput("env_url", { required: false }), status: core_1.getInput("status", { required: true }).toLowerCase() });
                        if (args.logArgs) {
                            console.log(`'${step}' arguments`, args);
                        }
                        if (args.status !== "success" &&
                            args.status !== "failure" &&
                            args.status !== "cancelled") {
                            core_1.error(`unexpected status ${args.status}`);
                            return;
                        }
                        console.log(`finishing deployment for ${args.deploymentID} with status ${args.status}`);
                        const newStatus = args.status === "cancelled" ? "inactive" : args.status;
                        yield github.rest.repos.createDeploymentStatus({
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
                        const args = Object.assign(Object.assign({}, context.coreArgs), { environment: core_1.getInput("env", { required: true }) });
                        if (args.logArgs) {
                            console.log(`'${step}' arguments`, args);
                        }
                        yield deactivate_1.default(context, args.environment);
                    }
                    break;
                default:
                    core_1.setFailed(`unknown step type ${step}`);
            }
        }
        catch (error) {
            core_1.setFailed(`unexpected error encountered: ${error.message}`);
        }
    });
}
exports.run = run;
