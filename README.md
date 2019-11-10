# Deployments

GitHub action for working painlessly with deployment statuses. See [this blog post](https://dev.to/bobheadxi/branch-previews-with-google-app-engine-and-github-actions-3pco) for a more practical example.

```yml
jobs:
  deploy:
    steps:
    - name: start deployment
      uses: bobheadxi/deployments@master
      id: deployment
      with:
        step: start
        token: ${{ secrets.GITHUB_TOKEN }}
        env: release

    - name: do my deploy
      # ...

    - name: update deployment status
      uses: bobheadxi/deployments@master
      if: always()
      with:
        step: finish
        token: ${{ secrets.GITHUB_TOKEN }}
        env: ${{ steps.deployment.outputs.env }}
        status: ${{ job.status }}
        deployment_id: ${{ steps.deployment.outputs.deployment_id }}

```
