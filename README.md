# GitHub Deployments [![View Action](https://img.shields.io/badge/view-github%20action-yellow.svg)](https://bobheadxi.dev/r/deployments/)

`bobheadxi/deployments` is a [GitHub Action](https://github.com/features/actions) for working painlessly with deployment statuses.
Instead of exposing convoluted Action configuration that mirrors that of the [GitHub API](https://developer.github.com/v3/repos/deployments/) like some of the other available Actions do, this Action simply exposes a number of configurable, easy-to-use "steps" common to most deployment flows.

- [Features](#features)
  - [`step: start`](#step-start)
  - [`step: finish`](#step-finish)
  - [`step: deactivate`](#step-deactivate)
- [Debugging](#debugging)
- [Migrating to V1](#migrating-to-v1)

A simple example:

```yml
on:
  push:
    branches:
    - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: start deployment
      uses: bobheadxi/deployments@v1
      id: deployment
      with:
        step: start
        token: ${{ secrets.GITHUB_TOKEN }}
        env: release

    - name: do my deploy
      # ...

    - name: update deployment status
      uses: bobheadxi/deployments@v1
      if: always()
      with:
        step: finish
        token: ${{ secrets.GITHUB_TOKEN }}
        status: ${{ job.status }}
        deployment_id: ${{ steps.deployment.outputs.deployment_id }}
```

See [this blog post](https://dev.to/bobheadxi/branch-previews-with-google-app-engine-and-github-actions-3pco) for a bit of background and more practical example.
You can also refer to other projects that also use this action:

- [`github/super-linter`](https://sourcegraph.com/search?q=context:global+repo:%5Egithub%5C.com/github/super-linter%24+file:%5E%5C.github/workflows+bobheadxi/deployments&patternType=literal) [![GitHub Repo stars](https://img.shields.io/github/stars/github/super-linter?style=social)](https://github.com/github/super-linter) - [GitHub's all-in-one linter Action](https://github.blog/2020-06-18-introducing-github-super-linter-one-linter-to-rule-them-all/)
- [`mxcl/PromiseKit`](https://sourcegraph.com/search?q=context:global+repo:%5Egithub%5C.com/mxcl/PromiseKit%24+file:%5E%5C.github/workflows+bobheadxi/deployments&patternType=literal) [![GitHub Repo stars](https://img.shields.io/github/stars/mxcl/PromiseKit?style=social)](https://github.com/mxcl/PromiseKit) - promises for Swift and Objective-C
- [`mirumee/saleor`](https://sourcegraph.com/search?q=repo:%5Egithub%5C.com/mirumee/saleor%24+bobheadxi/deployments\&patternType=literal) [![GitHub Repo stars](https://img.shields.io/github/stars/mirumee/saleor?style=social)](https://github.com/mirumee/saleor) - modular, high performance, headless e-commerce storefront
- [`sharetribe/sharetribe`](https://sourcegraph.com/search?q=context:global+repo:%5Egithub%5C.com/sharetribe/sharetribe%24+file:%5E%5C.github/workflows+bobheadxi/deployments&patternType=literal) [![GitHub Repo stars](https://img.shields.io/github/stars/sharetribe/sharetribe?style=social)](https://github.com/sharetribe/sharetribe) - marketplace software
- [`skylines-project/skylines`](https://sourcegraph.com/search?q=repo:%5Egithub%5C.com/skylines-project/skylines%24+bobheadxi/deployments\&patternType=literal) [![GitHub Repo stars](https://img.shields.io/github/stars/skylines-project/skylines?style=social)](https://github.com/skylines-project/skylines) - live tracking, flight database and competition web platform

You can find [more usages of this action on Sourcegraph](https://sourcegraph.com/search?q=context:global+bobheadxi/deployments+file:%5E%5C.github/workflows+-repo:bobheadxi&patternType=literal)!

## Features

The following configuration options are for *all steps*:

| Variable     | Default                     | Purpose                                                                                          |
| ------------ | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `step`       |                             | One of [`start`](#step-start), [`finish`](#step-finish), or [`deactivate`](#step-deactivate) |
| `token`      |                             | provide your `${{ secrets.GITHUB_TOKEN }}` for API access                                        |
| `repository` | Current repository          | target a specific repository for updates                                                         |
| `logs`       | URL to GitHub commit checks | URL of your deployment logs                                                                      |
| `desc`       | GitHub-generated description | description for this deployment                                                                  |
| `env`           |                             | identifier for environment to deploy to (e.g. `staging`, `prod`, `main`)                          |

### `step: start`

This is best used on the `push: { branches: [ ... ] }` event, but you can also have `release: { types: [ published ] }` trigger this event.
`start` should be followed by whatever deployment tasks you want to do, and it creates and marks a deployment as "started":

![deploy started](.static/start.png)

The following [`inputs`](https://help.github.com/en/articles/workflow-syntax-for-github-actions#jobsjob_idstepswith) are available:

| Variable        | Default                     | Purpose                                                                                             |
| --------------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| `override`      | `true`                      | whether to mark existing deployments of this environment as inactive                                |
| `deployment_id` |                             | Use an existing deployment instead of creating a new one (e.g. `${{ github.event.deployment.id }}`) |
| `ref`           | `github.ref`                | Specify a particular git ref to use,  (e.g. `${{ github.head_ref }}`)                               |

The following [`outputs`](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/contexts-and-expression-syntax-for-github-actions#steps-context) are available:

| Variable        | Purpose                         |
| --------------- | ------------------------------- |
| `deployment_id` | ID of created GitHub deployment |
| `env`           | name of configured environment  |

<details>
<summary>Simple Push Example</summary>
<p>

```yml
on:
  push:
    branches:
    - main

jobs:
  deploy:
    steps:
    - name: start deployment
      uses: bobheadxi/deployments@v1
      id: deployment
      with:
        step: start
        token: ${{ secrets.GITHUB_TOKEN }}
        env: release

    - name: do my deploy
      # ...
```

</p>
</details>

<br />

<details>
<summary>Simple Pull Request Example</summary>
<p>

```yml
on:
  pull_request:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: start deployment
      uses: bobheadxi/deployments@v1
      id: deployment
      with:
        step: start
        token: ${{ secrets.GITHUB_TOKEN }}
        env: integration
        ref: ${{ github.head_ref }}

    - name: do my deploy
      # ...
```

</p>
</details>

<br />

### `step: finish`

This is best used after `step: start` and should follow whatever deployment tasks you want to do in the same workflow.
`finish` marks an in-progress deployment as complete:

![deploy finished](.static/finish.png)

The following [`inputs`](https://help.github.com/en/articles/workflow-syntax-for-github-actions#jobsjob_idstepswith) are available:

| Variable        | Default                     | Purpose                                                                           |
| --------------- | --------------------------- | --------------------------------------------------------------------------------- |
| `status`        |                             | provide the current deployment job status `${{ job.status }}`                     |
| `override`      | `true`                      | whether to mark existing deployments of this environment as inactive              |
| `deployment_id` |                             | identifier for deployment to update (see outputs of [`step: start`](#step-start)) |
| `env_url`       |                             | URL to view deployed environment                                                  |

<details>
<summary>Simple Example</summary>
<p>

```yml
# ...

jobs:
  deploy:
    steps:
    - name: start deployment
      # ... see previous example

    - name: do my deploy
      # ...

    - name: update deployment status
      uses: bobheadxi/deployments@v1
      if: always()
      with:
        step: finish
        token: ${{ secrets.GITHUB_TOKEN }}
        status: ${{ job.status }}
        deployment_id: ${{ steps.deployment.outputs.deployment_id }}
```

</p>
</details>

<br />

### `step: deactivate`

This is best used on the `pull_request: { types: [ closed ] }` event, since GitHub does not seem to provide a event to detect when branches are deleted.
This step can be used to automatically shut down deployments you create on pull requests and mark environments as destroyed:

![env destroyed](.static/destroyed.png)

The following [`inputs`](https://help.github.com/en/articles/workflow-syntax-for-github-actions#jobsjob_idstepswith) are available:

| Variable | Default                     | Purpose                                                                    |
| -------- | --------------------------- | -------------------------------------------------------------------------- |
| `step`   |                             | must be `deactivate` for this step                                     |
| `token`  |                             | provide your `${{ secrets.GITHUB_TOKEN }}` for API access                  |
| `logs`   | URL to GitHub commit checks | URL of your deployment logs                                                |
| `desc`   |                             | description for this deployment                                            |
| `env`    |                             | identifier for environment to deploy to (e.g. `staging`, `prod`, `main`) |

<details>
<summary>Simple Example</summary>
<p>

```yml
on:
  pull_request:
    types: [ closed ]

jobs:
  prune:
    steps:
    # see https://dev.to/bobheadxi/branch-previews-with-google-app-engine-and-github-actions-3pco
    - name: extract branch name
      id: get_branch
      shell: bash
      env:
        PR_HEAD: ${{ github.head_ref }}
      run: echo "##[set-output name=branch;]$(echo ${PR_HEAD#refs/heads/} | tr / -)"

    - name: do my deployment shutdown
      # ...

    - name: mark environment as deactivated
      uses: bobheadxi/deployments@v1
      with:
        step: deactivate
        token: ${{ secrets.GITHUB_TOKEN }}
        env: ${{ steps.get_branch.outputs.branch }}
        desc: Deployment was pruned
```

</p>
</details>

## Debugging

The argument `debug: true` can be provided to print arguments used by `deployments` and log debug information.

If you run into an problems or have any questions, feel free to open an [issue](https://github.com/bobheadxi/deployments/issues) or [discussion](https://github.com/bobheadxi/deployments/discussions)!

## Migrating to V1

`v1.0.0` makes the following breaking changes from `v0.7.x`:

- **CHANGED `no_override` is now `override`**, and the default behaviour is `override: true`.
- **CHANGED `log_args` is now `debug`**, but does the same thing as before.
- **REMOVED `auto_inactive`** - use `override` instead.
- **REMOVED `transient`** - all deployments created by this action are `transient` by default, with removals handled by `override` or `step: deactivate`.

<br />
