"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const deactivate_1 = __importDefault(require("./deactivate"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { repo, ref, sha } = github.context;
            const step = core.getInput("step", { required: true });
            const coreArgs = {
                autoInactive: core.getInput("auto_inactive") !== "false",
                logsURL: core.getInput("logs") ||
                    `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}/checks`,
                description: core.getInput("desc"),
                logArgs: core.getInput("log_args") === "true",
            };
            const client = new github.GitHub(core.getInput("token", { required: true }), {
                previews: ["ant-man-preview", "flash-preview"],
            });
            switch (step) {
                case "start":
                    {
                        const args = Object.assign(Object.assign({}, coreArgs), { environment: core.getInput("env", { required: true }), noOverride: core.getInput("no_override") !== "false", transient: core.getInput("transient") === "true", gitRef: core.getInput("ref") || ref });
                        if (args.logArgs) {
                            console.log(`'${step}' arguments`, args);
                        }
                        let deploymentID = core.getInput("deployment_id");
                        console.log(`initializing deployment ${deploymentID} for ${args.environment} @ ${args.gitRef}`);
                        // mark existing deployments of this environment as inactive
                        if (!args.noOverride) {
                            yield deactivate_1.default(client, repo, args.environment);
                        }
                        if (!deploymentID) {
                            const deployment = yield client.repos.createDeployment({
                                owner: repo.owner,
                                repo: repo.repo,
                                ref: args.gitRef,
                                required_contexts: [],
                                environment: args.environment,
                                auto_merge: false,
                                transient_environment: args.transient,
                            });
                            deploymentID = deployment.data.id.toString();
                        }
                        console.log(`created deployment ${deploymentID} for ${args.environment} @ ${args.gitRef}`);
                        core.setOutput("deployment_id", deploymentID);
                        core.setOutput("env", args.environment);
                        yield client.repos.createDeploymentStatus(Object.assign(Object.assign({}, repo), { deployment_id: parseInt(deploymentID, 10), state: "in_progress", auto_inactive: coreArgs.autoInactive, log_url: coreArgs.logsURL, description: coreArgs.description }));
                        console.log('deployment status set to "in_progress"');
                    }
                    break;
                case "finish":
                    {
                        const args = Object.assign(Object.assign({}, coreArgs), { deploymentID: core.getInput("deployment_id", { required: true }), envURL: core.getInput("env_url", { required: false }), status: core.getInput("status", { required: true }).toLowerCase() });
                        if (args.logArgs) {
                            console.log(`'${step}' arguments`, args);
                        }
                        if (args.status !== "success" &&
                            args.status !== "failure" &&
                            args.status !== "cancelled") {
                            core.error(`unexpected status ${args.status}`);
                            return;
                        }
                        console.log(`finishing deployment for ${args.deploymentID} with status ${args.status}`);
                        const newStatus = args.status === "cancelled" ? "inactive" : args.status;
                        yield client.repos.createDeploymentStatus(Object.assign(Object.assign({}, repo), { deployment_id: parseInt(args.deploymentID, 10), state: newStatus, auto_inactive: args.autoInactive, description: args.description, 
                            // only set environment_url if deployment worked
                            environment_url: newStatus === "success" ? args.envURL : "", 
                            // set log_url to action by default
                            log_url: args.logsURL }));
                        console.log(`${args.deploymentID} status set to ${newStatus}`);
                    }
                    break;
                case "deactivate-env":
                    {
                        const args = Object.assign(Object.assign({}, coreArgs), { environment: core.getInput("env", { required: true }) });
                        if (args.logArgs) {
                            console.log(`'${step}' arguments`, args);
                        }
                        yield deactivate_1.default(client, repo, args.environment);
                    }
                    break;
                default:
                    core.setFailed(`unknown step type ${step}`);
            }
        }
        catch (error) {
            core.setFailed(`unexpected error encounterd: ${error.message}`);
        }
    });
}
run();
