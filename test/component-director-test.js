var ComponentDirector = require("../index.js").ComponentDirector;
var assert = require("chai").assert;
var sinon = require("sinon");
var fs = require("fs");

describe("component director", function() {
    afterEach(function() {
        return ComponentDirector.stop();
    });

    it("start", function() {
        return ComponentDirector.start()
            .then((cd) => {
                assert.instanceOf(cd, ComponentDirector);
            });
    });

    it("singleton", function() {
        var cd1;
        return ComponentDirector.start()
            .then((cd) => {
                cd1 = cd;
                return ComponentDirector.start();
            })
            .then((cd2) => {
                assert.instanceOf(cd1, ComponentDirector);
                assert.instanceOf(cd2, ComponentDirector);
                assert.strictEqual(cd1, cd2);
            });
    });

    it("stop", function() {
        return ComponentDirector.start();
        // stop called in afterEach
    });

    it("config loads includes", function() {
        var config = {
            includeFiles: [
                "/etc/config.json",
                "config.json",
                "server-config.json"
            ]
        };
        var cd = new ComponentDirector();

        var stub = sinon.stub(ComponentDirector, "readConfig");
        stub
            .withArgs("/etc/config.json")
            .returns({
                includeFiles: [
                    "config.json"
                ]
            });
        stub
            .withArgs("config.json")
            .returns({
                name: "config"
            });
        stub
            .withArgs("server-config.json")
            .returns({});
        cd.loadConfig(config);
        var confList = cd.confList;

        assert.strictEqual(stub.callCount, 4, "should have tried to load four files");
        assert.deepEqual(confList, [{}, {
            includeFiles: ['/etc/config.json', 'config.json', 'server-config.json']
        }, {
            configDir: "/etc",
            includeFiles: ['config.json']
        }, {
            configDir: process.cwd(),
            name: 'config'
        }, {
            configDir: process.cwd(),
            name: 'config'
        }, {
            configDir: process.cwd()
        }]);

        stub.restore();
    });

    it("config doesn't fail on missing includes", function() {
        var config = {
            includeFiles: [
                "/etc/config.json",
                "config.json",
                "server-config.json"
            ]
        };
        return ComponentDirector
            .start(config)
            .then((cd) => {
                assert.isUndefined(cd.cm.config.configDir);
                assert.isUndefined(cd.cm.config.dataDir);
            });
    });

    it("correctly resolves component names", function() {
        var cd = new ComponentDirector();
        var packageName;
        // See also: https://docs.npmjs.com/cli/install

        // simple package
        packageName = cd.componentResolvePackageName({
            package: "simple-package"
        });
        assert.strictEqual(packageName, "simple-package");
        // versioned package
        packageName = cd.componentResolvePackageName({
            package: "version-package@1.0.0"
        });
        assert.strictEqual(packageName, "version-package@1.0.0");
        // scoped package
        packageName = cd.componentResolvePackageName({
            package: "@myorg/scoped-package@1.0.0"
        });
        assert.strictEqual(packageName, "@myorg/scoped-package@1.0.0");
        // TODO: version range
        // TODO: tag
        // git ssh without user
        packageName = cd.componentResolvePackageName({
            package: "github.com:fido-alliance/fido-2-specs.git"
        });
        assert.strictEqual(packageName, "github.com:fido-alliance/fido-2-specs.git");
        // git ssh with user
        packageName = cd.componentResolvePackageName({
            package: "git@github.com:fido-alliance/fido-2-specs.git"
        });
        assert.strictEqual(packageName, "git@github.com:fido-alliance/fido-2-specs.git");
        // git https with .git
        packageName = cd.componentResolvePackageName({
            package: "https://github.com/fido-alliance/fido-2-specs.git"
        });
        assert.strictEqual(packageName, "https://github.com/fido-alliance/fido-2-specs.git");
        // git https without .git
        packageName = cd.componentResolvePackageName({
            package: "https://github.com/fido-alliance/fido-2-specs"
        });
        assert.strictEqual(packageName, "https://github.com/fido-alliance/fido-2-specs");
        // absolute local .tgz
        packageName = cd.componentResolvePackageName({
            package: "/Users/apowers/package.tgz"
        });
        assert.strictEqual(packageName, "package");
        // relative local .tgz
        packageName = cd.componentResolvePackageName({
            package: "apowers/package2.tgz"
        });
        assert.strictEqual(packageName, "package2");
        // http .tgz
        packageName = cd.componentResolvePackageName({
            package: "http://example.com/foo/bar/webpackage.tgz"
        });
        assert.strictEqual(packageName, "webpackage");
        // https .tgz
        packageName = cd.componentResolvePackageName({
            package: "https://example.com/foo/bar/better-webpackage.tgz"
        });
        assert.strictEqual(packageName, "better-webpackage");
        // directory
        packageName = cd.componentResolvePackageName({
            package: "test/helpers/comp1"
        });
        // directory
        packageName = cd.componentResolvePackageName({
            configDir: "test/helpers",
            package: "comp1"
        });
        assert.strictEqual(packageName, "test-package");
        // empty package name
        packageName = cd.componentResolvePackageName({
            configDir: "test/helpers/comp1",
            package: ""
        });
        assert.strictEqual(packageName, "test-package");
    });

    it("can load config with comments in it");

    it("finds right config dir");
    it("can set config dir in config", function() {
        var cd = new ComponentDirector();
        cd.loadConfig({
            configDir: "/tmp"
        });
        return cd.processConfig()
            .then(() => {
                assert.strictEqual(cd.config.configDir, fs.realpathSync("/tmp"));
            });
    });

    it("sets data dir when not specified", function() {
        var cd = new ComponentDirector();
        cd.loadConfig({
            configDir: "/tmp"
        });
        return cd.processConfig()
            .then(() => {
                assert.strictEqual(cd.config.dataDir, fs.realpathSync("/tmp") + "/data");
            });
    });

    it("can set data dir in config", function() {
        var cd = new ComponentDirector();
        cd.loadConfig({
            configDir: "/etc",
            dataDir: "/tmp"
        });
        return cd.processConfig()
            .then(() => {
                assert.strictEqual(cd.config.configDir, fs.realpathSync("/etc"));
                assert.strictEqual(cd.config.dataDir, fs.realpathSync("/tmp"));
            });
    });

    it("config load component", function() {
        this.timeout(30000);
        this.slow(30000);
        var config = {
            components: [{
                name: "fido-web",
                package: "test/helpers/comp1",
                type: "generic"
            }]
        };
        return ComponentDirector.start(config);
    });

    it("config works with comments");
    it("fails gracefully on bad config");
});