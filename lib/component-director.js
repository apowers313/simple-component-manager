"use strict";

const { spawn } = require("child_process");
const Spinner = require("cli-spinner").Spinner;
const path = require("path");
const fs = require("fs");
const stripJsonComments = require("strip-json-comments");
const mkdirp = require("mkdirp");
const chownr = require("chownr");
const ComponentManager = require("./component-manager");
var log;

var componentDirectorSingleton;

/**
 * The ComponentDirector manages the ComponentManager. It controls the lifecycle
 * of components via the `scm-config.json`. It is primarily used through the commandline
 * via the `scm` command.
 */
class ComponentDirector {
    constructor(opts) {
        if (componentDirectorSingleton) return componentDirectorSingleton;

        // I'm the singleton
        componentDirectorSingleton = this; // eslint-disable-line consistent-this

        // create a component manager
        this.cm = new ComponentManager();

        // load configuration
        opts = opts || {};
        this.origConfig = opts;
        this.config = {};
        this.confList = [opts];
    }

    /**
     * Allocates a new {@link ComponentDirector} and starts all the components.
     * @param  {Object} opts Options for the component director.
     * @return {Promise.<ComponentDirector>}      A Promise that resolves to the new ComponentDirector when complete, or rejects on error.
     */
    static async start(opts) {
        try {
            console.log("starting...");
            var cd = new ComponentDirector(opts);

            await cd.processConfig();
            // `npm install` all the packages specified by the components
            await cd.installComponents(cd.componentList);
            // require each component and add each to the ComponentManager
            await cd.initComponents(cd.componentList);

            console.log("start done");

            // chown data dir
            if (cd.cm.dataDir &&
                cd.setgid !== undefined &&
                cd.setuid !== undefined) {
                chownr.sync(cd.cm.dataDir, cd.setuid, cd.setgid);
            }

            // change group id (always do this before uid ;)
            if (cd.setgid !== undefined) {
                process.setgid(cd.setgid);
            }

            // change user id
            if (cd.setuid !== undefined) {
                process.setuid(cd.setuid);
            }

            // grab a logger instance for future use
            var logger = cd.cm.get("logger");
            if (logger === undefined) {
                throw new Error("logger component not found");
            }
            log = logger.create("ComponentDirector");
            cd.log = log;

            log.debug("Started ComponentDirector.");

            return cd;
        } catch (err) {
            console.log("ERROR:", err);
            throw err;
        }
    }

    /**
     * A wrapper for {@link ComponentDirector#start}
     * @param  {Object} opts Options
     * @return {Promise.<ComponentDirector>}      A Promise that resolves to ComponentDirector on success, or rejects with an Error on failure.
     */
    start(opts) {
        return ComponentDirector.start(opts);
    }

    static stop() {
        if (this.cm) this.cm.shutdown();
        componentDirectorSingleton = null;
    }

    static readConfig(filename) {
        try {
            var json = fs.readFileSync(filename, "utf8");
            return JSON.parse(stripJsonComments(json));
        } catch (e) {
            console.log("WARNING: couldn't load config file:", filename);
        }
    }

    readConfig(filename) {
        return ComponentDirector.readConfig(filename);
    }

    loadConfig(conf) {
        if (typeof conf === "string") {
            conf = ComponentDirector.readConfig(conf);
            if (!conf) return;
        }

        var confList = this.confList;
        confList.push(conf);

        // load any included files
        if (Array.isArray(conf.includeFiles)) {
            conf.includeFiles.forEach((file) => {
                let c = ComponentDirector.readConfig(file);
                if (c) {
                    if (!c.configDir) c.configDir = path.dirname(path.resolve(file));
                    confList = confList.concat(this.loadConfig(c));
                }
            });
        }
    }

    processConfig() {
        return new Promise((resolve) => {
            // create a list of all the configuration files
            var confList = this.confList;
            var componentList = [];

            // aggregate a complete list of components from the config files
            for (let config of confList) {
                // set main configDir & dataDir if they're not already set
                if (config.configDir && !this.config.configDir) this.config.configDir = config.configDir;
                if (config.dataDir) this.config.dataDir = config.dataDir;

                // save gid / uid
                if (config.setuid) {
                    if (typeof config.setuid !== "number") {
                        throw new Error("expected setuid to be number");
                    }
                    this.setuid = config.setuid;
                }
                if (config.setgid) {
                    if (typeof config.setgid !== "number") {
                        throw new Error("expected setgid to be number");
                    }
                    this.setgid = config.setgid;
                }

                // save component list
                if (Array.isArray(config.components)) {
                    componentList = componentList.concat(config.components);
                }
            }

            // if dataDir was never set, use the configDir
            if (!this.config.configDir) this.config.configDir = ".";
            if (!this.config.dataDir) this.config.dataDir = path.join(this.config.configDir, "data");
            // solidify the file paths
            this.config.configDir = fs.realpathSync(path.resolve(this.config.configDir));
            mkdirp.sync(this.config.dataDir);
            this.config.dataDir = fs.realpathSync(path.resolve(this.config.dataDir));
            this.cm.setDataDir(this.config.dataDir);

            componentList.forEach((component) => this.cleanComponent(component));

            this.componentList = componentList;
            resolve(confList);
        });
    }

