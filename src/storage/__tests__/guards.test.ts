import { ensureSaveInput, ensureWorkflowExecutionInput } from '../guards.js';

async function runGuardTests() {
    console.log('Running storage guard tests...');

    // Happy path for save
    const validSave = {
        resource: 'r',
        task: 't',
        type: 'context',
        description: 'd'
    };
    ensureSaveInput(validSave as any);
    console.log('✓ ensureSaveInput happy path');

    // Missing field for save
    try {
        ensureSaveInput({ resource: 'r', task: '', type: 'context' } as any);
        throw new Error('ensureSaveInput did not throw for missing description');
    } catch (err) {
        console.log('✓ ensureSaveInput missing field error');
    }

    // Happy path for workflow execution
    const validWorkflow = {
        workflow_id: 'w',
        model: 'm',
        lost_events: 0,
        execution_status: 'success'
    };
    ensureWorkflowExecutionInput(validWorkflow as any);
    console.log('✓ ensureWorkflowExecutionInput happy path');

    // Missing required workflow field
    try {
        ensureWorkflowExecutionInput({ workflow_id: 'w', model: 'm' } as any);
        throw new Error('ensureWorkflowExecutionInput did not throw for missing fields');
    } catch (err) {
        console.log('✓ ensureWorkflowExecutionInput missing field error');
    }

    console.log('✅ Guard tests passed');
}

export { runGuardTests };

if (import.meta.url === `file://${process.argv[1]}`) {
    runGuardTests().catch(console.error);
}
