const fs = require("fs-extra");
const path = require('path');
const cp = require("child_process");
console.log("Launching tf2 bot...");

const defaultConfig = require("./config.default.json");

let logCursorLine = 0;
let logIsClean = false;
let processCommands = {};

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
/**
 * Load the user config
 */
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
/**
 * 
 */
function loadTemplate() {
    try {
        const templateFile = fs.readFileSync("./botexec.template.cfg");
        return templateFile;
    } catch (error) {
        console.warn("Unable to load the template file");
        process.exit(1);
    }
}
/**
 * Check the tealm fortress 2 directory
 */
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
/**
 * Check if the bot file is here and will be loaded by the game
 */
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
/**
 * Check if the commands file is here
 */
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

/**
 * Try to clean the old log file
 */
function cleanOldLogs() {
    try {
        fs.removeSync(path.join(tfDir, "tf", "botLog.log"));
        console.log("Old logs cleaned");
        logIsClean = true;
    } catch (error) {
        console.log(error);
        console.warn("\n\nFailed to clean the old log file\nPlease be sure that the game is not running");
    }
}

/**
 * Start team fortress 2
 */
function launchTF2() {
    console.log("Launching Team Fortress 2...");
    cp.exec("start steam://rungameid/440");
}

/**
 * Start the watcher
 */
function startWatcher() {
    setInterval(() => {
        let rawLog;
        const logFile = path.join(tfDir, "tf", "botlog.log");
        try {
            rawLog = fs.readFileSync(logFile, {
                encoding: "utf-8"
            });
        } catch (error) {
            console.warn("Unable to read the log file, skipping...");
            return;
        }


        const log = rawLog.split("\n");

        // if the logs haven't been cleared, start at the end of the file
        if (!logIsClean) {
            logCursorLine = log.length - 1;
            logIsClean = true;
        }


        for (let line = logCursorLine; line < log.length; line++) {
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

        //execute the active commands
        executeCommands();

    }, config.watcherDelay * 1000);
}

/**
 * Parse a message detected from the master
 * @param {*} line 
 */
function parseMasterLine(line) {
    const commandStr = line.replace(config.masterSteamUserName + " : ", "");

    //check all commands
    for (const command in commands) {
        if (commands.hasOwnProperty(command)) {
            const commandObject = commands[command];
            // if a command match
            if (commandStr.indexOf(command) > -1) {
                console.log("Command '" + command + "' from '" + config.masterSteamUserName + "'");
                addCommandEntry(command, commandObject);
                break;
            }
        }
    }

}

/**
 * Add a command entry into the executor
 * @param {*} command 
 * @param {*} commandObject 
 */
function addCommandEntry(command, commandObject) {
    // if it's a toggle and active, we disable it
    if (!processCommands[command]) {
        processCommands[command] = commandObject;
    };

    //we only interact wioth the processComand
    processCommand = processCommands[command];


    //manage toggle
    if (processCommand.toggle && processCommand.active) {
        processCommand.active = false;
        processCommand.execEndScript = true;
        console.log("Toggling command '" + command + "' => INACTIVE");
    } else {
        processCommand.active = true;
        if (processCommand.toggle) {
            console.log("Toggling command '" + command + "' => ACTIVE");
        }
    }

}

/**
 * Read the commands form the processCommands object and write them into the cfg file
 * This will truigger the game to use them
 */
function executeCommands() {
    let cfgData = "";

    //add the default commands
    cfgData += "echo Accept invite;tf_party_request_join_user " + config.masterSteamId + ";tf_party_request_join_user " + config.masterSteamId + ";tf_party_request_join_user;wait 500;\n"
    cfgData += "jointeam " + config.defaultTeam + ";join_class " + config.defaultClass + "\n";
    //end default commands

    for (const command in processCommands) {
        if (processCommands.hasOwnProperty(command)) {
            const commandObject = processCommands[command];

            //skip if non active
            if (!commandObject.active) {
                // if this is a toggle command that will be stopped
                // add the endScript line
                if (commandObject.execEndScript && commandObject.toggle) {

                    //write endScript if it exist
                    if (commandObject.endScript) {
                        cfgData += commandObject.endScript + "\n";
                    }

                    commandObject.active = false;
                    commandObject.execEndScript = false;

                }
                continue;
            }

            //non toggle, execute it and disable
            if (!commandObject.toggle) {
                console.log("Executing command : '" + command + "'");
                cfgData += commandObject.script + "\n";
                commandObject.active = false;

            }

            // if this is a toggle keep it active
            if (commandObject.toggle) {
                cfgData += commandObject.script + "\n";
                commandObject.active = true; //just to be sure
                continue;
            }

        }
    }

    // once all command have written their lines
    //write the cfg file
    try {
        fs.writeFileSync(path.join(tfDir, "tf", "cfg", "botexec.cfg"), cfgData);
    } catch (error) {
        console.error(error);
        console.error("\n\n Failed to write the script !!!\n\n");
    }
}