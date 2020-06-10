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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
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
            const token = core.getInput('token', { required: true });
            const step = core.getInput('step', { required: true });
            const autoInactive = core.getInput('auto_inactive') !== 'false';
            const logsURL = core.getInput('logs');
            const description = core.getInput('desc');
            const client = new github.GitHub(token, {
                previews: ['ant-man-preview', 'flash-preview'],
            });
            switch (step) {
                case 'start':
                    {
                        const environment = core.getInput('env', { required: true });
                        const noOverride = core.getInput('no_override') !== 'false';
                        const transient = core.getInput('transient') === 'true';
                        const gitRef = core.getInput('ref') || ref;
                        let deploymentID = core.getInput('deployment_id');
                        console.log(`initializing deployment ${deploymentID} for ${environment} @ ${gitRef}`);
                        // mark existing deployments of this environment as inactive
                        if (!noOverride) {
                            yield deactivate_1.default(client, repo, environment);
                        }
                        if (!deploymentID) {
                            const deployment = yield client.repos.createDeployment({
                                owner: repo.owner,
                                repo: repo.repo,
                                ref: gitRef,
                                required_contexts: [],
                                environment,
                                auto_merge: false,
                                transient_environment: transient,
                            });
                            deploymentID = deployment.data.id.toString();
                        }
                        console.log(`created deployment ${deploymentID} for ${environment} @ ${gitRef}`);
                        core.setOutput('deployment_id', deploymentID);
                        core.setOutput('env', environment);
                        yield client.repos.createDeploymentStatus(Object.assign(Object.assign({}, repo), { deployment_id: parseInt(deploymentID, 10), state: 'in_progress', auto_inactive: autoInactive, log_url: logsURL || `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}/checks`, description }));
                        console.log('deployment status set to "in_progress"');
                    }
                    break;
                case 'finish':
                    {
                        const deploymentID = core.getInput('deployment_id', { required: true });
                        const envURL = core.getInput('env_url', { required: false });
                        const status = core.getInput('status', { required: true }).toLowerCase();
                        if (status !== 'success' && status !== 'failure' && status !== 'cancelled') {
                            core.error(`unexpected status ${status}`);
                            return;
                        }
                        console.log(`finishing deployment for ${deploymentID} with status ${status}`);
                        const newStatus = (status === 'cancelled') ? 'inactive' : status;
                        yield client.repos.createDeploymentStatus(Object.assign(Object.assign({}, repo), { deployment_id: parseInt(deploymentID, 10), state: newStatus, auto_inactive: autoInactive, description, 
                            // only set environment_url if deployment worked
                            environment_url: (newStatus === 'success') ? envURL : '', 
                            // set log_url to action by default
                            log_url: logsURL || `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}/checks` }));
                        console.log(`${deploymentID} status set to ${newStatus}`);
                    }
                    break;
                case 'deactivate-env':
                    {
                        const environment = core.getInput('env', { required: true });
                        yield deactivate_1.default(client, repo, environment);
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
