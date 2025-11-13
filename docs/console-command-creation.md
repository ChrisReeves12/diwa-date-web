# Console Command Development Guide

## Overview

This document provides a comprehensive guide for creating new console commands in the DIWA Date web application. The console command system is built using TypeScript and the Commander.js library, providing a structured way to create CLI tools for administrative and utility tasks.

## Architecture Analysis

### Command Processing Flow

1. **Entry Point**: `src/console/cli.ts` serves as the main entry point
2. **Command Registration**: Commands are registered in a `commands` object with their call signs
3. **Command Discovery**: If no arguments are provided, the CLI displays all available commands
4. **Command Execution**: When a command is specified, the CLI instantiates and bootstraps the appropriate command class
5. **Argument Processing**: Each command uses Commander.js to handle argument parsing and validation

### Core Components

#### 1. CLI Router (`src/console/cli.ts`)
- **Purpose**: Routes commands to their respective implementations
- **Key Features**:
    - Command registration via `commands` object
    - Automatic command listing when no arguments provided
    - Dynamic command instantiation and execution
    - Error handling for unsupported commands

#### 2. Base Command Class (`src/console/commands/console.command.ts`)
- **Purpose**: Abstract base class that all commands must extend
- **Key Features**:
    - Standardized command structure
    - Built-in Commander.js integration
    - Memory usage monitoring
    - Option/argument definition system
    - Bootstrap lifecycle management
    - Command classes should go in the src/console/commands directory.

#### 3. Command Implementations
- **Purpose**: Concrete command classes that extend the base class
- **Example**: `SuspendUserCommand` for user management operations

## Creating a New Console Command

### Step 1: Create the Command Class

Create a new TypeScript file in `src/console/commands/` following the naming convention: `[action]-[entity].command.ts`

```typescript
import ConsoleCommand from "./console.command";
import { Command } from "commander";

export default class YourNewCommand extends ConsoleCommand {
    constructor() {
        super(
            'command:action',           // Command call sign
            'Description of what this command does',  // Command description
            [                          // Optional arguments array
                {
                    option: '-r, --required <value>',
                    description: 'A required option',
                    required: true
                },
                {
                    option: '--optional [value]',
                    description: 'An optional flag or value',
                    required: false
                }
            ]
        );
    }

    async handle(prog: Command): Promise<number> {
        const options = prog.opts();
        
        // Your command logic here
        console.log('Executing command with options:', options);
        
        // Return 0 for success, non-zero for failure
        return 0;
    }
}
```

### Step 2: Register the Command

Add your new command to the `commands` object in `src/console/cli.ts`:

```typescript
import SuspendUserCommand from "./commands/suspend-user.command";
import YourNewCommand from "./commands/your-new.command";  // Add import

export async function executeCommand(aCommand?: string) {
    const commands: Record<string, any> = {
        'users:suspend': SuspendUserCommand,
        'command:action': YourNewCommand,  // Add registration
    };
    
    // ... rest of the function remains unchanged
}
```

### Step 3: Implement Command Logic

Fill in the `handle` method with your specific business logic:

```typescript
async handle(prog: Command): Promise<number> {
    const options = prog.opts();
    
    try {
        // Validate inputs
        if (!options.required) {
            console.error('Required option is missing');
            return 1;
        }
        
        // Perform your command logic
        const result = await yourBusinessLogic(options);
        
        if (result.success) {
            console.log('Command executed successfully');
            return 0;
        } else {
            console.error('Command failed:', result.error);
            return 1;
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        return 1;
    }
}
```

## Command Structure Reference

### Constructor Parameters

1. **Command Call Sign** (`string`)
    - Format: `category:action` (e.g., `users:suspend`, `data:export`)
    - Used to invoke the command from CLI
    - Should be descriptive and follow consistent naming conventions

2. **Description** (`string`)
    - Brief explanation of what the command does
    - Displayed when listing available commands
    - Should be clear and concise

3. **Option Entries** (`OptionEntry[]` - optional)
    - Array of command-line options and flags
    - Each entry has: `option`, `description`, and optional `required` flag

### Option Entry Format

```typescript
interface OptionEntry {
    option: string;      // Commander.js option syntax
    description: string; // Help text for the option
    required?: boolean;  // Whether the option is mandatory
}
```

#### Option Syntax Examples:
- **Required Value**: `-u, --user <userId>` - User must provide a value
- **Optional Value**: `-f, --format [format]` - Value is optional, defaults if not provided
- **Boolean Flag**: `--force` - Simple true/false flag
- **Multiple Values**: `-i, --ids <ids...>` - Accepts multiple values

