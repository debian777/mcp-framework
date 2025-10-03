/**
 * Basic unit tests for MCP Framework storage interfaces
 * Phase 1: Interface contract verification
 */

import { MemoryStorage } from '../backends/memory.js';
import { ExtendedStorageInterface, SaveInput, LoadFilter } from '../interface.js';

// Simple test runner for Phase 1
async function runTests() {
    console.log('Running MCP Framework Storage Interface Tests...');

    let storage: ExtendedStorageInterface | undefined = undefined;

    try {
        // Setup
        storage = new MemoryStorage();
        await storage.initialize();

        // Test 1: Basic save and load
        console.log('✓ Test 1: Basic save and load');
        const input: SaveInput = {
            resource: 'test-resource',
            task: 'test-task',
            type: 'context',
            description: 'Test memory item',
            scope: 'global',
            tags: ['test', 'unit']
        };

        const saved = await storage.save(input);
        if (!saved || !saved.id || saved.resource !== input.resource) {
            throw new Error('Save test failed');
        }

        // Test 2: Load with filtering
        console.log('✓ Test 2: Load with filtering');
        await storage.save({
            resource: 'global-item',
            task: 'test',
            type: 'context',
            description: 'Global test item',
            scope: 'global'
        });

        const globalFilter: LoadFilter = { scope: 'global' };
        const globalResult = await storage.load(globalFilter);
        if (globalResult.items.length < 1) {
            throw new Error('Global load test failed');
        }

        // Test 3: Update
        console.log('✓ Test 3: Update operation');
        const updated = await storage.update({
            id: saved.id,
            description: 'Updated description'
        });
        if (updated.description !== 'Updated description') {
            throw new Error('Update test failed');
        }

        // Test 4: Delete
        console.log('✓ Test 4: Delete operation');
        const deleted = await storage.delete(saved.id);
        if (!deleted) {
            throw new Error('Delete test failed');
        }

        // Test 5: Extended methods
        console.log('✓ Test 5: Extended interface methods');
        const storageType = storage.getStorageType();
        if (storageType !== 'memory') {
            throw new Error('Storage type test failed');
        }

        // Test 6: Interface contract
        console.log('✓ Test 6: Interface contract verification');
        const requiredMethods = ['save', 'load', 'update', 'delete'];
        const extendedMethods = ['getStorageType', 'listProjectIds', 'logWorkflowExecution', 'getWorkflowAnalytics', 'getWorkflowExecutions', 'close'];

        for (const method of [...requiredMethods, ...extendedMethods]) {
            if (typeof (storage as any)[method] !== 'function') {
                throw new Error(`Missing method: ${method}`);
            }
        }

        console.log('✅ All tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        // Cleanup
        if (storage) {
            await storage.close();
        }
    }
}

// Export for potential external usage
export { runTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}