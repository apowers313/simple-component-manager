"use strict";

// these tests require being run as root

var ComponentDirector = require("../../index.js").ComponentDirector;
var assert = require("chai").assert;
var fs = require("fs");

// var expectedDirGid;
// switch (process.platform) {
//     case "linux":
//         expectedDirGid = 0;
//         break;
//     case "darwin":
//         expectedDirGid = 20;
//         break;
//     default:
//         throw new Error("unsupported platform");
// }

describe("root tests", function() {
    it("is running as root", function() {
        var myuid = process.getuid();
        var mygid = process.getgid();
        assert.strictEqual(myuid, 0);
        assert.strictEqual(mygid, 0);
    });

    it("chowns data directory", async function() {
        var myuid = process.getuid();
        var mygid = process.getgid();
        assert.strictEqual(myuid, 0);
        assert.strictEqual(mygid, 0);

        var config = {
            "setuid": 1, // 1 is daemon on both OSX and Ubuntu
            "setgid": 1,
            "dataDir": "./rootDataDir"
        };
        var cd = await ComponentDirector.start(config);

        myuid = process.getuid();
        mygid = process.getgid();
        assert.strictEqual(myuid, 1);
        assert.strictEqual(mygid, 1);

        // TODO check permissions on data directory
        var stat = fs.statSync("./rootDataDir");
        assert.strictEqual(stat.uid, 1);
        assert.strictEqual(stat.gid, 1);
    });
});
