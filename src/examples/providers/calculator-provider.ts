import { ToolProvider, ToolProviderConfig } from '../../framework/providers/abstract/tool-provider.js';
import { Tool } from '../../types.js';

export class CalculatorProvider extends ToolProvider {
    constructor(config: ToolProviderConfig) {
        super(config);
    }

    getTools(): Tool[] {
        return [
            {
                name: 'add',
                description: 'Add two numbers',
                inputSchema: {
                    type: 'object',
                    properties: {
                        a: { type: 'number', description: 'First number' },
                        b: { type: 'number', description: 'Second number' }
                    },
                    required: ['a', 'b']
                }
            },
            {
                name: 'subtract',
                description: 'Subtract two numbers',
                inputSchema: {
                    type: 'object',
                    properties: {
                        a: { type: 'number', description: 'First number' },
                        b: { type: 'number', description: 'Second number' }
                    },
                    required: ['a', 'b']
                }
            },
            {
                name: 'multiply',
                description: 'Multiply two numbers',
                inputSchema: {
                    type: 'object',
                    properties: {
                        a: { type: 'number', description: 'First number' },
                        b: { type: 'number', description: 'Second number' }
                    },
                    required: ['a', 'b']
                }
            },
            {
                name: 'divide',
                description: 'Divide two numbers',
                inputSchema: {
                    type: 'object',
                    properties: {
                        a: { type: 'number', description: 'First number' },
                        b: { type: 'number', description: 'Second number' }
                    },
                    required: ['a', 'b']
                }
            },
            {
                name: 'power',
                description: 'Calculate power (a^b)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        a: { type: 'number', description: 'Base number' },
                        b: { type: 'number', description: 'Exponent' }
                    },
                    required: ['a', 'b']
                }
            },
            {
                name: 'sqrt',
                description: 'Calculate square root',
                inputSchema: {
                    type: 'object',
                    properties: {
                        a: { type: 'number', description: 'Number to calculate square root of' }
                    },
                    required: ['a']
                }
            }
        ];
    }

    async callTool(name: string, args: Record<string, any>): Promise<{
        content: Array<{
            type: 'text' | 'image' | 'resource_link';
            text?: string;
            data?: string;
            mimeType?: string;
            uri?: string;
            name?: string;
            description?: string;
        }>;
        isError?: boolean;
    }> {
        try {
            let result: number;

            switch (name) {
                case 'add':
                    result = this.add(args.a, args.b);
                    break;
                case 'subtract':
                    result = this.subtract(args.a, args.b);
                    break;
                case 'multiply':
                    result = this.multiply(args.a, args.b);
                    break;
                case 'divide':
                    result = this.divide(args.a, args.b);
                    break;
                case 'power':
                    result = this.power(args.a, args.b);
                    break;
                case 'sqrt':
                    result = this.sqrt(args.a);
                    break;
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }

            return {
                content: [{
                    type: 'text',
                    text: result.toString()
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }],
                isError: true
            };
        }
    }

    private add(a: number, b: number): number {
        return a + b;
    }

    private subtract(a: number, b: number): number {
        return a - b;
    }

    private multiply(a: number, b: number): number {
        return a * b;
    }

    private divide(a: number, b: number): number {
        if (b === 0) {
            throw new Error('Division by zero');
        }
        return a / b;
    }

    private power(a: number, b: number): number {
        return Math.pow(a, b);
    }

    private sqrt(a: number): number {
        if (a < 0) {
            throw new Error('Cannot calculate square root of negative number');
        }
        return Math.sqrt(a);
    }
}