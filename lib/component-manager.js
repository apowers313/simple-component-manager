"use strict";

const DepGraph = require("dependency-graph").DepGraph;
const DefaultLogger = require("./default-logger");
const fs = require("fs");
const path = require("path");

var componentList = new Map();
var typeList = new Map();

module.exports = class ComponentManager {
    constructor() {
        this.componentList = componentList;
        this.typeList = typeList;
        this.logger = null;
        this.settings = {};

        // retister default types
        require("./types")(this); // eslint-disable-line global-require
    }

    registerType(typeName, validationFn) {
        if (typeof typeName !== "string") {
            throw new TypeError("expected 'typeName' to be string; got " + typeof typeName);
        }

        if (typeof validationFn !== "function") {
            throw new TypeError("expected 'validationFn' to be function; got " + typeof validationFn);
        }

        // console.log (`registering type: "${typeName}"`);

        this.typeList.set(typeName, validationFn);
    }

    getType(typeName) {
        if (typeof typeName !== "string") {
            throw new TypeError("expected 'typeName' to be string; got " + typeof typeName);
        }

        return this.typeList.get(typeName);
    }

    register(name, type, objectOrFn) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }

        if (typeof type !== "string") {
            throw new TypeError("expected 'type' to be string; got " + typeof type);
        }

        if (typeof objectOrFn !== "object" &&
            typeof objectOrFn !== "function") {
            throw new TypeError("expected 'objectOrFn' to be object or function; got " + typeof objectOrFn);
        }

        // console.log ("registering", name, "as", type);

        var validator = this.getType(type);
        if (validator === undefined) {
            throw new Error("type not found: " + type);
        }

        if (!validator(objectOrFn)) {
            throw new Error("object not a valid type: " + type);
        }

        this.componentList.set(name, objectOrFn);
        // console.log (name, "registered");
    }

    get(name) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }

        return this.componentList.get(name);
    }

    // TODO: getByType()

    clear() {
        componentList.clear();
        typeList.clear();
    }

    setDataDir(dir) {
        if (typeof dir !== "string") {
            throw new TypeError("expected 'dir' to be string, got " + typeof dir);
        }

        this.dataDir = fs.realpathSync(path.resolve(dir));
    }

    config(name, feature, value) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }

        if (typeof feature !== "string") {
            throw new TypeError("expected 'feature' to be string; got " + typeof feature);
        }

        var component = this.get(name);
        if (component === undefined) {
            throw new TypeError(name + " is not a valid component name");
        }

        if (typeof component.config !== "function") {
            throw new Error("configuration of '" + name + "' not allowed");
        }

        if (typeof component.features === "function") {
            let featureList = component.features();
            if (!featureList || featureList.indexOf(feature) < 0) {
                throw new TypeError("feature not found for component: " + feature);
            }
        }

        return component.config(feature, value);
    }

    init() {
        var dg = new DepGraph();

        // make sure we have a logger
        if (!this.get("logger")) {
            this.register("logger", "logger", new DefaultLogger(this));
        }
        this.log = this.get("logger").create("ComponentManager");

        // add dependency nodes
        this.componentList.forEach((component, name) => {
            this.log.silly("adding node:", name);
            dg.addNode(name);
        });

        // add dependencies
        this.componentList.forEach((component, name) => {
            if (typeof component.dependencies !== "function") {
                return;
            }

            var deps = component.dependencies();
            for (let depObj of deps) {
                var dep = depObj.name;
                this.log.silly("adding dependency:", name, "->", dep);
                try {
                    dg.addDependency(name, dep);
                } catch (err) {
                    // err.message = "foo";
                    var match = err.message.match(/Node does not exist: (.*)$/);
                    if (!match) throw err;
                    throw new Error(`'${name}' cannot find dependency '${dep}'`);
                }
            }
        });

        // build the ordered list of dependency loads
        var loadOrder = dg.overallOrder();

        // initialize components in the right order
        var pacc = Promise.resolve();
        for (let i = 0; i < loadOrder.length; i++) {
            let componentName = loadOrder[i];
            let component = this.get(componentName);
            if (typeof component.init === "function") {
                pacc = pacc.then(() => {
                    this.log.debug("initializing component:", componentName, "...");
                    let res = component.init();
                    // if (!(res instanceof Promise)) res = Promise.resolve(res);
                    return res;
                });
            }
        }

        return pacc;
    }

    shutdown() {
        // this.log.debug("shutdown");
    }
};