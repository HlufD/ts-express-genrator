#!/usr/bin/env node

import { execSync } from "child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


/**
 * Initializes a new Git repository with a .gitignore file.
 * @returns {void}
 */

function createGitAndIgnore() {
    console.log("🔧 Initializing Git...");
    safeExec("git init");

    console.log("🔧 Creating .gitignore...");
    const gitignoreContent = `
# Node.js dependencies
node_modules/

# Build output
dist/

# Logs
logs/
*.log

# OS files
.DS_Store
Thumbs.db
`;
    writeFileSync(".gitignore", gitignoreContent.trim());
    console.log("✅ Git initialized and .gitignore created");
}

/**
 * Reads a JSON file from the file system.
 * If the file does not exist, returns an empty object.
 * If the file exists but cannot be parsed, logs a warning and returns an empty object.
 * @param {string} filePath - path to the file to read
 * @returns {object} parsed JSON object
 */

function readJson(filePath) {
    if (!existsSync(filePath)) return {};
    try {
        return JSON.parse(readFileSync(filePath, "utf8"));
    } catch (err) {
        console.warn(`⚠️ Failed to parse ${filePath}, using empty object.`);
        return {};
    }
}

/** 
 * Run a command with output piped to the main process, and exit 1 if the command fails.
 * @param {string} command - The command to run
 */

function safeExec(command) {
    try {
        execSync(command, { stdio: "inherit" });
    } catch (err) {
        console.error(`Command failed: ${command}`);
        process.exit(1);
    }
}


/**
 * Writes a JSON file to the file system.
 * @param {string} filePath - path to the file to write
 * @param {object} data - the JSON data to write
 */

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

/**
 * Sets up the tsconfig.json file.
 * If the file already exists, try to extend the existing configuration with the default values.
 * If the file does not exist, create a new one with the default values.
 * @returns {void}
 */

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


/**
 * Creates the main application entrypoint at src/main.ts.
 * @param {string | number} port - the port number to use for the server
 * @returns {void}
 */
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

/**
 * Creates a new directory for the project and enters it.
 * @param {string} projectName - the name of the project
 * @returns {void}
 */
function createProjectDir(projectName) {
    mkdirSync(projectName, { recursive: true });
    process.chdir(projectName);
    console.log(`📂 Project directory '${projectName}' created and entered`);
}


/**
 * Initializes a new npm project with default values or prompts the user to fill in the package details.
 * @param {boolean} useDefault - whether to use default values or not
 */

function initNpm(useDefault) {
    console.log("📦 Initializing npm...");
    safeExec(useDefault ? "npm init -y" : "npm init");
}


/**
 * Sets the "type" field of the package.json file to "module".
 * This enables ES module (ESM) support.
 * @returns {void}
 */

function setPackageModule() {
    console.log("⚙️ Setting package type to module...");
    safeExec("npm pkg set type=module");
}


/**
 * Adds npm scripts to the package.json file to run the project in development and production modes.
 * @returns {void}
 */
function addPackageScripts() {
    const pkgPath = "package.json";
    const pkg = readJson(pkgPath);
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.dev = "nodemon";
    pkg.scripts.build = "tsc";
    pkg.scripts.start = "node dist/main.js";
    writeJson(pkgPath, pkg);
    console.log("✅ Scripts added to package.json");
}


/**
 * Creates a new Express + TypeScript project from scratch.
 * @returns {void}
 */

function createProject() {
    rl.question("Enter project name (default: my-app): ", (name) => {
        const projectName = name.trim() || "my-app";

        rl.question("Use default npm init? (Y/n): ", (answer) => {
            const useDefault = answer.trim().toLowerCase() !== "n";

            mkdirSync(projectName, { recursive: true });
            process.chdir(projectName);

            safeExec(useDefault ? "npm init -y" : "npm init");

            safeExec("npm pkg set type=module");

            // Scripts
            const pkgPath = "package.json";
            const pkg = readJson(pkgPath);
            pkg.scripts = pkg.scripts || {};
            pkg.scripts.dev = "nodemon";
            pkg.scripts.build = "tsc";
            pkg.scripts.start = "node dist/main.js";
            writeJson(pkgPath, pkg);
            console.log("✅ Scripts added to package.json");

            // Initialize git and create .gitignore
            createGitAndIgnore();

            // Dependencies
            safeExec("npm install express");
            safeExec("npm install -D typescript ts-node nodemon @types/node @types/express");

            safeExec("npx tsc --init");
            setupTsConfig();

            // nodemon.json
            writeJson("nodemon.json", {
                watch: ["src"],
                ext: "ts",
                exec: "node --loader ts-node/esm src/main.ts"
            });

            rl.question("Enter port number (default: 3000): ", (portAnswer) => {
                const port = portAnswer.trim() || "3000";
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
try {

    createProject();
} catch (error) {
    console.log("[error]:", error.message);
}
