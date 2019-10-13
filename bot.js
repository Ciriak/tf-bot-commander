const fs = require("fs-extra");
const path = require('path');
const cp = require("child_process");
console.log("Launching tf2 bot...");

const defaultConfig = require("./config.default.json");

let logCursorLine = 0;


let config = defaultConfig;
loadConfig();
const tfDir = path.normalize(config.TFFolder);

checkTf2Dir();
cleanOldLogs();
checkBotFile();
const commands = checkCommandsFile();
const template = loadTemplate();
launchTF2();

// wait 20 before launching the watcher (time for the game to load)
console.log("The watcher will start in 20 seconds...")
setTimeout(() => {
    startWatcher();
})

function loadConfig() {
    try {
        const configFile = require("./config.json");
        for (const propertie in configFile) {
            if (configFile.hasOwnProperty(propertie)) {
                const value = configFile[propertie];
                //override config propertie
                if (typeof config[propertie] !== "undefined") {
                    config[propertie] = value;
                }
            }
        }
        console.log("Config loaded");
    } catch (error) {
        console.warn("Config file not found, using default...");

    }
}

function loadTemplate() {
    try {
        const templateFile = fs.readFileSync("./botexec.template.cfg");
        return templateFile;
    } catch (error) {
        console.warn("Unable to load the template file");
        process.exit(1);
    }
}

function checkTf2Dir() {
    try {
        const exist = fs.existsSync(tfDir);
        if (!exist) {
            throw ("No folder found at " + tfDir)
        }
        console.log("Team fortress 2 folder located at : " + tfDir);
    } catch (error) {
        console.error(error);
        console.error("Unable to find the Team Fortress 2 folder at " + path.normalize(config.TFFolder));
        process.exit(1);
    }
}

function checkBotFile() {
    // ensure that the bot cfg file exists
    try {
        fs.readFileSync(path.join(tfDir, "tf", "cfg", "bot.cfg"));
        console.log("Bot file loaded");

    } catch (error) {
        console.error(error);
        console.error("\n\nThe bot file is not present in the 'cfg' folder \nPlease ensure that you copied the file  '/cfg/bot.cfg' into the folder '" + tfDir + "/tf/cfg'\n\n");
        process.exit(1);
    }

    // ensure that the bot cfg file will be loaded
    try {
        const execData = fs.readFileSync(path.join(tfDir, "tf", "cfg", "autoexec.cfg"));

        if (execData.indexOf("exec bot") === -1) {
            throw "\n\nThe line 'exec bot' is not present into the autoexec.cfg file\nPlease be sure to add it\n\n";
        }

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

function checkCommandsFile() {
    try {
        const commands = fs.readJsonSync("./commands.json");
        console.log("Commands loaded");
        return commands;
    } catch (error) {
        console.error(error);
        console.error("\n\n Failed to load the commands");
        process.exit(1);
    }
}

function cleanOldLogs() {
    try {
        fs.removeSync(path.join(tfDir, "tf", "botLog.log"));
        console.log("Old logs cleaned");
    } catch (error) {
        console.log(error);
        console.warn("\n\nFailed to clean the old log file\nPlease be sure that the game is not running");
    }
}

function launchTF2() {
    console.log("Launching Team Fortress 2...");
    cp.exec("start steam://rungameid/440");
}

function startWatcher() {
    setInterval(() => {
        const logFile = path.join(tfDir, "tf", "botlog.log");
        const rawLog = fs.readFileSync(logFile, {
            encoding: "utf-8"
        });

        const log = rawLog.split("\n");
        const startLine = logCursorLine;

        for (let line = startLine; line < log.length; line++) {
            const lineText = log[line];
            if (!log[line]) {
                break;
            }


            // if we detect a command
            if (lineText.indexOf(config.masterSteamUserName + " : ") > -1) {
                logCursorLine = line + 1;
                parseMasterLine(lineText);
                break;
            }
        }

    }, config.watcherDelay * 1000);
}

function parseMasterLine(line) {
    const commandStr = line.replace(config.masterSteamUserName + " : ", "");

    //check all commands
    for (const command in commands) {
        if (commands.hasOwnProperty(command)) {
            const commandObject = commands[command];
            // if a command match
            if (commandStr.indexOf(command) > -1) {
                console.log("Command '" + command + "' from '" + config.masterSteamUserName + "'");
            }
        }
    }

}