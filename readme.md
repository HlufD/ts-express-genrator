# 🚀 Express + TypeScript Project Generator

A simple CLI tool to bootstrap an **Express.js + TypeScript** project with sensible defaults.  
It sets up everything you need to start building right away: TypeScript config, nodemon, scripts, Git, and more.

## ✨ Features

- 📦 Initializes **npm** with customizable or default options
- ⚙️ Configures **TypeScript** (`tsconfig.json`) with strict settings
- 📝 Adds **scripts** to `package.json`:
  - `npm run dev` → Run with `nodemon`
  - `npm run build` → Compile with `tsc`
  - `npm start` → Run built app (`dist/main.js`)
- 🌐 Generates a `src/main.ts` entrypoint with a basic Express server
- 🔧 Initializes **Git** and creates a `.gitignore`
- 🔥 Installs required dependencies (`express`, `typescript`, `ts-node`, etc.)
- 👀 Configures **nodemon.json** for auto-reload
- 💻 Interactive setup (project name, npm init type, port number)

## 📥 Installation

`npm i -g tsxpress-generator`
