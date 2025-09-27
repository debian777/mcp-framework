import { SaveInput, WorkflowExecutionInput } from './interface.js';

export function ensureSaveInput(input: SaveInput): SaveInput {
    if (!input || typeof input !== 'object') {
        throw new Error('Invalid save input: expected object');
    }
    const required = ['resource', 'task', 'type', 'description'];
    for (const k of required) {
        if (!input[k as keyof SaveInput] || String(input[k as keyof SaveInput]).trim() === '') {
            throw new Error(`Missing required field for save: ${k}`);
        }
    }
    return input;
}

export function ensureWorkflowExecutionInput(input: WorkflowExecutionInput): WorkflowExecutionInput {
    if (!input || typeof input !== 'object') {
        throw new Error('Invalid workflow execution input: expected object');
    }
    const required = ['workflow_id', 'model', 'lost_events', 'execution_status'];
    for (const k of required) {
        if (input[k as keyof WorkflowExecutionInput] === undefined || input[k as keyof WorkflowExecutionInput] === null) {
            throw new Error(`Missing required field for workflow execution: ${k}`);
        }
    }
    return input;
}
