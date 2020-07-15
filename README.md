# GitHub Deployments [![View Action](https://img.shields.io/badge/view-github%20action-yellow.svg)]

## Credit 

Work is based on:  `bobheadxi/deployments` is a [GitHub Action](https://github.com/features/actions) for working painlessly with deployment statuses. Instead
of exposing convoluted Action configuration that mirrors that of the
[GitHub API](https://developer.github.com/v3/repos/deployments/)
like some of the other available Actions do, this Action simply exposes a number of
configurable, easy-to-use "steps" common to most deployment flows.

## Features
- [Features](#features)
  - [`step: start`](#step-start)
  - [`step: finish`](#step-finish)
  - [`step: deactivate-env`](#step-deactivate-env)

A simple example:

```yml
on:
  push:
    branches:
    - master

jobs:
  deploy:
    steps:
    - name: start deployment
      uses: tallyb/deployments@master
      id: deployment
      with:
        step: start
        token: ${{ secrets.GITHUB_TOKEN }}
        env: release

    - name: do my deploy
      # ...

    - name: update deployment status
      uses: tallyb/deployments@master
      if: always()
      with:
        step: finish
        token: ${{ secrets.GITHUB_TOKEN }}
        status: ${{ job.status }}
        deployment_id: ${{ steps.deployment.outputs.deployment_id }}
```

See [this blog post](https://dev.to/tallyb/branch-previews-with-google-app-engine-and-github-actions-3pco)
for a bit of background and more practical example. Other examples in the wild:

* [`xt0rted/actions-cake-demo`](https://github.com/xt0rted/actions-cake-demo/blob/master/.github/workflows/deploy.yml) - demo project using GitHub Actions and Cake to build & deploy a .NET Core site to Azure App Services
* [`conveyal/analysis-ui`](https://github.com/conveyal/analysis-ui/blob/dev/.github/workflows/deploy.yml#L17) -
Conveyal's frontend for creating and analyzing transportation scenarios

## Features

### `step: start`

This is best used on the `push: { branches: [ ... ] }` event, but you can also have
`release: { types: [ published ] }` trigger this event. `start` should be followed by whatever
deployment tasks you want to do, and it creates and marks a deployment as "started":

![deploy started](.static/start.png)

The following [`inputs`](https://help.github.com/en/articles/workflow-syntax-for-github-actions#jobsjob_idstepswith)
are available:

| Variable        | Default                     | Purpose
| --------------- | --------------------------- | -------
| `step`          |                             | must be `start` for this step
| `token`         |                             | provide your `${{ secrets.GITHUB_TOKEN }}` for API access
| `logs`          | URL to GitHub commit checks | URL of your deployment logs
| `desc`          |                             | description for this deployment
| `env`           |                             | identifier for environment to deploy to (e.g. `staging`, `prod`, `master`)
| `no_override`   | `true`                      | toggle whether to mark existing deployments of this environment as inactive
| `deployment_id` |                             | Use an existing deployment instead of creating a new one (e.g. `${{ github.event.deployment.id }}`)
| `ref`           | `github.ref`                | Specify a particular git ref to use,  (e.g. `${{ github.head_ref }}`)

The following [`outputs`](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/contexts-and-expression-syntax-for-github-actions#steps-context)
are available:

| Variable        | Purpose
| --------------- | -------
| `deployment_id` | ID of created GitHub deployment
| `env`           | name of configured environment

<details>
<summary>Simple Push Example</summary>
<p>

```yml
on:
  push:
    branches:
    - master

jobs:
  deploy:
    steps:
    - name: start deployment
      uses: tallyb/deployments@master
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
    steps:
    - name: start deployment
      uses: tallyb/deployments@master
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

This is best used after `step: start` and should follow whatever deployment tasks you want to do in the same workflow. `finish` marks an in-progress deployment as complete:

![deploy finished](.static/finish.png)

The following [`inputs`](https://help.github.com/en/articles/workflow-syntax-for-github-actions#jobsjob_idstepswith)
are available:

| Variable        | Default                     | Purpose
| --------------- | --------------------------- | -------
| `step`          |                             | must be `finish` for this step
| `token`         |                             | provide your `${{ secrets.GITHUB_TOKEN }}` for API access
| `logs`          | URL to GitHub commit checks | URL of your deployment logs
| `desc`          |                             | description for this deployment
| `status`        |                             | provide the current deployment job status `${{ job.status }}`
| `deployment_id` |                             | identifier for deployment to update (see outputs of [`step: start`](#step-start))
| `env_url`       |                             | URL to view deployed environment

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
      uses: tallyb/deployments@master
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

### `step: deactivate-env`

This is best used on the `pull_request: { types: [ closed ] }` event, since GitHub does not seem
to provide a event to detect when branches are deleted. This step can be used to automatically shut
down deployments you create on pull requests and mark environments as destroyed:

![env destroyed](.static/destroyed.png)

The following [`inputs`](https://help.github.com/en/articles/workflow-syntax-for-github-actions#jobsjob_idstepswith)
are available:

| Variable        | Default                     | Purpose
| --------------- | --------------------------- | -------
| `step`          |                             | must be `deactivate-env` for this step
| `token`         |                             | provide your `${{ secrets.GITHUB_TOKEN }}` for API access
| `logs`          | URL to GitHub commit checks | URL of your deployment logs
| `desc`          |                             | description for this deployment
| `env`           |                               | identifier for environment to deploy to (e.g. `staging`, `prod`, `master`)

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
      uses: tallyb/deployments@master
      with:
        step: deactivate-env
        token: ${{ secrets.GITHUB_TOKEN }}
        env: ${{ steps.get_branch.outputs.branch }}
        desc: Deployment was pruned
```

</p>
</details>

<br />
