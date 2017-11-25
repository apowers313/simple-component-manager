module.exports = class ServerFramework {
    constructor() {
        this.commList = new Map();
        this.workerList = new Map();
        this.workerTypeList = new Map();
        // this.registerWorkerType("logger", function(obj) {
        //     return true;
        // });
        this.logger = null;
    }

    registerWorker(name, type, object) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }

        if (typeof type !== "string") {
            throw new TypeError("expected 'type' to be string; got " + typeof type);
        }

        if (typeof object !== "object") {
            throw new TypeError("expected 'object' to be object; got " + typeof object);
        }

        var workerTypeValidator = this.getWorkerType(type);
        if (workerTypeValidator === undefined) {
            throw new Error("unknown worker type: " + type);
        }

        if (!workerTypeValidator(object)) {
            throw new Error("object is not a valid " + type);
        }

        this.workerList.set(name, object);
    }

    getWorker(name) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }

        return this.workerList.get(name);
    }

    configureWorker(name, feature, object) {}

    registerWorkerType(typeName, validationFn) {
        if (typeof typeName !== "string") {
            throw new TypeError("expected 'typeName' to be string; got " + typeof typeName);
        }

        if (typeof validationFn !== "function") {
            throw new TypeError("expected 'validationFn' to be function; got " + typeof validationFn);
        }

        this.workerTypeList.set(typeName, validationFn);
    }

    getWorkerType(typeName) {
        if (typeof typeName !== "string") {
            throw new TypeError("expected 'typeName' to be string; got " + typeof typeName);
        }

        return this.workerTypeList.get(typeName);
    }

    registerLogger(object) {
        this.logger = object;
        return this.registerWorker("logger", "logger", object);
    }

    getLogger() {
        return this.getWorker("logger");
    }

    configureLogger(feature, value) {
        return this.configureWorker("logger", feature, value);
    }

    registerComm(name, object) {
        this.registerModule(this.commList, name, object);
    }

    getComm(name) {
        return this.getModule(this.commList, name);
    }

    configureComm(name, feature, value) {
        return this.configureModule(this.getComm, name, feature, value);
    }

    registerModule(list, name, object) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }

        if (typeof object !== "object") {
            throw new TypeError("expected 'object' to be object; got " + typeof object);
        }

        list.set(name, object);
    }

    getModule(list, name) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }

        return list.get(name);
    }

    getModuleFeatures() {}

    configureModule(fetcher, name, feature, value) {
        if (typeof name !== "string") {
            throw new TypeError("expected 'name' to be string; got " + typeof name);
        }

        if (typeof feature !== "string") {
            throw new TypeError("expected 'feature' to be string; got " + typeof feature);
        }

        var comm = this.getComm(name);
        if (comm === undefined) {
            throw new TypeError(name + " is not a valid comm name");
        }

        if (typeof comm.config !== "function") {
            throw new Error("configuration of '" + name + "' not allowed");
        }

        comm.config(feature, value);
    }

    init() {
        console.log("server-framework init");
    }

    shutdown() {
        console.log("server-framework shutdown");
    }
};