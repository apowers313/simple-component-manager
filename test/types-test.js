"use strict";

var ComponentManager = require("../index.js").ComponentManager;
var Component = require("../index.js").Component;
var DefaultLogger = require("../index.js").DefaultLogger;
var ComponentDirector = require("../index.js").ComponentDirector;
var assert = require("chai").assert;
var sinon = require("sinon");

function alwaysTrue() {
    return true;
}

describe("types", function() {
    var cm;
    beforeEach(function() {
        cm = new ComponentManager();
        cm.clear();
    });

    it("can be registered", function() {
        cm.registerType("test-type", function() {});
    });

    it("can be found", function() {
        function foo(a, b, c) {}; // jshint ignore:line
        cm.registerType("test-type", foo);
        var f = cm.getType("test-type");
        assert.strictEqual(f, foo);
        assert.strictEqual(f.length, 3);
        assert.strictEqual(f.name, "foo");
    });

    it("validates registered component");
});