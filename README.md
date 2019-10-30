# Deployments

GitHub action for working painlessly with deployment statuses.

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
