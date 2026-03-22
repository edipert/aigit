import { describe, it, expect } from 'vitest';
import { generateMermaidGraph } from './mermaid';
import { Task, Memory, Decision } from '@prisma/client';

describe('generateMermaidGraph', () => {
    it('generates an empty graph when no data is provided', () => {
        const result = generateMermaidGraph([], [], []);
        expect(result).toContain('```mermaid');
        expect(result).toContain('flowchart TD');
        expect(result).not.toContain(':::task');
        expect(result).not.toContain(':::memory');
        expect(result).not.toContain(':::decision');
    });

    it('generates a graph with tasks, memories, and decisions', () => {
        const tasks = [
            { id: 't1', title: 'Task 1', decisions: [] } as unknown as Task & { decisions: Decision[] },
        ];
        const memories = [
            { id: 'm1', content: 'Memory 1', filePath: null, symbolName: null } as unknown as Memory,
        ];
        const decisions = [
            { id: 'd1', chosen: 'Decision 1', filePath: null, symbolName: null } as unknown as Decision,
        ];

        const result = generateMermaidGraph(tasks, memories, decisions);
        expect(result).toContain('Task_t1["📋 Task 1"]:::task');
        expect(result).toContain('Mem_m1("🧠 Memory 1"):::memory');
        expect(result).toContain('Dec_d1{"🧭 Decision 1"}:::decision');
    });

    it('links tasks to their spawned decisions', () => {
        const decision = { id: 'd1', chosen: 'Decision 1' } as unknown as Decision;
        const tasks = [
            { id: 't1', title: 'Task 1', decisions: [decision] } as unknown as Task & { decisions: Decision[] },
        ];

        const result = generateMermaidGraph(tasks, [], [decision]);
        expect(result).toContain('Task_t1 -->|Spawned| Dec_d1');
    });

    it('replaces quotes with single quotes in titles, contents, and chosen text', () => {
        const tasks = [
            { id: 't1', title: 'Task with "quotes"', decisions: [] } as unknown as Task & { decisions: Decision[] },
        ];
        const memories = [
            { id: 'm1', content: 'Memory with "quotes"', filePath: null, symbolName: null } as unknown as Memory,
        ];
        const decisions = [
            { id: 'd1', chosen: 'Decision with "quotes"', filePath: null, symbolName: null } as unknown as Decision,
        ];

        const result = generateMermaidGraph(tasks, memories, decisions);
        expect(result).toContain("Task_t1[\"📋 Task with 'quotes'\"]:::task");
        expect(result).toContain("Mem_m1(\"🧠 Memory with 'quotes'\"):::memory");
        expect(result).toContain("Dec_d1{\"🧭 Decision with 'quotes'\"}:::decision");
    });

    it('truncates memory content longer than 40 characters', () => {
        const longContent = 'This is a very long memory content that exceeds forty characters and should be truncated';
        const memories = [
            { id: 'm1', content: longContent, filePath: null, symbolName: null } as unknown as Memory,
        ];

        const result = generateMermaidGraph([], memories, []);
        // "This is a very long memory content that ".substring(0, 40) is "This is a very long memory content that "
        expect(result).toContain('Mem_m1("🧠 This is a very long memory content that ..."):::memory');
    });

    it('links memories to decisions if they share the same filePath and symbolName', () => {
        const memories = [
            { id: 'm1', content: 'Mem 1', filePath: 'src/app.ts', symbolName: 'App' } as unknown as Memory,
        ];
        const decisions = [
            { id: 'd1', chosen: 'Dec 1', filePath: 'src/app.ts', symbolName: 'App' } as unknown as Decision,
        ];

        const result = generateMermaidGraph([], memories, decisions);
        expect(result).toContain('Mem_m1 -.->|Influenced| Dec_d1');
    });

    it('groups memories and decisions into subgraphs by filePath', () => {
        const memories = [
            { id: 'm1', content: 'Mem 1', filePath: 'src/fileA.ts' } as unknown as Memory,
            { id: 'm2', content: 'Mem 2', filePath: 'src/fileB.ts' } as unknown as Memory,
        ];
        const decisions = [
            { id: 'd1', chosen: 'Dec 1', filePath: 'src/fileA.ts' } as unknown as Decision,
        ];

        const result = generateMermaidGraph([], memories, decisions);
        expect(result).toContain('subgraph File0 ["📁 src/fileA.ts"]');
        expect(result).toContain('Mem_m1');
        expect(result).toContain('Dec_d1');

        expect(result).toContain('subgraph File1 ["📁 src/fileB.ts"]');
        expect(result).toContain('Mem_m2');
    });
});
