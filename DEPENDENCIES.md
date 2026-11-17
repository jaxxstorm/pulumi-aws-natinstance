# Dependency consolidation

This change consolidates Dependabot PRs #2–#15 and #17 without changing the
Pulumi resource implementation or upgrading the Pulumi provider/runtime majors.
Both the root package and the separate `nodejs` package have regenerated npm
lockfiles (lockfile version 3). Use an npm version that supports this format.

| Source PRs | Package | Locked result |
| --- | --- | --- |
| #2 | y18n (root) | 5.0.8 |
| #3 | lodash (root) | Removed from the dependency tree by the Mocha upgrade |
| #4, #5 | hosted-git-info (both) | 2.8.9 |
| #6 | glob-parent (root) | 5.1.2 |
| #7, #8 | path-parse (both) | 1.0.7 |
| #9, #10 | aws-sdk (both) | 2.1693.0 |
| #11 | pathval (root) | 1.1.1 |
| #12, #13 | minimist (both) | 1.2.8 |
| #14, #15 | protobufjs (both) | 6.11.6 |
| #17 | flat / mocha (root) | 5.0.2 / 10.8.2 |

## Local verification

Run from the repository root:

```sh
npm ci
npm test
npm --prefix nodejs ci
npm test
npm ls --all
npm --prefix nodejs ls --all
npm audit
npm audit --omit=dev
npm --prefix nodejs audit
npm --prefix nodejs audit --omit=dev
```

`npm test` first compiles the component, then runs dependency-floor assertions
against both lockfiles and an offline Pulumi mock test for NAT resource wiring.
The first test run resolves the root dependencies; after the separate install,
the second run resolves the `nodejs` dependencies. No Pulumi CLI, AWS credentials,
preview, or deployment is required. Tests are JavaScript so the newer Mocha runner
does not need the legacy ts-node loader for test discovery.

The dependency-floor tests cover the historical bot requests, **not all current
security advisories**. A removed package does not need a replacement version.
Do not interpret passing tests as a clean audit or proof of cloud deployment
behavior.

## Remaining limitations

- Current audits still report vulnerabilities in the legacy Pulumi/AWS dependency
  tree, including protobufjs, @grpc/grpc-js and uuid; Mocha's serialization
  dependency also has advisories. Resolving the historical bot requests does not
  fully remediate the repository. Review full and production audit output before
  adoption; do not force incompatible transitive upgrades solely to silence it.
- `make lint` already fails on the default branch because no `lint` npm script
  exists. This consolidation does not invent or disable a lint gate.
- `tsc --project nodejs/tsconfig.json --noEmit` already fails because that config
  references a missing `nodejs/index.ts`. The component's root `npm run build`
  succeeds; the separate example configuration needs follow-up.
- There is no tracked CI workflow in the base repository. Local verification is
  not a claim that remote CI passed.