    installComponents(componentList) {
        console.log("installing...");
        return new Promise((resolve, reject) => {
            // reduce component list to list of unique package names
            var packageList = componentList.map((c) => c.package);
            packageList = packageList.filter((item, pos) => packageList.indexOf(item) === pos);
            // add all the package paths to the components
            componentList.forEach((component) => {
                var versionPos = component.packageName.indexOf("@");
                let packageName = (versionPos === -1) ? component.packageName : component.packageName.substring(0, versionPos);
                component.packagePath = path.join(this.config.dataDir, "node_modules", packageName);
            });
            if (packageList.length === 0) return resolve();

            // spawn npm to install components at the desired prefix
            var npmArgs = [];
            npmArgs.push("--prefix", this.config.dataDir);
            npmArgs.push("--color", "false");
            npmArgs.push("install");

            // if we're going to install as root, include this arg...
            if (process.getuid() === 0 && !this.setuid) npmArgs.push("--unsafe-perm");
            npmArgs = npmArgs.concat(packageList);

            console.log("Updating components:\n\t" + packageList.join("\n\t") + "\n");

            // console.log("npm args", npmArgs);
            // make sure we have the right permissions...
            if (this.setuid && this.setgid) chownr.sync(this.cm.dataDir, this.setuid, this.setgid);
            // do the install
            var npmPs = spawn("npm", npmArgs, {
                uid: this.setuid ? this.setuid : process.getuid(),
                gid: this.setgid ? this.setgid : process.getgid()
            });

            // spin while we're waiting...
            var spinner = new Spinner("Updating components...");
            spinner.setSpinnerString(0);
            spinner.start();

            npmPs.stdout.on("data", (data) => {
                // console.log(data.toString());
            });

            npmPs.stderr.on("data", (data) => {
                console.log(data.toString());
            });

            npmPs.on("close", (code) => {
                spinner.stop(true);
                // console.log("npm finished with code:", code);
                if (code === 0) {
                    return resolve(packageList);
                }
                console.log("npm installation failed. Error code", code);
                return reject(code);
            });
        });
    }

    initComponents(componentList) {
        console.log("loading...");
        return promiseSequence(componentList, (component) => {
            var obj = require(component.packagePath); // eslint-disable-line global-require
            if (typeof obj === "function") {
                component.LoadedClass = obj;
                component.loaded = new component.LoadedClass(this.cm);
            } else {
                component.loaded = obj;
            }

            this.cm.register(component.name, component.type, component.loaded);
        })
            .then(() => {
                // pre-configure components
                iterateComponentListConfig.call(this, componentList, "pre-config", (key, val, component) => {
                    console.log("pre-config:", component.name, key, val);
                    this.cm.config(component.name, key, val);
                });
            })
            .then(() => this.cm.init())
            .then(() => {
                // post-configure components
                iterateComponentListConfig.call(this, componentList, "post-config", (key, val, component) => {
                    console.log("post-config:", component.name, key, val);
                    this.cm.config(component.name, key, val);
                });
            });
    }

    cleanComponent(component) {
        if (typeof component.name !== "string") {
            throw new TypeError("component missing name:\n" + component);
        }

        if (typeof component.name !== "string") {
            throw new TypeError(`component "${component.name}" missing type:\n` + component);
        }

        if (typeof component.type !== "string") {
            throw new TypeError(`component "${component.name}" missing type:\n` + component);
        }

        if (component["pre-config"] && !Array.isArray(component["pre-config"])) {
            throw new TypeError(`component "${component.name}" has malformed "pre-config":\n` + component);
        }

        if (component["pre-config"]) component["pre-config"].forEach((config) => {
            if (typeof config !== "object") {
                throw new TypeError(`component "${component.name}" has malformed "pre-config" entry:\n` + config);
            }
        });

        if (component["post-config"] && !Array.isArray(component["post-config"])) {
            throw new TypeError(`component "${component.name}" has malformed "post-config":\n` + component);
        }

        if (component["post-config"]) component["post-config"].forEach((config) => {
            if (typeof config !== "object") {
                throw new TypeError(`component "${component.name}" has malformed "pre-config" entry:\n` + config);
            }
        });

        component.packageName = component.packageName || this.componentResolvePackageName(component);
    }

    componentResolvePackageName(component) {
        var packageName = component.package;
        // console.log ("package name before:", packageName);

        // TODO: should probably unpack the .tgz and parse the package.json rather than assuming that the package is named right
        // if package is .tgz url
        if (packageName.match(/https?:\/\/.*\.tgz$/)) {
            packageName = path.basename(packageName.split("://")[1], ".tgz");
        } else if (packageName.match(/\.tgz$/)) {
            // if package is .tgz
            packageName = path.basename(packageName, ".tgz");
        } else try { // if package is folder
            if (packageName === "") packageName = "."; // if package is empty string use local dir
            var basepath = component.configDir || process.cwd(); // TODO XXX: should be the path where the config file was loaded from
            var packageJson = path.resolve(basepath, packageName, "package.json");
            packageName = require(packageJson).name; // eslint-disable-line global-require
        } catch (e) {
            // console.log (e);
            }

        // console.log ("package name after:", packageName);
        return packageName;
    }
}

function iterateComponentListConfig(componentList, config, cb) {
    componentList.forEach((component) => {
        function iterateConfigObj(configObj) {
            Object.keys(configObj).forEach((key) => {
                cb(key, configObj[key], component, config);
            });
        }

        function iterateConfigArray(configArr) {
            configArr.forEach((configObj) => {
                iterateConfigObj(configObj);
            });
        }

        if (Array.isArray(component[config])) iterateConfigArray(component[config]);
        else if (typeof component[config] === "object") iterateConfigObj(component[config]);
    });
}

function promiseSequence(list, fn) {
    var pacc = Promise.resolve();
    for (let item of list) {
        pacc = pacc.then(() => fn(item));
    }
    return pacc;
}

module.exports = ComponentDirector;

