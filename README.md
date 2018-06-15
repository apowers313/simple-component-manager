[![Build Status](https://travis-ci.org/apowers313/simple-component-manager.svg?branch=master)](https://travis-ci.org/apowers313/simple-component-manager) [![Coverage Status](https://coveralls.io/repos/github/apowers313/simple-component-manager/badge.svg)](https://coveralls.io/github/apowers313/simple-component-manager)

[![Waffle.io - Columns and their card count](https://badge.waffle.io/apowers313/simple-component-manager.svg?columns=all)](https://waffle.io/apowers313/simple-component-manager)

Allows you to create software components that you can register 

## Install

``` bash
npm install scm
```

## Using

Define a `scm-config.json` file and run `scm` from the command line (or a boot script).

Some initial documentation can be found [here](https://apowers313.github.io/simple-component-manager).

## About

Simple Component Manager (SCM) is an [Inversion of Control](https://en.wikipedia.org/wiki/Inversion_of_control) framework for node.js that enables late binding through service locator injection and generic-type injection.

Whew. That's a mouthfull. What does it actually mean?

Normally you have to do includes in node.js using `require()`. If I want to use a database, I have to decide whether I want to `require("mongodb")` or `require("mysql")` when I'm writing my code. And if I want to give the user the choice, I have to write some logic around that and include all the options the user might want to use.

SCM turns that upside-down. Rather than doing `require()` you define `components`, such as a database component and register them with the `ComponentManager` (typically things are registered automatically through the `scm-config.json`). Things that use databases could then call `ComponentManager.get("database")` and then use the database withouth caring which database is underneath.

This is great for databases, loggers, communication protocols, etc. where there are so many choices, so many religions, and no right answers that the only solution is to offer flexibility.

## scm-config.json

The `scm-config.json` can be located in the local directory, or globally in `/etc/scm`.

The most important section of the `scm-config.json` is the components list, which says which components are needed. Each component object in the list has a `name`, a `type`, a `package` and optionally `pre-config` and `post-config` settings. Here is an example of a single component declaration:

``` json
{
    "name": "http",
    "type": "generic",
    "package": "component-web",
    "pre-config": [{
        "set-port": 8888
    }]
}
```

This component declares that it is using the [component-web](https://github.com/apowers313/component-web) component, which we will name "http" (that's the name other components will use to find it). It will install the `npm` package `component-web` (any [valid package name](https://docs.npmjs.com/cli/install) should work, including `package@version` and `/path/to/a/package`). Before the `init()` function of the component is called, the `pre-config` says that we should call `set-port` with `8888`.

Here is an example of a full `scm-config.json`.

``` js
// scm-config
//
// this is a JSON file that allows JavaScript-style comments
{
    // setuid and setgid are only required if running with sudo
    // you can delete these lines and run without sudo if your http/https ports don't require special privledges
    // "setuid": 1,
    // "setgid": 1,
    "components": [{
        "name": "http",
        "type": "generic",
        "package": "component-web",
        "pre-config": [{
            "set-port": 8888
        }],
        "post-config": [{
            "set-redirect": {
                "destProtocol": "https",
                "destPort": 8443,
                "destTemporary": false
            }
        }]
    }, {
        "name": "https",
        "type": "generic",
        "package": "component-web",
        "pre-config": [{
            "set-port": 8443,
            "set-https": true,
            "set-domain": "localhost",
            "set-body-parser": "json",
            "set-enable-session": true
        }, { // demo UI for WebAuthn
            "add-static": {
                "path": "/",
                "dir": "webauthn-yubiclone"
            }
        }, { // serve up swagger UI
            "add-static": {
                "path": "/swagger",
                "dir": "fido2-swagger"
            }
        }]
    }, {
        "name": "cert-manager",
        "type": "generic",
        "package": "component-certs-static",
        "pre-config": [{
            "set-cert-file": "data/node_modules/component-certs-static/test/helpers/certs/cert.pem",
            "set-key-file": "data/node_modules/component-certs-static/test/helpers/certs/key.pem"
        }]
    }, {
        "name": "fido2",
        "type": "generic",
        "package": "/Users/apowers/Projects/fido2-stack/component-fido2",
        "pre-config": [{
            "enable-dangerous-open-registration": true,
            "enable-dangerous-xmit-debug-info": true,
            "set-service-name": "WebAuthn.org"
        }]
    }, {
        "name": "uds",
        "type": "generic",
        "package": "/Users/apowers/Projects/components/component-uds-json"
    }, {
        "name": "logger",
        "type": "logger",
        "package": "component-logger-winston",
        "pre-config": [{
            "set-level": "silly",
            "add-transport": [{
                // log to the screen...
                "type": "console",
                "colorize": true
            }, {
                // ...and log to a file
                // see winston's npm page for more transport configuration options
                "type": "file",
                "filename": "scm.log"
            }]
        }]
    }]
}
```

## Custom Components

You can define your own components, which can be really anything (even plain-ole Objects or Functions). For convenience functions, you can use the [component-class](https://github.com/apowers313/component-class) which also includes a [template](https://github.com/apowers313/component-class/blob/master/template/template.js) that shows how to use other components.
