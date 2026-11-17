const assert = require("assert");
const fs = require("fs");
const path = require("path");
const semver = require("semver");

const minimums = {
    y18n: "4.0.1", lodash: "4.17.21", "hosted-git-info": "2.8.9",
    "glob-parent": "5.1.2", "path-parse": "1.0.7", "aws-sdk": "2.1030.0",
    pathval: "1.1.1", minimist: "1.2.6", protobufjs: "6.11.3", flat: "5.0.1", mocha: "10.2.0",
};
for (const location of [".", "nodejs"]) {
    describe(`${location} dependency security floors`, () => {
        const lock = JSON.parse(fs.readFileSync(path.resolve(location, "package-lock.json"), "utf8"));
        function check(name, entry) {
            if (minimums[name]) {
                it(`${name}@${entry.version} meets the consolidated minimum`, () => {
                    assert.ok(semver.gte(entry.version, minimums[name]), `${name}@${entry.version} < ${minimums[name]}`);
                });
            }
        }
        if (lock.packages) {
            Object.keys(lock.packages).filter(key => key.includes("node_modules/")).forEach(key => {
                check(key.split("node_modules/").pop(), lock.packages[key]);
            });
        } else {
            function visit(dependencies) {
                Object.keys(dependencies || {}).forEach(name => {
                    check(name, dependencies[name]);
                    visit(dependencies[name].dependencies);
                });
            }
            visit(lock.dependencies);
        }
    });
}
