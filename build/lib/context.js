"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDeploymentContext = void 0;
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
function collectDeploymentContext() {
    const { ref, sha } = github_1.context;
    const customRepository = core_1.getInput("repository", { required: false });
    const [owner, repo] = customRepository
        ? customRepository.split("/")
        : [github_1.context.repo.owner, github_1.context.repo.repo];
    if (!owner || !repo) {
        throw new Error(`invalid target repository: ${owner}/${repo}`);
    }
    const github = github_1.getOctokit(core_1.getInput("token", { required: true }), {
        previews: ["ant-man-preview", "flash-preview"],
    });
    return {
        ref,
        sha,
        owner,
        repo,
        github,
        coreArgs: {
            autoInactive: core_1.getInput("auto_inactive") !== "false",
            logsURL: core_1.getInput("logs") ||
                `https://github.com/${owner}/${repo}/commit/${sha}/checks`,
            description: core_1.getInput("desc"),
            logArgs: core_1.getInput("log_args") === "true",
        },
    };
}
exports.collectDeploymentContext = collectDeploymentContext;
