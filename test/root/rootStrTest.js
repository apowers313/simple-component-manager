"use strict";

// these tests require being run as root

var ComponentDirector = require("../../index.js").ComponentDirector;
var assert = require("chai").assert;

describe("root tests", function() {
    it("is running as root", function() {
        var myuid = process.getuid();
        var mygid = process.getgid();
        assert.strictEqual(myuid, 0);
        assert.strictEqual(mygid, 0);
    });

    it("changes permissions with strings", async function() {
        var myuid = process.getuid();
        var mygid = process.getgid();
        assert.strictEqual(myuid, 0);
        assert.strictEqual(mygid, 0);

        var config = {
            "setuid": "daemon", // 1 is daemon on both OSX and Ubuntu
            "setgid": "daemon"
        };
        var cd = await ComponentDirector.start(config);

        assert.strictEqual(cd.setuid, "daemon");
        assert.strictEqual(cd.setgid, "daemon");

        myuid = process.getuid();
        mygid = process.getgid();
        assert.strictEqual(myuid, 1);
        assert.strictEqual(mygid, 1);
    });
});
