import IndexUsersCommand from "./commands/index-users.command";

export async function executeCommand(aCommand?: string) {
    const commands: Record<string, any> = {
        'search:index-users': IndexUsersCommand
    };

    // Show command list
    if (!aCommand) {
        if (!process.argv[2]) {
            console.log('Commands Available:');
            console.log('=================================');
            console.log('');

            for (const command in commands) {
                if (!Object.prototype.hasOwnProperty.call(commands, command)) continue;

                const commandClass = new commands[command]();
                console.log(`${command} - ${commandClass.description}`);
                console.log('');
            }
            return;
        }

        // Execute command
        if (!commands[process.argv[2]]) {
            console.error('This command is not supported.');
            return;
        }

        await new commands[process.argv[2]]().bootstrap();
        return;
    }
}

executeCommand().then();
