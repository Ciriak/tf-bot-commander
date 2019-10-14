# tf-bot-commander
Script to command a bot account on Team Fortress 2

## Pre-requisites
- Nodejs
- Team Fortres 2 

## Setup

Install the dependencies  
```
npm i
```

- copy the content of the "cfg" folder into your Team Fortress 2 directory **/tf/cfg**

- Edit your **autoexec.cfg** in your TF2 cfg folder and add the line 
```
exec bot
```
- Edit your config (see below)

## Setup your config

- Copy **config.default.json** into **config.json**
- Change **masterSteamId** to your steam64 id
- Change **masterSteamUserName** to your current Steam community username
- Change the others options if needed

## Setup the commands 
Edit the file **commands.json**

A command look like this :

```json
 "!explode": {
        "toggle": true,  //If true, the command will keep executing until you type it again
        "script": "echo Hello world;",  // Script to run when the command is typed
        "endScript": "echo Goodbye World;" // (only for toggle commands) Script that will run when the command is desactivated

},
```


