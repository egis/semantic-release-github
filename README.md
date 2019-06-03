# semantic-dependents-updates-github

Creates Github Pull Requests to update current package' version in dependent projects.

[![NPM info][nodei.co]][npm-url]

[![Circle CI](https://circleci.com/gh/egis/semantic-dependents-updates-github.svg?style=shield)](https://circleci.com/gh/egis/semantic-dependents-updates-github)
[![Dependency Status](https://david-dm.org/egis/semantic-dependents-updates-github.svg)](https://david-dm.org/egis/semantic-dependents-updates-github)
[![devDependency Status](https://david-dm.org/egis/semantic-dependents-updates-github/dev-status.svg)](https://david-dm.org/egis/semantic-dependents-updates-github#info=devDependencies)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Overview
This package can be useful for a family of inter-dependent NPM packages. The basic idea is this: when A package'
version is updated let's send a pull request to package B, changing A's dependency in its package.json to new version
and initiating CI test of B with new version of A.

This is similar to the way [Greenkeeper](https://greenkeeper.io) works, but it's a bit different:
* it's just a Node.js module, not an external service
* it works fine with private NPM packages (Greenkeeper currently doesn't support them, that's why I needed to create it)
* it's focused on single dependency package with a list of dependents, similarly to [dont-break](https://www.npmjs.com/package/dont-break)'s approach

This module plays perfectly with [semantic-release](https://github.com/semantic-release/semantic-release), see below for usage instructions.

Here's an example output from this module at CircleCI:
![Example screenshot](http://content.screencast.com/users/artemv/folders/Jing/media/e5c2f093-44a6-489a-8a98-280609e87d40/00000623.png "Example screenshot")

## Limitations
In case B depends on A this module creates a Git branch inside B's repository, so this only works if your Github
user have write access to B's repository. So basically this is a solution only for a case when you (or your
organisation) own the whole family of dependencies, which was exactly the case which this module was made to solve -
it was made for a company's own suite of private NPM modules.

## Installation
Install the package:
```
npm install -g @egis/semantic-dependents-updates-github
```

## Usage

* Create a GitHub token to be used by semantic-dependents-updates-github and put it to GH_TOKEN env variable.
You can also take (any of) GH_TOKEN created by https://github.com/semantic-release/semantic-release setup: it will
print it if you choose 'Other' CI instead of Travis.

* Define the dependent projects to be updated in package.json, e.g.:
```
  ...
  "name": "build-tools",
  "version": "1.2.3",
  "semantic-dependents-updates": {
    "dependents": {
      "@egis/egis-ui": "git@github.com:egis/EgisUI.git",
      "@egis/esign": "git@github.com:egis/eSign.git",
      "@egis/portal-app": "git@github.com:egis/Portal.git"
    }
  },
  ...
```
Here we tell semantic-dependents-updates-github to create pull requests to change build-tools' version to "1.2.3" in
GitHub repos of "@egis/egis-ui", "@egis/esign" and "@egis/portal-app" packages.

* Use the 'semantic-dependents-updates-github' binary script in package.json' scripts section - this will create the 
PRs. Example for integration with semantic-release:
```
yarn semantic-release && yarn semantic-dependents-updates-github
```
The PR generation can be switched off - then only branch will be created and relevant commit will be pushed:
```
PR=false yarn semantic-dependents-updates-github
```
## Configuration

The module config section in package.json can have following options, all of which are optional except "dependents". Example:
```
  ...
  "semantic-dependents-updates": {
    "dependents": {
      "@egis/egis-ui": "git@github.com:egis/EgisUI.git",
      "@egis/esign": "git@github.com:egis/eSign.git",
      "@egis/portal-app": "git@github.com:egis/Portal.git"
    },
    "branchNameBase": "autoupdate-build-tools",
    "branch": "my-branch",
    "author": {
      name: "semantic-dependents-updates-github bot",
      email: "semadep@nowhere.io"
    },
    "pullRequests": false
  },
  ...
```
* "dependents" list NPM package names and Github URLs of dependent packages
* "branch" is the target branch of dependent packages where pull request will be submitted to ("master" by default)
* "author" can be used to specify "author" info for the commit created by module, by default it's { name: "semantic-dependents-updates-github bot", email: "semadep@nowhere.io" }
* "branchNameBase" is a prefix of branch being created for pull request. Full branch name in this case will be like this: "autoupdate-build-tools-1.0.2-1459471368624". Default is "autoupdate".

## License

MIT License 2019 © Artem Vasiliev


[nodei.co]: https://nodei.co/npm/@egis/semantic-dependents-updates-github.png
[npm-url]: https://npmjs.org/package/@egis/semantic-dependents-updates-github
