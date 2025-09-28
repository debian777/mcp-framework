import { PromptProvider, PromptProviderConfig } from '../../framework/providers/abstract/prompt-provider.js';
import { Prompt } from '../../types.js';

export class CodePromptProvider extends PromptProvider {
    constructor(config: PromptProviderConfig) {
        super(config);
    }

    getPrompts(): Prompt[] {
        return [
            {
                name: 'generate-function',
                description: 'Generate a function with specified parameters and return type',
                arguments: [
                    {
                        name: 'language',
                        description: 'Programming language (typescript, javascript, python, etc.)',
                        required: true
                    },
                    {
                        name: 'functionName',
                        description: 'Name of the function to generate',
                        required: true
                    },
                    {
                        name: 'parameters',
                        description: 'Function parameters as a string (e.g., "name: string, age: number")',
                        required: true
                    },
                    {
                        name: 'returnType',
                        description: 'Return type of the function',
                        required: true
                    },
                    {
                        name: 'description',
                        description: 'What the function should do',
                        required: true
                    }
                ]
            },
            {
                name: 'generate-class',
                description: 'Generate a class with specified properties and methods',
                arguments: [
                    {
                        name: 'language',
                        description: 'Programming language (typescript, javascript, python, etc.)',
                        required: true
                    },
                    {
                        name: 'className',
                        description: 'Name of the class to generate',
                        required: true
                    },
                    {
                        name: 'properties',
                        description: 'Class properties as a string (e.g., "name: string, age: number")',
                        required: false
                    },
                    {
                        name: 'methods',
                        description: 'Class methods as a description string',
                        required: false
                    }
                ]
            },
            {
                name: 'explain-code',
                description: 'Explain what a piece of code does',
                arguments: [
                    {
                        name: 'code',
                        description: 'The code to explain',
                        required: true
                    },
                    {
                        name: 'language',
                        description: 'Programming language of the code',
                        required: false
                    }
                ]
            },
            {
                name: 'refactor-code',
                description: 'Suggest refactoring improvements for code',
                arguments: [
                    {
                        name: 'code',
                        description: 'The code to refactor',
                        required: true
                    },
                    {
                        name: 'language',
                        description: 'Programming language of the code',
                        required: false
                    },
                    {
                        name: 'improvement',
                        description: 'Specific improvement to focus on (performance, readability, etc.)',
                        required: false
                    }
                ]
            }
        ];
    }

    async getPrompt(promptName: string, args?: Record<string, any>): Promise<{
        description?: string;
        messages: Array<{
            role: 'user' | 'assistant' | 'system';
            content: {
                type: 'text' | 'image';
                text?: string;
                data?: string;
                mimeType?: string;
            };
        }>;
    }> {
        const promptArgs = args || {};

        switch (promptName) {
            case 'generate-function':
                return this.generateFunctionPrompt(promptArgs);
            case 'generate-class':
                return this.generateClassPrompt(promptArgs);
            case 'explain-code':
                return this.explainCodePrompt(promptArgs);
            case 'refactor-code':
                return this.refactorCodePrompt(promptArgs);
            default:
                throw new Error(`Unknown prompt: ${promptName}`);
        }
    }

    private generateFunctionPrompt(args: Record<string, any>): {
        description?: string;
        messages: Array<{
            role: 'user' | 'assistant' | 'system';
            content: {
                type: 'text' | 'image';
                text?: string;
                data?: string;
                mimeType?: string;
            };
        }>;
    } {
        const { language, functionName, parameters, returnType, description } = args;

        return {
            description: `Generate a ${language} function named ${functionName}`,
            messages: [
                {
                    role: 'system',
                    content: {
                        type: 'text',
                        text: `You are a ${language} code generator. Generate clean, well-documented code following best practices.`
                    }
                },
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Generate a ${language} function with the following specifications:

Function Name: ${functionName}
Parameters: ${parameters}
Return Type: ${returnType}
Description: ${description}

Please provide the complete function implementation with proper documentation and error handling where appropriate.`
                    }
                }
            ]
        };
    }

    private generateClassPrompt(args: Record<string, any>): {
        description?: string;
        messages: Array<{
            role: 'user' | 'assistant' | 'system';
            content: {
                type: 'text' | 'image';
                text?: string;
                data?: string;
                mimeType?: string;
            };
        }>;
    } {
        const { language, className, properties, methods } = args;

        return {
            description: `Generate a ${language} class named ${className}`,
            messages: [
                {
                    role: 'system',
                    content: {
                        type: 'text',
                        text: `You are a ${language} code generator. Generate clean, well-structured classes following object-oriented best practices.`
                    }
                },
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Generate a ${language} class with the following specifications:

Class Name: ${className}
${properties ? `Properties: ${properties}` : ''}
${methods ? `Methods: ${methods}` : ''}

Please provide the complete class implementation with proper encapsulation, documentation, and following language conventions.`
                    }
                }
            ]
        };
    }

    private explainCodePrompt(args: Record<string, any>): {
        description?: string;
        messages: Array<{
            role: 'user' | 'assistant' | 'system';
            content: {
                type: 'text' | 'image';
                text?: string;
                data?: string;
                mimeType?: string;
            };
        }>;
    } {
        const { code, language } = args;

        return {
            description: `Explain the provided ${language || 'code'}`,
            messages: [
                {
                    role: 'system',
                    content: {
                        type: 'text',
                        text: 'You are a code explanation expert. Break down code into understandable parts and explain what each section does.'
                    }
                },
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `${language ? `Explain this ${language} code` : 'Explain this code'}:

\`\`\`${language || ''}
${code}
\`\`\`

Please provide a clear, step-by-step explanation of what this code does, including:
1. Overall purpose
2. Key components and their roles
3. How the different parts work together
4. Any important concepts or patterns used`
                    }
                }
            ]
        };
    }

    private refactorCodePrompt(args: Record<string, any>): {
        description?: string;
        messages: Array<{
            role: 'user' | 'assistant' | 'system';
            content: {
                type: 'text' | 'image';
                text?: string;
                data?: string;
                mimeType?: string;
            };
        }>;
    } {
        const { code, language, improvement } = args;

        return {
            description: `Refactor ${language || 'code'} for ${improvement || 'improvement'}`,
            messages: [
                {
                    role: 'system',
                    content: {
                        type: 'text',
                        text: 'You are a code refactoring expert. Suggest improvements that enhance code quality, maintainability, and performance.'
                    }
                },
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Please refactor this ${language || 'code'} ${improvement ? `focusing on ${improvement}` : ''}:

\`\`\`${language || ''}
${code}
\`\`\`

Provide:
1. The refactored code
2. Explanation of the changes made
3. Benefits of the refactoring
4. Any trade-offs or considerations`
                    }
                }
            ]
        };
    }
}