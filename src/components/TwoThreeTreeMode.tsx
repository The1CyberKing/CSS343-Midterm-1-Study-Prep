import React, { useState, useEffect, useRef } from 'react';
import { Inspector } from './shared/Inspector';
import { Stepper } from './shared/Stepper';
import { EventLog } from './shared/EventLog';
import { Plus, Trash2, RefreshCw } from 'lucide-react';

class TTNode {
  keys: number[] = [];
  children: TTNode[] = [];
  parent: TTNode | null = null;
  id: string;

  constructor(keys: number[] = []) {
    this.keys = keys.sort((a, b) => a - b);
    this.id = Math.random().toString(36).substr(2, 9);
  }

  isLeaf(): boolean {
    return this.children.length === 0;
  }

  isFull(): boolean {
    return this.keys.length >= 2;
  }

  getDepth(): number {
    let depth = 0;
    let current: TTNode | null = this;
    while (current.parent) {
      depth++;
      current = current.parent;
    }
    return depth;
  }
}

interface AlgorithmStep {
  type: 'insert' | 'split' | 'propagate' | 'delete' | 'redistribute' | 'merge' | 'complete';
  description: string;
  activeNodes?: string[];
  treeSnapshot?: TTNode | null;
}

export function TwoThreeTreeMode() {
  const [root, setRoot] = useState<TTNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<TTNode | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(5);

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning && currentStep < steps.length) {
      intervalRef.current = window.setTimeout(() => {
        stepForward();
      }, 1000 / speed);
    } else if (currentStep >= steps.length) {
      setIsRunning(false);
    }

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [isRunning, currentStep, speed, steps.length]);

  const addEvent = (event: string) => {
    setEvents((prev) => [...prev, event]);
  };

  const cloneTree = (node: TTNode | null): TTNode | null => {
    if (!node) return null;
    const newNode = new TTNode([...node.keys]);
    newNode.id = node.id;
    newNode.children = node.children.map(child => {
      const cloned = cloneTree(child)!;
      cloned.parent = newNode;
      return cloned;
    });
    return newNode;
  };

  const findNodeById = (node: TTNode | null, id: string): TTNode | null => {
    if (!node) return null;
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  };

  const insertTT = (value: number) => {
    const algorithmSteps: AlgorithmStep[] = [];
    let currentTree = cloneTree(root);

    if (!currentTree) {
      currentTree = new TTNode([value]);
      algorithmSteps.push({
        type: 'insert',
        description: `Insert ${value} as root`,
        activeNodes: [currentTree.id],
        treeSnapshot: cloneTree(currentTree),
      });
      algorithmSteps.push({
        type: 'complete',
        description: 'Insertion complete',
        treeSnapshot: cloneTree(currentTree),
      });
      setSteps(algorithmSteps);
      setCurrentStep(0);
      addEvent(`Insert ${value} (as root)`);
      return;
    }

    // Find leaf to insert
    let current = currentTree;
    while (!current.isLeaf()) {
      if (value < current.keys[0]) {
        current = current.children[0];
      } else if (current.keys.length === 1 || value < current.keys[1]) {
        current = current.children[1];
      } else {
        current = current.children[2];
      }
    }

    algorithmSteps.push({
      type: 'insert',
      description: `Insert ${value} into leaf node [${current.keys.join(', ')}]`,
      activeNodes: [current.id],
      treeSnapshot: cloneTree(currentTree),
    });

    current.keys.push(value);
    current.keys.sort((a, b) => a - b);

    // Handle overflow
    while (current && current.keys.length > 2) {
      algorithmSteps.push({
        type: 'split',
        description: `Node overflow: [${current.keys.join(', ')}] - splitting at middle key ${current.keys[1]}`,
        activeNodes: [current.id],
        treeSnapshot: cloneTree(currentTree),
      });

      const midKey = current.keys[1];
      const leftKeys = [current.keys[0]];
      const rightKeys = [current.keys[2]];

      const leftNode = new TTNode(leftKeys);
      const rightNode = new TTNode(rightKeys);

      // Handle children if not leaf
      if (!current.isLeaf()) {
        leftNode.children = [current.children[0], current.children[1]];
        rightNode.children = [current.children[2], current.children[3]];
        leftNode.children.forEach(c => c.parent = leftNode);
        rightNode.children.forEach(c => c.parent = rightNode);
      }

      if (!current.parent) {
        // Create new root
        const newRoot = new TTNode([midKey]);
        newRoot.children = [leftNode, rightNode];
        leftNode.parent = newRoot;
        rightNode.parent = newRoot;
        currentTree = newRoot;

        algorithmSteps.push({
          type: 'propagate',
          description: `Create new root with key ${midKey}`,
          activeNodes: [newRoot.id],
          treeSnapshot: cloneTree(currentTree),
        });
        break;
      } else {
        // Propagate to parent
        const parent = findNodeById(currentTree, current.parent.id)!;
        const idx = parent.children.findIndex(c => c.id === current.id);
        parent.children.splice(idx, 1, leftNode, rightNode);
        leftNode.parent = parent;
        rightNode.parent = parent;
        parent.keys.push(midKey);
        parent.keys.sort((a, b) => a - b);

        algorithmSteps.push({
          type: 'propagate',
          description: `Propagate ${midKey} to parent [${parent.keys.join(', ')}]`,
          activeNodes: [parent.id],
          treeSnapshot: cloneTree(currentTree),
        });

        current = parent;
      }
    }

    algorithmSteps.push({
      type: 'complete',
      description: 'Insertion complete',
      treeSnapshot: cloneTree(currentTree),
    });

    setSteps(algorithmSteps);
    setCurrentStep(0);
    addEvent(`Insert ${value}`);
  };

  const deleteTT = (value: number) => {
    addEvent(`Delete ${value} (simplified - splits only for now)`);
  };

  const stepForward = () => {
    if (currentStep < steps.length) {
      const step = steps[currentStep];
      if (step.treeSnapshot) {
        setRoot(cloneTree(step.treeSnapshot));
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const stepBackward = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      const step = steps[newStep];
      if (step.treeSnapshot) {
        setRoot(cloneTree(step.treeSnapshot));
      }
      setCurrentStep(newStep);
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setIsRunning(false);
    if (steps.length > 0 && steps[0].treeSnapshot) {
      setRoot(cloneTree(steps[0].treeSnapshot));
    }
  };

  const clearTree = () => {
    setRoot(null);
    setSelectedNode(null);
    setEvents([]);
    setSteps([]);
    setCurrentStep(0);
    addEvent('Cleared tree');
  };

  const validateTree = (node: TTNode | null): string[] => {
    if (!node) return [];
    const violations: string[] = [];

    if (node.keys.length < 1 || node.keys.length > 2) {
      violations.push(`Node has invalid key count: ${node.keys.length}`);
    }

    if (!node.isLeaf() && node.children.length !== node.keys.length + 1) {
      violations.push(`Node has mismatched children count: ${node.children.length} vs ${node.keys.length + 1}`);
    }

    // Check all leaves at same depth
    const leafDepths: number[] = [];
    const collectLeafDepths = (n: TTNode) => {
      if (n.isLeaf()) {
        leafDepths.push(n.getDepth());
      } else {
        n.children.forEach(collectLeafDepths);
      }
    };
    collectLeafDepths(node);
    
    const uniqueDepths = [...new Set(leafDepths)];
    if (uniqueDepths.length > 1) {
      violations.push(`Leaves at different depths: ${uniqueDepths.join(', ')}`);
    }

    node.children.forEach(child => {
      violations.push(...validateTree(child));
    });

    return violations;
  };

  const violations = validateTree(root);
  const currentStepData = steps[currentStep] || steps[currentStep - 1];
  const inspectorData = selectedNode
    ? [
        { label: 'Keys', value: `[${selectedNode.keys.join(', ')}]` },
        { label: 'Key Count', value: selectedNode.keys.length },
        { label: 'Children Count', value: selectedNode.children.length },
        { label: 'Depth', value: selectedNode.getDepth() },
        { label: 'Is Leaf', value: selectedNode.isLeaf() ? 'Yes' : 'No' },
      ]
    : [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Controls */}
        <div className="w-72 bg-white border-r border-slate-200 p-4 overflow-y-auto">
          <h3 className="font-semibold text-slate-900 mb-4">2–3 Tree Controls</h3>

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
            <strong>2–3 Tree:</strong> Each node contains 1–2 keys and has 2–3 children. All leaves at same depth.
          </div>

          {/* Insert */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Insert Key
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('value') as HTMLInputElement;
                const value = parseInt(input.value);
                if (!isNaN(value)) {
                  insertTT(value);
                  input.value = '';
                }
              }}
              className="flex gap-2"
            >
              <input
                type="number"
                name="value"
                placeholder="Key"
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
                disabled={isRunning}
              />
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={isRunning}
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Clear */}
          <button
            onClick={clearTree}
            className="w-full px-3 py-2 bg-slate-600 text-white rounded text-sm hover:bg-slate-700 flex items-center justify-center gap-2 mb-6"
            disabled={isRunning}
          >
            <RefreshCw className="w-4 h-4" />
            Clear Tree
          </button>

          {/* Event Log */}
          <EventLog events={events} />
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-slate-50 overflow-auto p-8">
          {root ? (
            <TwoThreeTreeVisualization
              root={root}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              activeNodes={currentStepData?.activeNodes || []}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400">Insert a key to start building the 2–3 tree</p>
            </div>
          )}
        </div>

        {/* Inspector */}
        <div className="w-80">
          <Inspector
            title="Node Inspector"
            data={inspectorData}
            violations={violations}
          />
        </div>
      </div>

      {/* Stepper */}
      <Stepper
        currentStep={currentStep}
        totalSteps={steps.length}
        isRunning={isRunning}
        speed={speed}
        description={currentStepData?.description || 'Insert a key to begin'}
        onStepForward={stepForward}
        onStepBackward={stepBackward}
        onRun={() => setIsRunning(true)}
        onPause={() => setIsRunning(false)}
        onReset={reset}
        onSpeedChange={setSpeed}
        disabled={steps.length === 0}
      />
    </div>
  );
}

