/// <reference path="typings/tsd.d.ts" />
"use strict";

// Unittests for use with nodeunit https://github.com/caolan/nodeunit

import nodeunit = require('nodeunit');
import fs = require('fs');
import path = require('path');
import child_process = require('child_process');
import shelljs = require('shelljs');

import generator = require('./generator');
import DojoDetailsInterface = require('./DojoDetailsInterface');

// Utility functions.

const DETAILS_FILENAME = 'data/details-1.10.json';
const details = readDetails(DETAILS_FILENAME);
const TMP_DIR = "target/tmp";
const HEADER_FILENAME = "header.d.ts";
const CODE_FILENAME = "code.ts";

// Clean tmp before each test.
export function setUp(callback: Function): void {
  if(shelljs.test('-e', TMP_DIR)) {
    shelljs.rm("-rf", TMP_DIR);
  }
  shelljs.mkdir(TMP_DIR);

  callback();
}

function readDetails(filename: string): DojoDetailsInterface.DojoDetailsInterface {
  const details: DojoDetailsInterface.DojoDetailsInterface = <DojoDetailsInterface.DojoDetailsInterface> JSON.parse(fs.readFileSync(filename, 'utf8'));
  return details;
}

function tsCompile(headerText: string, codeText: string): boolean {
  fs.writeFileSync(path.join(TMP_DIR, HEADER_FILENAME), headerText, { encoding: "utf8"});

  const completeCode = `/// <reference path="./${HEADER_FILENAME}" />\n${codeText}`;
  fs.writeFileSync(path.join(TMP_DIR, CODE_FILENAME), completeCode, { encoding: "utf8"});
  try {
    child_process.execSync(`tsc --target es6 --module commonjs --outDir ${TMP_DIR} ${path.join(TMP_DIR, CODE_FILENAME)}`);
  } catch(e) {
    console.log(formatChildProcessError(e));
    return false;
  }
  return true;
}

function formatChildProcessError(err: {stdout: Buffer[]}): string {
  return "Error:\n" + err.stdout.toString();
}

function compileTest(test: nodeunit.Test, ...moduleNames: string[]): void {
  var textDetails: DojoDetailsInterface.DojoDetailsInterface = {};
  
  moduleNames.forEach( (name) => {
    textDetails[name] = details[name];
  } );

  const importText = moduleNames.map( (name) => "import " + name.replace(/\//g,"_").replace(/\./g,"_") + " = require('" + name + "');\n" ).join("");
  const headerText = generator.formatAPI(textDetails);

  test.ok(tsCompile(headerText, importText));
  test.done();
}

//-------------------------------------------------------------------------
// Tests begin here.


// A simple compile test of a tiny part of the Dojo API.
export function testDojoString(test: nodeunit.Test): void {
  compileTest(test, "dojo/string");
}

export function testReturnTypePromise(test: nodeunit.Test): void {
  test.equal(generator.formatType("dojo/promise/Promise"), "dojo.promise.Promise");
  test.done();
}

export function testDojoRequest(test: nodeunit.Test): void {
  compileTest(test, "dojo/request", "dojo/request.__BaseOptions", "dojo/request.__MethodOptions",
    "dojo/request.__Options", "dojo/request.__Promise", "dojo/promise/Promise");
}