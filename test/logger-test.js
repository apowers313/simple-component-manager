"use strict";

var ComponentManager = require("../index.js").ComponentManager;
var DefaultLogger = require("../index.js").DefaultLogger;
var assert = require("chai").assert;
var sinon = require("sinon");

function alwaysTrue() {
    return true;
}

describe("default logger", function() {
    var cm;
    beforeEach(function() {
        cm = new ComponentManager();
        cm.registerType("test-type", alwaysTrue);
        cm.init();
    });

    afterEach(function() {
        cm.clear();
    });

    it("exists", function() {
        var logger = cm.get("logger");
        assert.instanceOf(logger, DefaultLogger);
    });

    it("can set level", function() {
        var logger = cm.get("logger");
        logger.config("set-level", "silent");
        assert.strictEqual(logger.debugLevel, 0);
        logger.config("set-level", "error");
        assert.strictEqual(logger.debugLevel, 1);
        logger.config("set-level", 4);
        assert.strictEqual(logger.debugLevel, 4);
    });

    it("errors on bad set levels", function() {
        var logger = cm.get("logger");
        assert.throws(function() {
            logger.config("set-level", "foo");
        }, TypeError, /unknown level while configuring levels:/);
        assert.throws(function() {
            logger.config("set-level", "");
        }, TypeError, /unknown level while configuring levels:/);
        assert.throws(function() {
            logger.config("set-level", -1);
        }, TypeError, /unknown level while configuring levels:/);
        assert.throws(function() {
            logger.config("set-level", 8);
        }, TypeError, /unknown level while configuring levels:/);
    });

    it("can get level", function() {
        var logger = cm.get("logger");
        var lvl;
        // default
        lvl = logger.config("get-level");
        assert.strictEqual(lvl, "debug");

        // error level
        logger.config("set-level", "error");
        lvl = logger.config("get-level");
        assert.strictEqual(lvl, "error");

        // silent level
        logger.config("set-level", 0);
        lvl = logger.config("get-level");
        assert.strictEqual(lvl, "silent");
    });
});

describe("default logger messages", function() {
    var cm;
    var log;
    var spy;
    beforeEach(function() {
        cm = new ComponentManager();
        cm.registerType("test-type", alwaysTrue);
        cm.init();
        log = cm.get("logger");
        spy = sinon.spy(console, "log");
    });
    afterEach(function() {
        cm.clear();
        console.log.restore();
    });

    it("catches right levels", function() {
        log.config("set-level", "error");
        log.error("something bad");
        assert(spy.calledOnce, "one message");
        assert(spy.calledWith("unknown:", "!!! ERROR:", "something bad"), "message format");
        log.warn("will robinson");
        assert(spy.calledOnce, "still one message");
    });

    it("error", function() {
        log.error("something bad");
        assert(spy.calledOnce, "one message");
        assert(spy.calledWith("unknown:", "!!! ERROR:", "something bad"), "message format");
    });

    it("warn", function() {
        log.warn("will robinson");
        assert(spy.calledOnce, "one message");
        assert(spy.calledWith("unknown:", "! WARNING:", "will robinson"), "message format");
    });

    it("info", function() {
        log.info("info test");
        assert(spy.calledOnce, "one message");
        assert(spy.calledWith("unknown:", "info test"), "message format");
    });

    it("verbose", function() {
        log.verbose("verbose test");
        assert(spy.calledOnce, "one message");
        assert(spy.calledWith("unknown:", "verbose test"), "message format");
    });

    it("debug", function() {
        log.debug("debug test");
        assert(spy.calledOnce, "one message");
        assert(spy.calledWith("unknown:", "debug test"), "message format");
    });

    it("silly", function() {
        log.config("set-level", "silly");
        log.silly("silly test");
        assert(spy.calledOnce, "one message");
        assert(spy.calledWith("unknown:", "silly test"), "message format");
    });

    it("silent", function() {
        log.config("set-level", "silent");
        log.error("test");
        log.warn("test");
        log.info("test");
        log.verbose("test");
        log.debug("test");
        log.silly("test");
        assert(spy.notCalled, "not called during silent");
    });
});