function TwoThreeTreeVisualization({
  root,
  selectedNode,
  onSelectNode,
  activeNodes,
}: {
  root: TTNode;
  selectedNode: TTNode | null;
  onSelectNode: (node: TTNode) => void;
  activeNodes: string[];
}) {
  const renderNode = (node: TTNode, x: number, y: number, offset: number): JSX.Element => {
    const isSelected = selectedNode?.id === node.id;
    const isActive = activeNodes.includes(node.id);
    const width = node.keys.length === 1 ? 60 : 90;

    return (
      <g key={node.id}>
        {/* Children edges */}
        {node.children.map((child, idx) => {
          const childX = x - offset + (idx * offset);
          return (
            <line
              key={`edge-${child.id}`}
              x1={x}
              y1={y + 20}
              x2={childX}
              y2={y + 80}
              stroke="#94a3b8"
              strokeWidth="2"
            />
          );
        })}

        {/* Node rectangle */}
        <rect
          x={x - width / 2}
          y={y - 20}
          width={width}
          height={40}
          fill={isActive ? '#fbbf24' : isSelected ? '#3b82f6' : 'white'}
          stroke="#64748b"
          strokeWidth="2"
          rx="4"
          className="cursor-pointer"
          onClick={() => onSelectNode(node)}
        />

        {/* Keys */}
        {node.keys.length === 1 ? (
          <text
            x={x}
            y={y + 5}
            textAnchor="middle"
            className={`text-sm font-semibold ${isActive || isSelected ? 'fill-white' : 'fill-slate-900'}`}
          >
            {node.keys[0]}
          </text>
        ) : (
          <>
            <text
              x={x - 25}
              y={y + 5}
              textAnchor="middle"
              className={`text-sm font-semibold ${isActive || isSelected ? 'fill-white' : 'fill-slate-900'}`}
            >
              {node.keys[0]}
            </text>
            <line
              x1={x}
              y1={y - 15}
              x2={x}
              y2={y + 15}
              stroke={isActive || isSelected ? 'white' : '#94a3b8'}
              strokeWidth="1"
            />
            <text
              x={x + 25}
              y={y + 5}
              textAnchor="middle"
              className={`text-sm font-semibold ${isActive || isSelected ? 'fill-white' : 'fill-slate-900'}`}
            >
              {node.keys[1]}
            </text>
          </>
        )}

        {/* Render children */}
        {node.children.map((child, idx) => {
          const childX = x - offset + (idx * offset);
          return renderNode(child, childX, y + 100, offset / 2);
        })}
      </g>
    );
  };

  return (
    <svg width="100%" height="600" className="min-w-[1000px]">
      {renderNode(root, 500, 50, 200)}
    </svg>
  );
}
