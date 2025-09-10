#!/usr/bin/env node

import { execSync } from "child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


function readJson(filePath) {
    if (!existsSync(filePath)) return {};
    try {
        return JSON.parse(readFileSync(filePath, "utf8"));
    } catch (err) {
        console.warn(`⚠️ Failed to parse ${filePath}, using empty object.`);
        return {};
    }
}

function writeJson(filePath, data) {
    writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function removeJsonComments(jsonString) {
    return jsonString
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .trim();
}

function setupTsConfig() {
    const tsconfigPath = "tsconfig.json";

    let tsconfig = {
        compilerOptions: {
            module: "ESNext",
            target: "ES2020",
            outDir: "dist",
            rootDir: "src",
            strict: true,
            esModuleInterop: true,
            moduleResolution: "node"
        },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"]
    };

    if (existsSync(tsconfigPath)) {
        try {
            const content = readFileSync(tsconfigPath, "utf8");
            const cleanJson = removeJsonComments(content);
            const parsed = JSON.parse(cleanJson);
            tsconfig.compilerOptions = { ...parsed.compilerOptions, ...tsconfig.compilerOptions };
        } catch {
            console.warn("⚠️ Failed to parse existing tsconfig.json, using default.");
        }
    }

    writeJson(tsconfigPath, tsconfig);
    console.log("✅ tsconfig.json ready");
}

function createSrcMain(port) {
    mkdirSync("src", { recursive: true });
    writeFileSync("src/main.ts", `
import express from "express";
import type { Request, Response } from "express";

const app = express();
const port = process.env.PORT || ${port};

app.get("/", (req: Request, res: Response) => {
    res.send("Hello, TypeScript + Express!");
});

app.listen(port, () => {
    console.log(\`Server running at http://localhost:\${port}\`);
});
`);
}

function createProject() {
    rl.question("Enter project name (default: my-app): ", (name) => {
        const projectName = name.trim() || "my-app";

        rl.question("Use default npm init? (Y/n): ", (answer) => {
            const useDefault = answer.trim().toLowerCase() !== "n";

            rl.question("Enter port number (default: 3000): ", (portAnswer) => {
                const port = portAnswer.trim() || "3000";

                mkdirSync(projectName, { recursive: true });
                process.chdir(projectName);

                execSync(useDefault ? "npm init -y" : "npm init", { stdio: "inherit" });

                execSync("npm pkg set type=module", { stdio: "inherit" });

                // Scripts
                const pkgPath = "package.json";
                const pkg = readJson(pkgPath);
                pkg.scripts = pkg.scripts || {};
                pkg.scripts.dev = "nodemon";
                pkg.scripts.build = "tsc";
                pkg.scripts.start = "node dist/main.js";
                writeJson(pkgPath, pkg);
                console.log("✅ Scripts added to package.json");

                // Dependencies
                execSync("npm install express", { stdio: "inherit" });
                execSync("npm install -D typescript ts-node nodemon @types/node @types/express", { stdio: "inherit" });

                execSync("npx tsc --init", { stdio: "inherit" });
                setupTsConfig();

                // nodemon.json
                writeJson("nodemon.json", {
                    watch: ["src"],
                    ext: "ts",
                    exec: "node --loader ts-node/esm src/main.ts"
                });

                // src/main.ts
                createSrcMain(port);

                console.log(`✅ Project ${projectName} created!
Run:
cd ${projectName}
npm run dev
npm run build
npm start`);

                rl.close();
            });
        });
    });
}

createProject();
