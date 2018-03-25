"use strict";

var ComponentManager = require("../index.js").ComponentManager;
var assert = require("chai").assert;

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
        function foo(a, b, c) {}
        cm.registerType("test-type", foo);
        var f = cm.getType("test-type");
        assert.strictEqual(f, foo);
        assert.strictEqual(f.length, 3);
        assert.strictEqual(f.name, "foo");
    });

    it("validates registered component");
});
