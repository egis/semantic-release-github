import * as fs from 'fs';
import GitHubApi from '@octokit/rest';
import * as parseGithubUrl from '@bahmutov/parse-github-repo-url';

let env = process.env;
const parseSlug = parseGithubUrl.default;

const PACKAGE_JSON = 'package.json';
const GH_TOKEN_KEY = 'GH_TOKEN';

export default class DependentsUpdater {
  readConfig() {
    let pkg = JSON.parse(fs.readFileSync('./package.json'));
    this.packageName = pkg.name;
    this.packageVersion = pkg.version;
    this.config = Object.assign({pullRequests: true}, pkg['semantic-dependents-updates']);
    this.deps = this.config.dependents;
    this.ghToken = env[GH_TOKEN_KEY] || env.GITHUB_TOKEN;
  }

  update() {
    if (this.deps && Object.keys(this.deps).length > 0) {
      console.log(`Updating this package ${this.packageName} to version ${this.packageVersion} in dependent packages:`);
    }
    for (let dep of Object.keys(this.deps)) {
      this.updateDependency(dep, this.deps[dep]);
    }
  }

  updateFileInBranch(rawPkg, config) {
    let msg = Object.assign(this.gitRepoOptions(config), {
      path: PACKAGE_JSON,
      branch: config.newBranch,
      message: `chore(package): update ${this.packageName} to version ${this.packageVersion}`,
      author: Object.assign({
            name: 'semantic-dependents-updates-github bot',
            email: 'semadep@nowhere.io'
          }, this.config.author || {}),
      sha: config.oldPackageSha
    });
    let msgWithFile = Object.assign({
      content: new Buffer(rawPkg).toString('base64')
    }, msg);
    return this.githubApi.repos.updateFile(msgWithFile)
      .then((res) => config.updateCommitSha = res.data.commit.sha)
      .catch((err) => {
        throw new Error(`Couldn't commit a change  ${JSON.stringify(msg)} for ${config.targetPackageName}: ${err}`);
      });
  }

  createPullRequest(config) {
    let msg = Object.assign(this.gitRepoOptions(config), {
      title: `Update ${this.packageName} to version ${this.packageVersion}`,
      base: config.branch,
      head: config.newBranch,
      body: '🚀'
    });

    return this.githubApi.pulls.create(msg)
      .catch((err) => {
        throw new Error(`Couldn't create a PR for ${config.targetPackageName}: ${JSON.stringify(err.errors)}`);
      });
  }

  getCurrentHead(config) {
    let msg = Object.assign(this.gitRepoOptions(config), {branch: config.branch});
    return this.githubApi.repos.getBranch(msg)
      .then((res) => res.data.commit.sha)
      .catch((err) => {
        throw new Error(`Couldn't get current head of ${config.targetPackageName}: ${err}`);
      });
  }

  createBranch(config) {
    let ts = `${Date.now()}`;
    config.newBranch = `${this.config.branchNameBase || 'autoupdate'}-${this.packageVersion}-${ts}`;
    return this.getCurrentHead(config)
      .then((sha) => {
        let msg = Object.assign(this.gitRepoOptions(config), {
          ref: `refs/heads/${config.newBranch}`,
          sha: sha
        });

        return this.githubApi.gitdata.createRef(msg)
          .catch((err) => {
            throw new Error(`Couldn't create a new branch for ${config.targetPackageName} from sha ${sha}: ${err}`);
          });
      });
  }

  processTargetPackageJson(rawPkg, config) {
    let pkg = JSON.parse(rawPkg, 'utf8');
    let key = ['dependencies', 'devDependencies', 'peerDependencies'].find((k) => {
      return (pkg[k] || {})[this.packageName];
    });
    if (!key) {
      console.log(`Package ${config.targetPackageName} doesn't have ${this.packageName} as dependency`);
      return;
    }
    let currentVersion = pkg[key][this.packageName];
    if (currentVersion !== this.packageVersion) {
      console.log(`Updating ${this.packageName} version at ${config.targetPackageName} from ${currentVersion} to ` +
          this.packageVersion);

      rawPkg = rawPkg.replace(`"${this.packageName}": "${currentVersion}"`,
          `"${this.packageName}": "${this.packageVersion}"`);
      this.createBranch(config).then(() => {
        return this.updateFileInBranch(rawPkg, config);
      }).then(() => {
        if (this.config.pullRequests) {
          this.createPullRequest(config).then(() => console.log(`Created a PR for ${config.targetPackageName}`));
        }
      });
    } else {
      console.log(`Package ${config.targetPackageName} already have ${this.packageName} at version ${this.packageVersion}`);
      return;
    }
  }

  gitRepoOptions(config) {
    return {
      owner: config.gitRepoOwner,
      repo: config.gitRepo
    };
  }

  getTargetPackageJson(options, config) {
    return this.githubApi.repos.getContents(Object.assign(this.gitRepoOptions(config), {
            ref: config.branch,
            path: PACKAGE_JSON
          }, options))
      .then((res) => res.data)
      .catch((err) => {
        throw new Error(`Couldn't get ${PACKAGE_JSON} of ${config.targetPackageName}: ${err}`);
      });
  }

  updateDependency(dep, gitUrl) {
    let config = {};
    config.targetPackageName = dep;
    config.branch = this.config.branch || 'master';
    console.log(`Trying to update dependent package ${dep} at ${gitUrl}`);
    let [owner, repo] = parseSlug(gitUrl);
    config.gitRepo = repo;
    config.gitRepoOwner = owner;
    this.getTargetPackageJson({}, config).then((data) => {
      config.oldPackageSha = data.sha;
    }).then(() => {
      this.getTargetPackageJson({headers: {Accept: 'application/vnd.github.v3.raw'}}, config).then((data) => {
        this.processTargetPackageJson(data, config);
      });
    });
  }

  authenticate() {
    if (!this.ghToken) {
      throw `You need to set the ${GH_TOKEN_KEY} env variable`;
    }
    this.githubApi = new GitHubApi({
      auth: this.ghToken
    });
  }

  run() {
    this.readConfig();
    this.authenticate();
    this.update();
  }
}
