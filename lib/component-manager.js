"use strict";

const DepGraph = require("dependency-graph").DepGraph;
const DefaultLogger = require("component-logger-console");
const fs = require("fs");
const path = require("path");

var componentList = new Map();
var typeList = new Map();

/**
 * A component manager is a collection of components.
 * The ComponentManager is responsible for managing their lifecycle.
 * @class
 */
module.exports = class ComponentManager {
    constructor() {
        this.componentList = componentList;
        this.typeList = typeList;
        this.logger = null;
        this.settings = {};

        // retister default types
        require("./types")(this); // eslint-disable-line global-require
    }

    /**
     * Registers a new type
     * @param  {String} typeName     The name of the new type to register
     * @param  {Function} validationFn The function that will be used to validate components that claim to be this type
     */
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

    /**
     * Looks up a type by its name
     * @param  {String} typeName The name of the type to be retreived
     * @return {Object}          The type Object that was found, or undefined if no matching type was found
     */
    getType(typeName) {
        if (typeof typeName !== "string") {
            throw new TypeError("expected 'typeName' to be string; got " + typeof typeName);
        }

        return this.typeList.get(typeName);
    }

    /**
     * Registers a new component
     * @param  {String} name       [description]
     * @param  {String} type       [description]
     * @param  {Object|Function} objectOrFn [description]
     * @throws {TypeError} If any parameters were of the wrong type
     * @throws {Error} If the specified type was not found, or the objectOrFn was not of the right type
     */
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

    /**
     * Gets a component by its name
     * @param  {String} name The name of the component to retreive
     * @return {Object|Function}      The compontent Object or Function, or undefined if the component was not found
     */
    get(name) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }

        return this.componentList.get(name);
    }

    // TODO: getByType()

    /**
     * Removes all components and types
     */
    clear() {
        componentList.clear();
        typeList.clear();
    }

    /**
     * Sets the directory that components should use for storing data.
     * Path will be resolved to a real path with no symbolic links.
     * @param {String} dir The directory that will be used for storing data
     * @throws {TypeError} If the dir parameter is not a string
     * @throws {Error} If the directory does not exist
     */
    setDataDir(dir) {
        if (typeof dir !== "string") {
            throw new TypeError("expected 'dir' to be string, got " + typeof dir);
        }

        this.dataDir = fs.realpathSync(path.resolve(dir));
    }

    /**
     * Configures the named component. The behavior of this is largely defined by the component that
     * and the feature of that component that is being configured.
     * @param  {String} name    The name of the component to configure
     * @param  {String} feature The feature of the component to configure
     * @param  {Any} [value]   The specified value for the feature, or `undefined` if not needed
     * @return {Any}         The value returned by the feature that was configured.
     */
    config(name, feature, value) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }

        if (typeof feature !== "string") {
            throw new TypeError("expected 'feature' to be string; got " + typeof feature);
        }

        var component = this.get(name);
        // console.log("component", component);
        if (component === undefined) {
            throw new TypeError(name + " is not a valid component name");
        }

        if (typeof component.config !== "function") {
            throw new Error("configuration of '" + name + "' not allowed");
        }

        if (typeof component.features === "function") {
            let featureList = component.features();
            // console.log("featureList", featureList);
            if (!featureList || featureList.filter((f) => f.name === feature).length !== 1) {
                throw new TypeError("feature not found for component: " + feature);
            }
        }

        return component.config(feature, value);
    }

    /**
     * Initializes all registered components
     * @return {Promise<undefined>} A Promise that resolves when all the component initializations have completed
     */
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

    /**
     * In theory this shuts down components
     * @todo Not implemented
     */
    shutdown() {
        // this.log.debug("shutdown");
    }
};
