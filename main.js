#!/usr/bin/env node

import { execSync } from "child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import readline from "readline";
import { EventEmitter } from "events";

function logStep(message) {
    console.log(`👉 ${message}`);
}

function logSuccess(message) {
    console.log(`✅ ${message}`);
}

function logWarn(message) {
    console.warn(`⚠️ ${message}`);
}

function logError(message) {
    console.error(`❌ ${message}`);
}


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function createGitAndIgnore() {
    logStep("Initializing Git...");
    safeExec("git init", true);

    logStep("Creating .gitignore...");
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
    logSuccess("Git initialized and .gitignore created");
}

function readJson(filePath) {
    if (!existsSync(filePath)) return {};
    try {
        return JSON.parse(readFileSync(filePath, "utf8"));
    } catch (err) {
        logWarn(`Failed to parse ${filePath}, using empty object.`);
        return {};
    }
}

function safeExec(command, quiet = false) {
    try {
        execSync(command, { stdio: quiet ? "ignore" : "inherit" });
    } catch (err) {
        logError(`Command failed: ${command}`);
        process.exit(1);
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
            logWarn("Failed to parse existing tsconfig.json, using default.");
        }
    }

    writeJson(tsconfigPath, tsconfig);
    logSuccess("tsconfig.json ready");
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
    logSuccess("src/main.ts created");
}

function createProjectDir(projectName) {
    mkdirSync(projectName, { recursive: true });
    process.chdir(projectName);
    logSuccess(`Project directory '${projectName}' created and entered`);
}

function initNpm(useDefault) {
    logStep("Initializing npm...");
    safeExec(useDefault ? "npm init -y" : "npm init");
    logSuccess("npm initialized");
}

function setPackageModule() {
    logStep("Setting package type to module...");
    safeExec("npm pkg set type=module");
    logSuccess("Package type set to module");
}

function addPackageScripts() {
    logStep("Adding scripts to package.json...");
    const pkgPath = "package.json";
    const pkg = readJson(pkgPath);
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.dev = "nodemon";
    pkg.scripts.build = "tsc";
    pkg.scripts.start = "node dist/main.js";
    writeJson(pkgPath, pkg);
    logSuccess("Scripts added to package.json");
}

function configureNodemon() {
    logStep("Configuring nodemon.json...");
    writeJson("nodemon.json", {
        watch: ["src"],
        ext: "ts",
        exec: "node --loader ts-node/esm src/main.ts"
    });
    logSuccess("nodemon.json created");
}

function createProject() {
    const workflow = new EventEmitter();

    workflow.on("initialize-project", () => {
        rl.question("Enter project name (default: my-app): ", (name) => {
            const projectName = name.trim() || "my-app";
            createProjectDir(projectName);
            workflow.emit("use-default-npm-init", projectName);
        })
    });

    workflow.on("use-default-npm-init", (projectName) => {
        rl.question("Use default npm init? (Y/n): ", (answer) => {
            const useDefault = answer.trim().toLowerCase() !== "n";
            initNpm(useDefault);
            setPackageModule();
            workflow.emit("setup-tsconfig", projectName);
        })
    });

    workflow.on("setup-tsconfig", (projectName) => {
        setupTsConfig();
        rl.question("Enter port number (default: 3000): ", (port) => {
            const portNumber = port.trim() || 3000;
            createSrcMain(portNumber);
            workflow.emit("initialize-git", projectName);
        })
    });

    workflow.on("initialize-git", (projectName) => {
        createGitAndIgnore();
        workflow.emit("install-dependencies", projectName);
    });

    workflow.on("install-dependencies", (projectName) => {
        logStep("Installing dependencies...");
        safeExec("npm install express");
        safeExec("npm install -D typescript ts-node nodemon @types/node @types/express");
        logSuccess("Dependencies installed");
        workflow.emit("add-package-scripts", projectName);
    });

    workflow.on("add-package-scripts", (projectName) => {
        addPackageScripts();
        workflow.emit("configure-nodemon", projectName);
    });

    workflow.on("configure-nodemon", (projectName) => {
        configureNodemon();
        workflow.emit("finish", projectName);
    });

    workflow.on("finish", (projectName) => {
        logSuccess(`Project ${projectName} created!`);
        console.log(`
Run:
  cd ${projectName}
  npm run dev
  npm run build
  npm start
`);
        console.log("🎉 Project created successfully!");
        process.exit(0);
    });

    workflow.on("error", (err) => {
        logError(`Workflow failed: ${err.message}`);
        process.exit(1);
    });

    workflow.emit("initialize-project");
}

createProject();