### Return Values
Commands should return:
- **0**: Success
- **Non-zero**: Failure (specific error codes can be used for different failure types)

## Best Practices

### 1. Error Handling
- Always wrap main logic in try-catch blocks
- Provide meaningful error messages
- Return appropriate exit codes

### 2. Input Validation
- Validate all required parameters early
- Sanitize and type-check inputs
- Provide clear feedback for invalid inputs

### 3. Progress Feedback
- Use console.log for progress updates
- Show what the command is doing, especially for long-running operations
- Provide summary statistics when processing multiple items

### 4. Documentation
- Include comprehensive JSDoc comments
- Document expected input formats
- Explain any side effects or prerequisites

### 5. Testing Considerations
- Design commands to be testable by accepting a completion callback
- Consider separating business logic from CLI concerns
- Use dependency injection where appropriate

## Example Commands

### Simple Flag Command
```typescript
export default class CleanCacheCommand extends ConsoleCommand {
    constructor() {
        super('cache:clean', 'Clear application cache', [
            {
                option: '--all',
                description: 'Clear all cache types',
                required: false
            }
        ]);
    }

    async handle(prog: Command): Promise<number> {
        const options = prog.opts();
        const clearAll = options.all || false;
        
        console.log(clearAll ? 'Clearing all caches...' : 'Clearing default cache...');
        
        // Implementation here
        
        console.log('Cache cleared successfully');
        return 0;
    }
}
```

### Data Processing Command
```typescript
export default class ExportDataCommand extends ConsoleCommand {
    constructor() {
        super('data:export', 'Export data to file', [
            {
                option: '-f, --format <format>',
                description: 'Export format (json, csv, xml)',
                required: true
            },
            {
                option: '-o, --output <path>',
                description: 'Output file path',
                required: true
            },
            {
                option: '--include-deleted',
                description: 'Include deleted records',
                required: false
            }
        ]);
    }

    async handle(prog: Command): Promise<number> {
        const options = prog.opts();
        
        const validFormats = ['json', 'csv', 'xml'];
        if (!validFormats.includes(options.format)) {
            console.error(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
            return 1;
        }
        
        console.log(`Exporting data to ${options.output} in ${options.format} format...`);
        
        // Implementation here
        
        console.log('Export completed successfully');
        return 0;
    }
}
```

## AI Agent Integration Instructions

When providing information to an AI agent for creating a new console command, include:

### Required Information:
1. **Command Call Sign**: The identifier used to invoke the command (format: `category:action`)
2. **Command Description**: Clear, concise explanation of the command's purpose
3. **Business Logic**: What the command should actually do
4. **Required Arguments**: Arguments that must be provided for the command to function
5. **Optional Arguments**: Arguments that enhance functionality but aren't mandatory

### Optional Information:
1. **Error Handling Requirements**: Specific error conditions to handle
2. **Output Format**: How results should be displayed
3. **Dependencies**: Any external services or modules needed
4. **Performance Considerations**: For commands that might process large datasets

### Example AI Prompt:
```
Create a console command with the following specifications:
- Call Sign: users:export
- Description: Export user data to various formats
- Required Arguments: 
  - format: Export format (json, csv, excel)
  - output: Output file path
- Optional Arguments:
  - include-inactive: Include inactive users in export
  - date-range: Filter users by creation date range
- Business Logic: Query user database, format data according to specified format, write to output file
- Error Handling: Validate file permissions, check format validity, handle database connection issues
```

## Testing Your Command

### Manual Testing
```bash
# List all commands
npm run console

# Test your command with various options
npm run console command:action --required-option value
npm run console command:action --required-option value --optional-flag
```

### Integration Testing
Consider creating test scripts that verify:
- Command registration works correctly
- Arguments are parsed properly
- Business logic executes as expected
- Error conditions are handled appropriately

## Troubleshooting

### Common Issues:
1. **Command not found**: Ensure it's properly registered in `cli.ts`
2. **Options not working**: Check Commander.js syntax in option definitions
3. **Import errors**: Verify file paths and exports are correct
4. **Type errors**: Ensure proper TypeScript types and inheritance

### Debugging Tips:
- Use `console.log` liberally during development
- Test with various argument combinations
- Check that the base class constructor is called properly
- Verify return values are appropriate numbers 
