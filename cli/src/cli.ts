#!/usr/bin/env node
import chalk from "chalk";
import Table from "cli-table3";
import "dotenv/config";
import { readFileSync } from "fs";
import meow, { type Flag, type Result } from "meow";
import { dirname, join } from "path";
import semver from "semver";
import { fileURLToPath } from "url";
import { handleAddComponent } from "./commands/add/index.js";
import { getComponentList } from "./commands/add/utils.js";
import { handleInit } from "./commands/init.js";
import { handleUpdateComponent } from "./commands/update.js";
import { handleCreateApp } from "./commands/create-app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get current version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
);
const currentVersion = packageJson.version;

interface CLIFlags extends Record<string, any> {
  init?: Flag<"boolean", boolean>;
  legacyPeerDeps?: Flag<"boolean", boolean>;
  initGit?: Flag<"boolean", boolean>;
  version?: Flag<"boolean", boolean>;
}

// CLI setup
const cli = meow(
  `
  ${chalk.bold("Usage")}
    $ ${chalk.cyan("tambo")} ${chalk.yellow("<command>")} [options]

  ${chalk.bold("Commands")}
    ${chalk.yellow("init")}                Initialize tambo in a project and set up configuration
    ${chalk.yellow("add")}                 Add a new component
    ${chalk.yellow("update")}              Update an existing component from the registry
    ${chalk.yellow("full-send")}           Full initialization with auth flow and component installation
    ${chalk.yellow("create-app")}          Create a new tambo app from a template

  ${chalk.bold("Options")}
    ${chalk.yellow("--legacy-peer-deps")}  Install dependencies with --legacy-peer-deps flag
    ${chalk.yellow("--init-git")}          Initialize a new git repository after creating the app
    ${chalk.yellow("--version")}           Show version number

  ${chalk.bold("Examples")}
    $ ${chalk.cyan("tambo")} ${chalk.yellow("init")}
    $ ${chalk.cyan("tambo")} ${chalk.yellow("full-send")}
    $ ${chalk.cyan("tambo")} ${chalk.yellow("add <componentName>")}
    $ ${chalk.cyan("tambo")} ${chalk.yellow("update <componentName>")}
    $ ${chalk.cyan("tambo")} ${chalk.yellow("add <componentName> --legacy-peer-deps")}
    $ ${chalk.cyan("tambo")} ${chalk.yellow("update <componentName> --legacy-peer-deps")}
    $ ${chalk.cyan("tambo")} ${chalk.yellow("create-app <app-name> --init-git")}
    $ ${chalk.cyan("tambo")} ${chalk.yellow("create-app . --init-git")}
  `,
  {
    flags: {
      init: {
        type: "boolean",
        description: "Initialize tambo in a project",
      },
      legacyPeerDeps: {
        type: "boolean",
        description: "Install dependencies with --legacy-peer-deps flag",
      },
      initGit: {
        type: "boolean",
        description: "Initialize a new git repository after creating the app",
      },
    },
    importMeta: import.meta,
  },
);

// Check for latest version
async function checkLatestVersion() {
  try {
    const response = await fetch("https://registry.npmjs.org/tambo/latest");
    const data = await response.json();
    const latestVersion = data.version;

    if (!semver.gte(currentVersion, latestVersion)) {
      console.log(
        chalk.yellow(
          `\nA new version of tambo is available! (${latestVersion} > ${currentVersion})`,
        ),
      );
      console.log(
        chalk.blue(`To upgrade, run: ${chalk.cyan("npx tambo@latest")}\n`),
      );
    }
  } catch (_error) {
    // Silently fail version check
  }
}

// Command handlers
async function handleCommand(cmd: string, flags: Result<CLIFlags>["flags"]) {
  if (flags.version) {
    console.log(currentVersion);
    return;
  }

  if (cmd === "help" || !cmd) {
    console.log(cli.help);
    return;
  }

  if (cmd === "init" || cmd === "full-send") {
    await handleInit({
      fullSend: cmd === "full-send",
      legacyPeerDeps: Boolean(flags.legacyPeerDeps),
    });
    return;
  }

  if (cmd === "add") {
    const componentName = cli.input[1];
    if (!componentName) {
      console.error(chalk.red("Component name is required"));

      showComponentList();
      console.log(
        `Run ${chalk.cyan("tambo add <componentName>")} to add a new component`,
      );
      return;
    }
    await handleAddComponent(componentName, {
      legacyPeerDeps: Boolean(flags.legacyPeerDeps),
    });
    return;
  }

  if (cmd === "update") {
    const componentName = cli.input[1];
    if (!componentName) {
      console.error(chalk.red("Component name is required"));

      showComponentList();
      console.log(
        `Run ${chalk.cyan("tambo update <componentName>")} to update a component`,
      );
      return;
    }
    await handleUpdateComponent(componentName, {
      legacyPeerDeps: Boolean(flags.legacyPeerDeps),
    });
    return;
  }

  if (cmd === "create-app") {
    const appName = cli.input[1];
    if (!appName) {
      console.error(chalk.red("\nApp name is required\n"));
      console.log(
        `Run ${chalk.cyan("npx tambo create-app <app-name>")} or ${chalk.cyan("npx create-tambo-app@latest <app-name>")} to create a new app\n` +
          `Use ${chalk.cyan("npx tambo create-app .")} or ${chalk.cyan("npx create-tambo-app@latest .")} to create an app in the current directory\n\n` +
          `Add ${chalk.yellow("--init-git")} flag to initialize a git repository automatically\n`,
      );
      return;
    }
    await handleCreateApp(appName, {
      legacyPeerDeps: Boolean(flags.legacyPeerDeps),
      initGit: Boolean(flags.initGit),
    });
    return;
  }

  // If no command is provided, show help
  console.log(`Unrecognized command: ${chalk.red(cmd)}`);
  console.log(cli.help);
}

function showComponentList() {
  const components = getComponentList();
  components.sort((a, b) => a.name.localeCompare(b.name));
  console.log(chalk.bold("Available components:"));

  const table = new Table({
    head: ["Component", "Description"],
    colWidths: [
      Math.max(...getComponentList().map((c) => c.name.length)) + 2,
      process.stdout.columns -
        (Math.max(...getComponentList().map((c) => c.name.length)) + 5),
    ],
    wordWrap: true,
    chars: {
      top: "",
      "top-mid": "",
      "top-left": "",
      "top-right": "",
      bottom: "",
      "bottom-mid": "",
      "bottom-left": "",
      "bottom-right": "",
      left: "",
      "left-mid": "",
      mid: "",
      "mid-mid": "",
      right: "",
      "right-mid": "",
      middle: "│",
    },
    style: {
      head: ["cyan"],
      border: ["gray"],
    },
  });

  components.forEach((component) => {
    table.push([component.name, component.description]);
  });

  console.log(table.toString());
  console.log("\n");
}

// Main execution
async function main() {
  try {
    const command = cli.input[0];
    const flags = cli.flags;
    // Check for latest version before executing command
    await checkLatestVersion();

    await handleCommand(command, flags);
  } catch (error) {
    console.error(
      chalk.red("Error executing command:"),
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}
main();
