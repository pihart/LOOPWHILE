#!/usr/bin/env node

const fs = require("fs");
const transpile = require("./transpiler");

const transpileFile = (fileName, destinationFileName) => {
    const program = fs.readFileSync(fileName).toString();
    fs.writeFile(destinationFileName || fileName.replace(".loop", ".transpiled.loop").replace(".while", ".transpiled.while"),
        transpile(program).join("\n"), console.log);
}

transpileFile(process.argv[2], process.argv[3]);
