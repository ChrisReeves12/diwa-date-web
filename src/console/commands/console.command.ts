import dotenv from 'dotenv';
import { program, Command } from 'commander';
import v8 from 'v8';
dotenv.config();

interface OptionEntry {
    option: string;
    description: string;
    required?: boolean;
}

export default abstract class ConsoleCommand {
    public command: string;
    public description: string;
    public optionEntries: OptionEntry[];

    constructor(command: string, description: string, optionEntries: OptionEntry[] = []) {
        this.command = command;
        this.description = description;
        this.optionEntries = optionEntries;
    }

    getVersion(): string {
        return '0.0.1';
    }

    abstract handle(prog: Command): Promise<number>;

    async bootstrap(argv: string[], onComplete?: (result: number) => void): Promise<void> {
        program
            .version(this.getVersion())
            .description(this.description)
            .command(this.command)
            .action(async () => {
                const totalHeapSize = v8.getHeapStatistics().total_available_size;
                const totalHeapSizeinGB = (totalHeapSize / 1024 / 1024 / 1024).toFixed(2);
                console.log(`Total heap allocation size: ${totalHeapSizeinGB} GB`);

                const result = await this.handle(program);
                if (onComplete) {
                    onComplete(result);
                    return;
                }

                if (!result || result < 1) {
                    console.log(`Complete: ${this.command}`);
                }

                process.exit(result || 0);
            });

        // Add options if any were provided
        for (const optionEntry of this.optionEntries) {
            if (optionEntry.required) {
                program.requiredOption(optionEntry.option, optionEntry.description);
            } else {
                program.option(optionEntry.option, optionEntry.description);
            }
        }

        await program.parseAsync(argv);
    }
}
