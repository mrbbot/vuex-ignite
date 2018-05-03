const resolve = require("rollup-plugin-node-resolve");
const babel = require("rollup-plugin-babel");
const { name, version, author } = require("../package");
const fs = require("fs");
const camelCase = require("lodash/camelCase");
const upperFirst = require("lodash/upperFirst");
const uglify = require("uglify-es");
const rollup = require("rollup").rollup;
const chalk  = require("chalk");
const niceName = upperFirst(camelCase(name));

const banner = `/*!
 * ${niceName} v${version}
 * Copyright (c) ${new Date().getFullYear()} ${author}
 * Licensed under the MIT license.
 */\n`;

const outputConfigs = [
    {
        file: `${name}`,
        format: "umd",
        name: niceName
    },
    {
        file: `${name}.esm`,
        format: "es"
    },
    {
        file: `${name}.common`,
        format: "cjs"
    },
    {
        file: `${name}.min`,
        format: "umd",
        name: niceName,
        min: true
    }
];

function writeFile(path, data, longestPath='') {
    return new Promise(((resolve, reject) => {
        fs.writeFile(path, data, err => {
            if(err) {
                reject(err);
            } else {
                let spaces = '';
                for(let i = 0; i <= longestPath.length - path.length; i++) spaces += ' ';
                // noinspection JSUnresolvedFunction
                console.log(`${chalk.blue(path)}${spaces}${chalk.green(`${(data.length / 1024).toFixed(2)}KB`)}`);
                resolve();
            }
        });
    }));
}

let longestPath = '';
for(let outputConfig of outputConfigs) {
    if(outputConfig.file.length > longestPath.length) {
        longestPath = outputConfig.file;
    }
}
longestPath = `dist/${longestPath}.js`;

async function build() {
    const bundle = await rollup({
        input: "src/main.js",
        plugins: [
            resolve(),
            babel({
                exclude: 'node_modules/**'
            })
        ]
    });

    for(let outputConfig of outputConfigs) {
        outputConfig.file = `dist/${outputConfig.file}.js`;
        outputConfig.banner = banner;

        let { code } = await bundle.generate(outputConfig);
        if(outputConfig.min) {
            // noinspection JSUnresolvedFunction
            code = uglify.minify(code).code;
        }

        await writeFile(outputConfig.file, code, longestPath);
    }
}

// noinspection JSIgnoredPromiseFromCall
build();