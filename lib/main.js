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
exports.run = void 0;
const core_1 = __importDefault(require("@actions/core"));
const github_1 = __importDefault(require("@actions/github"));
const deactivate_1 = __importDefault(require("./deactivate"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { repo, ref, sha } = github_1.default.context;
            const token = core_1.default.getInput("token", { required: true });
            const step = core_1.default.getInput("step", { required: true });
            const autoInactive = core_1.default.getInput("auto_inactive") !== "false";
            const logsURL = core_1.default.getInput("logs");
            const description = core_1.default.getInput("desc");
            const client = github_1.default.getOctokit(token);
            switch (step) {
                case "start":
                    {
                        const environment = core_1.default.getInput("env", { required: true });
                        const noOverride = core_1.default.getInput("no_override") !== "false";
                        const transient = core_1.default.getInput("transient") === "true";
                        const gitRef = core_1.default.getInput("ref") || ref;
                        let deploymentID = core_1.default.getInput("deployment_id");
                        console.log(`initializing deployment ${deploymentID} for ${environment} @ ${gitRef}`);
                        // mark existing deployments of this environment as inactive
                        if (!noOverride) {
                            console.log(`Deactivating pervious environments`);
                            yield deactivate_1.default(client, repo, environment);
                        }
                        console.log("After Deactivate previous");
                        let response;
                        if (!deploymentID) {
                            console.log(`The deployment id is ${deploymentID}`);
                            const deployment = yield client.repos.createDeployment(Object.assign(Object.assign({}, repo), { ref: gitRef, required_contexts: [], environment, auto_merge: false, transient_environment: transient }));
                            console.log(JSON.stringify(deployment));
                            deploymentID = deployment.data["id"].toString();
                            response = deployment.data;
                        }
                        console.log("response", response);
                        console.log(`created deployment ${deploymentID} for ${environment} @ ${gitRef}`);
                        core_1.default.setOutput("deployment_id", deploymentID);
                        core_1.default.setOutput("env", environment);
                        yield client.repos.createDeploymentStatus(Object.assign(Object.assign({}, repo), { deployment_id: parseInt(deploymentID, 10), state: "in_progress", auto_inactive: autoInactive, log_url: logsURL ||
                                `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}/checks`, description }));
                        console.log('deployment status set to "in_progress"');
                    }
                    break;
                case "finish":
                    {
                        const deploymentID = core_1.default.getInput("deployment_id", {
                            required: true,
                        });
                        const envURL = core_1.default.getInput("env_url", { required: false });
                        const status = core_1.default
                            .getInput("status", { required: true })
                            .toLowerCase();
                        if (status !== "success" &&
                            status !== "failure" &&
                            status !== "cancelled") {
                            core_1.default.error(`unexpected status ${status}`);
                            return;
                        }
                        console.log(`finishing deployment for ${deploymentID} with status ${status}`);
                        const newStatus = status === "cancelled" ? "inactive" : status;
                        yield client.repos.createDeploymentStatus(Object.assign(Object.assign({}, repo), { deployment_id: parseInt(deploymentID, 10), state: newStatus, auto_inactive: autoInactive, description, 
                            // only set environment_url if deployment worked
                            environment_url: newStatus === "success" ? envURL : "", 
                            // set log_url to action by default
                            log_url: logsURL ||
                                `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}/checks` }));
                        console.log(`${deploymentID} status set to ${newStatus}`);
                    }
                    break;
                case "deactivate-env":
                    {
                        const environment = core_1.default.getInput("env", { required: true });
                        yield deactivate_1.default(client, repo, environment);
                    }
                    break;
                default:
                    core_1.default.setFailed(`unknown step type ${step}`);
            }
        }
        catch (error) {
            core_1.default.setFailed(`unexpected error encounterd: ${error.message}`);
        }
    });
}
exports.run = run;
run();
