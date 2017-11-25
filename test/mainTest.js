var ServerFramework = require("../index.js");
var assert = require("chai").assert;
var sinon = require("sinon");

describe("comms", function() {
    it("can register", function() {
        var sf = new ServerFramework();
        var commModule = {};
        sf.registerComm("test-comm", commModule);
    });

    it("errors when registering without module", function() {
        var sf = new ServerFramework();
        assert.throws(function() {
            sf.registerComm("test-comm");
        }, TypeError);
    });

    it("errors when registering without module name", function() {
        var sf = new ServerFramework();
        var commModule = {};
        assert.throws(function() {
            sf.registerComm(3, commModule);
        }, TypeError);
    });

    it("can get comms", function() {
        var sf = new ServerFramework();
        var commModule = {};
        sf.registerComm("test-comm", commModule);
        var comm = sf.getComm("test-comm");
        assert.isObject(comm);
    });

    it("errors when comm name not specified during get", function() {
        var sf = new ServerFramework();
        var commModule = {};
        sf.registerComm("test-comm", commModule);
        assert.throws(function() {
            sf.getComm();
        }, TypeError);
    });

    it("returns undefined when not found", function() {
        var sf = new ServerFramework();
        var comm = sf.getComm("foo");
        assert.isUndefined(comm);
    });

    it("can configure comm", function() {
        var sf = new ServerFramework();
        var spy = sinon.spy();
        var commModule = {
            config: spy
        };
        sf.registerComm("test-comm", commModule);
        sf.configureComm("test-comm", "feature", true);
        assert(spy.called);
        assert.strictEqual(spy.getCall(0).args[0], "feature");
        assert.strictEqual(spy.getCall(0).args[1], true);
    });

    it("config errors when missing feature", function() {
        var sf = new ServerFramework();
        var commModule = {
            config: function() {}
        };
        sf.registerComm("test-comm", commModule);
        assert.throws(function() {
            sf.configureComm("test-comm");
        }, TypeError);
    });

    it("config errors when missing comm name", function() {
        var sf = new ServerFramework();
        var commModule = {
            config: function() {}
        };
        sf.registerComm("test-comm", commModule);
        assert.throws(function() {
            sf.configureComm(3, "feature", true);
        }, TypeError);
    });

    it("config errors when configuring missing comm", function() {
        var sf = new ServerFramework();
        assert.throws(function() {
            sf.configureComm("foo", "feature", true);
        }, TypeError);
    });

    it("config errors module doesn't allow configuration", function() {
        var sf = new ServerFramework();
        var commModule = {};
        sf.registerComm("test-comm", commModule);
        assert.throws(function() {
            sf.configureComm("test-comm", "feature", true);
        }, Error);
    });
});

describe("worker", function() {
    it("can register worker type", function() {
        var sf = new ServerFramework();
        sf.registerWorkerType("worker-type", function() {});
    });

    it("errors when worker type missing function", function() {
        var sf = new ServerFramework();
        assert.throws(function() {
            sf.registerWorkerType("worker-type");
        }, TypeError);
    });

    it("errors when worker type missing function", function() {
        var sf = new ServerFramework();
        assert.throws(function() {
            sf.registerWorkerType("worker-type");
        }, TypeError);
    });

    it("can get worker type");

    it("can register worker", function() {
        var sf = new ServerFramework();
        sf.registerWorker("test-worker", "worker-type", {});
    });

    it("errors when registering without module", function() {
        var sf = new ServerFramework();
        assert.throws(function() {
            sf.registerWorker("test-worker");
        }, TypeError);
    });

    it("errors when registering without module name", function() {
        var sf = new ServerFramework();
        assert.throws(function() {
            sf.registerWorker(3, {});
        }, TypeError);
    });

    it("can get", function() {
        var sf = new ServerFramework();
        sf.registerWorker("test-worker", {});
        var worker = sf.getWorker("test-worker");
        assert.isObject(worker);
    });

    it("errors when worker name not specified during get", function() {
        var sf = new ServerFramework();
        sf.registerWorker("test-worker", {});
        assert.throws(function() {
            sf.getWorker();
        }, TypeError);
    });

    it("returns undefined when not found", function() {
        var sf = new ServerFramework();
        var worker = sf.getWorker("foo");
        assert.isUndefined(worker);
    });

    it("can configure", function() {
        var sf = new ServerFramework();
        var spy = sinon.spy();
        var workerModule = {
            config: spy
        };
        sf.registerWorker("test-worker", workerModule);
        sf.configureWorker("test-worker", "feature", true);
        assert(spy.called);
        assert.strictEqual(spy.getCall(0).args[0], "feature");
        assert.strictEqual(spy.getCall(0).args[1], true);
    });

    it("config errors when missing feature", function() {
        var sf = new ServerFramework();
        var workerModule = {
            config: function() {}
        };
        sf.registerWorker("test-worker", workerModule);
        assert.throws(function() {
            sf.configureWorker("test-worker");
        }, TypeError);
    });

    it("config errors when missing worker name", function() {
        var sf = new ServerFramework();
        var workerModule = {
            config: function() {}
        };
        sf.registerWorker("test-worker", workerModule);
        assert.throws(function() {
            sf.configureWorker(3, "feature", true);
        }, TypeError);
    });

    it("config errors when configuring missing worker", function() {
        var sf = new ServerFramework();
        assert.throws(function() {
            sf.configureWorker("foo", "feature", true);
        }, TypeError);
    });

    it("config errors module doesn't allow configuration", function() {
        var sf = new ServerFramework();
        sf.registerWorker("test-worker", {});
        assert.throws(function() {
            sf.configureWorker("test-worker", "feature", true);
        }, Error);
    });
});

describe("logger", function() {

});

describe("init", function() {
    it("can init", function() {
        var sf = new ServerFramework();
        sf.init();
    });

    it("can shutdown", function() {
        var sf = new ServerFramework();
        sf.shutdown();
    });

    it("inits comm");
    it("inits worker");
    it("inits worker before comm");
});