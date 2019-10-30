"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { repo, ref, sha } = github.context;
            const token = core.getInput('token', { required: true });
            const step = core.getInput('step', { required: true });
            const logsURL = core.getInput('logs');
            const description = core.getInput('desc');
            const client = new github.GitHub(token, {
                previews: ['ant-man-preview', 'flash-preview'],
            });
            switch (step) {
                case 'start':
                    {
                        const environment = core.getInput('env', { required: true });
                        const transient = core.getInput('transient', { required: false }) === 'true';
                        console.log(`initializing deployment for ${environment}`);
                        const deployment = yield client.repos.createDeployment({
                            owner: repo.owner,
                            repo: repo.repo,
                            ref: ref,
                            required_contexts: [],
                            environment,
                            auto_merge: false,
                            transient_environment: transient,
                        });
                        const deploymentID = deployment.data.id.toString();
                        console.log(`created deployment ${deploymentID} for env ${environment}`);
                        core.setOutput('deployment_id', deploymentID);
                        core.setOutput('env', environment);
                        yield client.repos.createDeploymentStatus(Object.assign({}, repo, { deployment_id: deployment.data.id, state: 'in_progress', log_url: logsURL || `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}/checks`, description }));
                        console.log('deployment status set to "in_progress"');
                    }
                    break;
                case 'finish':
                    {
                        const deploymentID = core.getInput('deployment_id', { required: true });
                        const envURL = core.getInput('env_url', { required: true });
                        const status = core.getInput('status', { required: true }).toLowerCase();
                        if (status !== 'success' && status !== 'failure' && status !== 'cancelled') {
                            core.error(`unexpected status ${status}`);
                            return;
                        }
                        console.log(`finishing deployment for ${deploymentID} with status ${status}`);
                        const newStatus = status === 'cancelled' ? 'inactive' : status;
                        yield client.repos.createDeploymentStatus(Object.assign({}, repo, { deployment_id: parseInt(deploymentID, 10), state: newStatus, log_url: logsURL || `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}/checks`, environment_url: envURL, description }));
                        console.log(`${deploymentID} status set to ${newStatus}`);
                    }
                    break;
                case 'deactivate-env':
                    {
                        const environment = core.getInput('env', { required: true });
                        const deployments = yield client.repos.listDeployments({
                            repo: repo.repo,
                            owner: repo.owner,
                            environment,
                        });
                        if (deployments.data.length < 1) {
                            console.log(`found no deployments for env ${environment}`);
                            return;
                        }
                        const deadState = 'inactive';
                        let deploymentsUpdated = 0;
                        for (let i = 0; i < deployments.data.length; i++) {
                            deploymentsUpdated++;
                            const deployment = deployments.data[i];
                            console.log(`setting deployment '${environment}.${deployment.id}' (${deployment.sha}) state to "${deadState}"`);
                            yield client.repos.createDeploymentStatus(Object.assign({}, repo, { deployment_id: deployment.id, state: deadState, description }));
                        }
                        console.log(`${deploymentsUpdated} deployments updated`);
                    }
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
