import React, { useState, useEffect, useRef } from 'react';
import { Inspector } from './shared/Inspector';
import { Stepper } from './shared/Stepper';
import { EventLog } from './shared/EventLog';
import { Plus, Trash2, RefreshCw } from 'lucide-react';

class AVLNode {
  value: number;
  left: AVLNode | null = null;
  right: AVLNode | null = null;
  parent: AVLNode | null = null;
  id: string;

  constructor(value: number) {
    this.value = value;
    this.id = Math.random().toString(36).substr(2, 9);
  }

  getHeight(): number {
    if (!this.left && !this.right) return 0;
    const leftHeight = this.left ? this.left.getHeight() : 0;
    const rightHeight = this.right ? this.right.getHeight() : 0;
    return 1 + Math.max(leftHeight, rightHeight);
  }

  getDepth(): number {
    let depth = 0;
    let current: AVLNode | null = this;
    while (current.parent) {
      depth++;
      current = current.parent;
    }
    return depth;
  }

  getBalanceFactor(): number {
    const leftHeight = this.left ? this.left.getHeight() + 1 : 0;
    const rightHeight = this.right ? this.right.getHeight() + 1 : 0;
    return leftHeight - rightHeight;
  }
}

interface AlgorithmStep {
  type: 'insert' | 'detect-imbalance' | 'identify-case' | 'rotate' | 'update-heights' | 'complete' | 'delete' | 'find-successor';
  description: string;
  activeNodes?: string[];
  highlightNodes?: string[];
  rotationType?: 'LL' | 'RR' | 'LR' | 'RL';
  rotationCount?: number;
  treeSnapshot?: AVLNode | null;
}

export function AVLTreeMode() {
  const [root, setRoot] = useState<AVLNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<AVLNode | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [rotationCount, setRotationCount] = useState(0);
  const [overlays, setOverlays] = useState({
    height: true,
    balanceFactor: true,
  });

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

  const cloneTree = (node: AVLNode | null): AVLNode | null => {
    if (!node) return null;
    const newNode = new AVLNode(node.value);
    newNode.id = node.id;
    newNode.left = cloneTree(node.left);
    newNode.right = cloneTree(node.right);
    if (newNode.left) newNode.left.parent = newNode;
    if (newNode.right) newNode.right.parent = newNode;
    return newNode;
  };

  const rotateRight = (y: AVLNode, tree: AVLNode | null): AVLNode | null => {
    const x = y.left!;
    const T2 = x.right;

    x.right = y;
    y.left = T2;

    x.parent = y.parent;
    y.parent = x;
    if (T2) T2.parent = y;

    if (tree === y) {
      return x;
    } else if (x.parent) {
      if (x.parent.left === y) {
        x.parent.left = x;
      } else {
        x.parent.right = x;
      }
    }

    return tree;
  };

  const rotateLeft = (x: AVLNode, tree: AVLNode | null): AVLNode | null => {
    const y = x.right!;
    const T2 = y.left;

    y.left = x;
    x.right = T2;

    y.parent = x.parent;
    x.parent = y;
    if (T2) T2.parent = x;

    if (tree === x) {
      return y;
    } else if (y.parent) {
      if (y.parent.left === x) {
        y.parent.left = y;
      } else {
        y.parent.right = y;
      }
    }

    return tree;
  };

  const findNodeById = (node: AVLNode | null, id: string): AVLNode | null => {
    if (!node) return null;
    if (node.id === id) return node;
    return findNodeById(node.left, id) || findNodeById(node.right, id);
  };

  const insertAVL = (value: number) => {
    const algorithmSteps: AlgorithmStep[] = [];
    let currentTree = cloneTree(root);

    // Step 1: Standard BST insert
    if (!currentTree) {
      currentTree = new AVLNode(value);
      algorithmSteps.push({
        type: 'insert',
        description: `Insert ${value} as root`,
        treeSnapshot: cloneTree(currentTree),
      });
      algorithmSteps.push({
        type: 'complete',
        description: 'Insertion complete (tree was empty)',
        treeSnapshot: cloneTree(currentTree),
      });
      setSteps(algorithmSteps);
      setCurrentStep(0);
      addEvent(`Insert ${value} (as root)`);
      return;
    }

    let current = currentTree;
    let parent: AVLNode | null = null;
    const pathIds: string[] = [];

    while (current) {
      pathIds.push(current.id);
      parent = current;
      if (value < current.value) {
        current = current.left!;
      } else {
        current = current.right!;
      }
    }

    const newNode = new AVLNode(value);
    if (value < parent!.value) {
      parent!.left = newNode;
    } else {
      parent!.right = newNode;
    }
    newNode.parent = parent;
    
    // Add the new node to path as well for balance checking
    pathIds.push(newNode.id);

    algorithmSteps.push({
      type: 'insert',
      description: `Insert ${value} as ${value < parent!.value ? 'left' : 'right'} child of ${parent!.value}`,
      activeNodes: [newNode.id],
      treeSnapshot: cloneTree(currentTree),
    });

    // Step 2: Walk up and check balance (using path IDs to find current nodes)
    let rotations = 0;
    // Start from second-to-last (parent of new node) since new node itself always has BF=0
    for (let i = pathIds.length - 2; i >= 0; i--) {
      const node = findNodeById(currentTree, pathIds[i])!;
      
      // Recalculate balance factor on the CURRENT tree structure
      // Must add +1 for edges to match getBalanceFactor() logic
      const leftHeight = node.left ? node.left.getHeight() + 1 : 0;
      const rightHeight = node.right ? node.right.getHeight() + 1 : 0;
      const bf = leftHeight - rightHeight;

      algorithmSteps.push({
        type: 'detect-imbalance',
        description: `Check balance at node ${node.value}: BF = ${bf} (left height: ${leftHeight}, right height: ${rightHeight})`,
        activeNodes: [node.id],
        treeSnapshot: cloneTree(currentTree),
      });

      if (Math.abs(bf) > 1) {
        // Identify case
        let rotationType: 'LL' | 'RR' | 'LR' | 'RL';
        const leftBF = node.left ? node.left.getBalanceFactor() : 0;
        const rightBF = node.right ? node.right.getBalanceFactor() : 0;
        
        if (bf > 1 && leftBF >= 0) {
          rotationType = 'LL';
        } else if (bf > 1 && leftBF < 0) {
          rotationType = 'LR';
        } else if (bf < -1 && rightBF <= 0) {
          rotationType = 'RR';
        } else {
          rotationType = 'RL';
        }

        algorithmSteps.push({
          type: 'identify-case',
          description: `Imbalance detected! Case: ${rotationType}`,
          activeNodes: [node.id],
          rotationType,
          treeSnapshot: cloneTree(currentTree),
        });

        // Perform rotation(s)
        if (rotationType === 'LL') {
          currentTree = rotateRight(node, currentTree);
          rotations++;
          algorithmSteps.push({
            type: 'rotate',
            description: `Perform right rotation at ${node.value}`,
            rotationType: 'LL',
            rotationCount: rotations,
            treeSnapshot: cloneTree(currentTree),
          });
        } else if (rotationType === 'RR') {
          currentTree = rotateLeft(node, currentTree);
          rotations++;
          algorithmSteps.push({
            type: 'rotate',
            description: `Perform left rotation at ${node.value}`,
            rotationType: 'RR',
            rotationCount: rotations,
            treeSnapshot: cloneTree(currentTree),
          });
        } else if (rotationType === 'LR') {
          currentTree = rotateLeft(node.left!, currentTree);
          rotations++;
          algorithmSteps.push({
            type: 'rotate',
            description: `Perform left rotation at ${node.left!.value} (LR case, part 1)`,
            rotationType: 'LR',
            rotationCount: rotations,
            treeSnapshot: cloneTree(currentTree),
          });
          const nodeAfter = findNodeById(currentTree, node.id)!;
          currentTree = rotateRight(nodeAfter, currentTree);
          rotations++;
          algorithmSteps.push({
            type: 'rotate',
            description: `Perform right rotation at ${node.value} (LR case, part 2)`,
            rotationType: 'LR',
            rotationCount: rotations,
            treeSnapshot: cloneTree(currentTree),
          });
        } else if (rotationType === 'RL') {
          currentTree = rotateRight(node.right!, currentTree);
          rotations++;
          algorithmSteps.push({
            type: 'rotate',
            description: `Perform right rotation at ${node.right!.value} (RL case, part 1)`,
            rotationType: 'RL',
            rotationCount: rotations,
            treeSnapshot: cloneTree(currentTree),
          });
          const nodeAfter = findNodeById(currentTree, node.id)!;
          currentTree = rotateLeft(nodeAfter, currentTree);
          rotations++;
          algorithmSteps.push({
            type: 'rotate',
            description: `Perform left rotation at ${node.value} (RL case, part 2)`,
            rotationType: 'RL',
            rotationCount: rotations,
            treeSnapshot: cloneTree(currentTree),
          });
        }

        break;
      }
    }

    algorithmSteps.push({
      type: 'complete',
      description: `Insertion complete. Total rotations: ${rotations}`,
      rotationCount: rotations,
      treeSnapshot: cloneTree(currentTree),
    });

    setSteps(algorithmSteps);
    setCurrentStep(0);
    addEvent(`Insert ${value} (${rotations} rotation${rotations !== 1 ? 's' : ''})`);
  };

  const insertMultipleAVL = (values: number[]) => {
    const algorithmSteps: AlgorithmStep[] = [];
    let currentTree = cloneTree(root);
    let totalRotations = 0;

    for (const value of values) {
      // Handle first insertion when tree is empty
      if (!currentTree) {
        currentTree = new AVLNode(value);
        algorithmSteps.push({
          type: 'insert',
          description: `Insert ${value} as root`,
          treeSnapshot: cloneTree(currentTree),
          rotationCount: totalRotations,
        });
        algorithmSteps.push({
          type: 'complete',
          description: `Insertion of ${value} complete (tree was empty)`,
          treeSnapshot: cloneTree(currentTree),
          rotationCount: totalRotations,
        });
        addEvent(`Insert ${value} (as root)`);
        continue;
      }

      let current = currentTree;
      let parent: AVLNode | null = null;
      const pathIds: string[] = [];

      while (current) {
        pathIds.push(current.id);
        parent = current;
        if (value < current.value) {
          current = current.left!;
        } else {
          current = current.right!;
        }
      }

      const newNode = new AVLNode(value);
      if (value < parent!.value) {
        parent!.left = newNode;
      } else {
        parent!.right = newNode;
      }
      newNode.parent = parent;
      
      // Add the new node to path as well for balance checking
      pathIds.push(newNode.id);

      algorithmSteps.push({
        type: 'insert',
        description: `Insert ${value} as ${value < parent!.value ? 'left' : 'right'} child of ${parent!.value}`,
        activeNodes: [newNode.id],
        treeSnapshot: cloneTree(currentTree),
        rotationCount: totalRotations,
      });

      // Step 2: Walk up and check balance (using path IDs to find current nodes)
      let rotations = 0;
      // Start from second-to-last (parent of new node) since new node itself always has BF=0
      for (let i = pathIds.length - 2; i >= 0; i--) {
        const node = findNodeById(currentTree, pathIds[i])!;
        
        // Recalculate balance factor on the CURRENT tree structure
        // Must add +1 for edges to match getBalanceFactor() logic
        const leftHeight = node.left ? node.left.getHeight() + 1 : 0;
        const rightHeight = node.right ? node.right.getHeight() + 1 : 0;
        const bf = leftHeight - rightHeight;

        algorithmSteps.push({
          type: 'detect-imbalance',
          description: `Check balance at node ${node.value}: BF = ${bf} (left height: ${leftHeight}, right height: ${rightHeight})`,
          activeNodes: [node.id],
          treeSnapshot: cloneTree(currentTree),
          rotationCount: totalRotations,
        });

        if (Math.abs(bf) > 1) {
          // Identify case
          let rotationType: 'LL' | 'RR' | 'LR' | 'RL';
          const leftBF = node.left ? node.left.getBalanceFactor() : 0;
          const rightBF = node.right ? node.right.getBalanceFactor() : 0;
          
          if (bf > 1 && leftBF >= 0) {
            rotationType = 'LL';
          } else if (bf > 1 && leftBF < 0) {
            rotationType = 'LR';
          } else if (bf < -1 && rightBF <= 0) {
            rotationType = 'RR';
          } else {
            rotationType = 'RL';
          }

          algorithmSteps.push({
            type: 'identify-case',
            description: `Imbalance detected! Case: ${rotationType}`,
            activeNodes: [node.id],
            rotationType,
            treeSnapshot: cloneTree(currentTree),
            rotationCount: totalRotations,
          });

          // Perform rotation(s) and IMMEDIATELY snapshot the result
          if (rotationType === 'LL') {
            currentTree = rotateRight(node, currentTree);
            rotations++;
            totalRotations++;
            algorithmSteps.push({
              type: 'rotate',
              description: `Perform right rotation at ${node.value}`,
              rotationType: 'LL',
              rotationCount: totalRotations,
              treeSnapshot: cloneTree(currentTree),
            });
          } else if (rotationType === 'RR') {
            currentTree = rotateLeft(node, currentTree);
            rotations++;
            totalRotations++;
            algorithmSteps.push({
              type: 'rotate',
              description: `Perform left rotation at ${node.value}`,
              rotationType: 'RR',
              rotationCount: totalRotations,
              treeSnapshot: cloneTree(currentTree),
            });
          } else if (rotationType === 'LR') {
            currentTree = rotateLeft(node.left!, currentTree);
            rotations++;
            totalRotations++;
            algorithmSteps.push({
              type: 'rotate',
              description: `Perform left rotation at ${node.left!.value} (LR case, part 1)`,
              rotationType: 'LR',
              rotationCount: totalRotations,
              treeSnapshot: cloneTree(currentTree),
            });
            const nodeAfter = findNodeById(currentTree, node.id)!;
            currentTree = rotateRight(nodeAfter, currentTree);
            rotations++;
            totalRotations++;
            algorithmSteps.push({
              type: 'rotate',
              description: `Perform right rotation at ${node.value} (LR case, part 2)`,
              rotationType: 'LR',
              rotationCount: totalRotations,
              treeSnapshot: cloneTree(currentTree),
            });
          } else if (rotationType === 'RL') {
            const rightChild = node.right!;
            currentTree = rotateRight(rightChild, currentTree);
            rotations++;
            totalRotations++;
            algorithmSteps.push({
              type: 'rotate',
              description: `Perform right rotation at ${rightChild.value} (RL case, part 1)`,
              rotationType: 'RL',
              rotationCount: totalRotations,
              treeSnapshot: cloneTree(currentTree),
            });
            const nodeAfter = findNodeById(currentTree, node.id)!;
            currentTree = rotateLeft(nodeAfter, currentTree);
            rotations++;
            totalRotations++;
            algorithmSteps.push({
              type: 'rotate',
              description: `Perform left rotation at ${node.value} (RL case, part 2)`,
              rotationType: 'RL',
              rotationCount: totalRotations,
              treeSnapshot: cloneTree(currentTree),
            });
          }

          break;
        }
      }

      algorithmSteps.push({
        type: 'complete',
        description: `Insertion of ${value} complete. Rotations for this insertion: ${rotations}`,
        rotationCount: totalRotations,
        treeSnapshot: cloneTree(currentTree),
      });

      addEvent(`Insert ${value} (${rotations} rotation${rotations !== 1 ? 's' : ''})`);
    }

    setSteps(algorithmSteps);
    setCurrentStep(0);
    addEvent(`Batch insertion complete: ${values.join(', ')} (${totalRotations} total rotations)`);
  };

  const deleteAVL = (value: number) => {
    addEvent(`Delete ${value} (not yet implemented in step-by-step mode)`);
    // Simplified delete for now
  };

  const stepForward = () => {
    if (currentStep < steps.length) {
      const step = steps[currentStep];
      if (step.treeSnapshot) {
        setRoot(cloneTree(step.treeSnapshot));
      }
      if (step.rotationCount !== undefined) {
        setRotationCount(step.rotationCount);
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
      if (step.rotationCount !== undefined) {
        setRotationCount(step.rotationCount);
      } else if (newStep > 0) {
        // Find the last rotation count
        for (let i = newStep - 1; i >= 0; i--) {
          if (steps[i].rotationCount !== undefined) {
            setRotationCount(steps[i].rotationCount!);
            break;
          }
        }
      }
      setCurrentStep(newStep);
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setIsRunning(false);
    setRotationCount(0);
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
    setRotationCount(0);
    addEvent('Cleared tree');
  };

  const currentStepData = steps[currentStep] || steps[currentStep - 1];
  const inspectorData = selectedNode
    ? [
        { label: 'Value', value: selectedNode.value },
        { label: 'Height', value: selectedNode.getHeight() },
        { label: 'Balance Factor', value: selectedNode.getBalanceFactor(), highlight: Math.abs(selectedNode.getBalanceFactor()) > 1 },
        { label: 'Depth', value: selectedNode.getDepth() },
      ]
    : [];

  const globalStats = [
    { label: 'Tree Height', value: root ? root.getHeight() : 0 },
    { label: 'Total Rotations', value: rotationCount },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Controls */}
        <div className="w-72 bg-white border-r border-slate-200 p-4 overflow-y-auto">
          <h3 className="font-semibold text-slate-900 mb-4">Controls</h3>

          {/* Add Node */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Insert Value(s)
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('value') as HTMLInputElement;
                const inputText = input.value.trim();
                
                // Parse multiple numbers (space or comma separated)
                const values = inputText
                  .split(/[\s,]+/)
                  .map(v => parseInt(v))
                  .filter(v => !isNaN(v));
                
                if (values.length > 0) {
                  if (values.length === 1) {
                    insertAVL(values[0]);
                  } else {
                    insertMultipleAVL(values);
                  }
                  input.value = '';
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                name="value"
                placeholder="e.g. 50 30 70 or 10,20,30"
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={isRunning}
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
            <p className="text-xs text-slate-500 mt-1">
              Enter single or multiple values separated by spaces or commas
            </p>
          </div>

          {/* Global Stats */}
          <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <h4 className="text-sm font-medium text-slate-900 mb-2">Statistics</h4>
            <div className="space-y-2">
              {globalStats.map((stat, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-slate-600">{stat.label}:</span>
                  <span className="font-medium text-slate-900">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Overlays */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Display Overlays
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={overlays.height}
                  onChange={(e) => setOverlays({ ...overlays, height: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">Height</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={overlays.balanceFactor}
                  onChange={(e) => setOverlays({ ...overlays, balanceFactor: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">Balance Factor</span>
              </label>
            </div>
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
            <AVLTreeVisualization
              root={root}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              overlays={overlays}
              activeNodes={currentStepData?.activeNodes || []}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400">Insert a value to start building the AVL tree</p>
            </div>
          )}
        </div>

        {/* Inspector */}
        <div className="w-80">
          <Inspector
            title="Node Inspector"
            data={selectedNode ? inspectorData : globalStats.map(s => ({ label: s.label, value: s.value }))}
          />
        </div>
      </div>

      {/* Stepper */}
      <Stepper
        currentStep={currentStep}
        totalSteps={steps.length}
        isRunning={isRunning}
        speed={speed}
        description={currentStepData?.description || 'Insert a value to begin'}
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

function AVLTreeVisualization({
  root,
  selectedNode,
  onSelectNode,
  overlays,
  activeNodes,
}: {
  root: AVLNode;
  selectedNode: AVLNode | null;
  onSelectNode: (node: AVLNode) => void;
  overlays: any;
  activeNodes: string[];
}) {
  const renderNode = (node: AVLNode | null, x: number, y: number, offset: number): JSX.Element | null => {
    if (!node) return null;

    const isSelected = selectedNode?.id === node.id;
    const isActive = activeNodes.includes(node.id);
    const isUnbalanced = Math.abs(node.getBalanceFactor()) > 1;

    return (
      <g key={node.id}>
        {node.left && (
          <line
            x1={x}
            y1={y}
            x2={x - offset}
            y2={y + 80}
            stroke="#94a3b8"
            strokeWidth="2"
          />
        )}
        {node.right && (
          <line
            x1={x}
            y1={y}
            x2={x + offset}
            y2={y + 80}
            stroke="#94a3b8"
            strokeWidth="2"
          />
        )}

        <circle
          cx={x}
          cy={y}
          r="28"
          fill={isActive ? '#fbbf24' : isSelected ? '#3b82f6' : isUnbalanced ? '#ef4444' : 'white'}
          stroke={isUnbalanced ? '#dc2626' : '#64748b'}
          strokeWidth="2"
          className="cursor-pointer"
          onClick={() => onSelectNode(node)}
        />
        
        <text
          x={x}
          y={y + 5}
          textAnchor="middle"
          className={`text-sm font-semibold ${isActive || isSelected ? 'fill-white' : 'fill-slate-900'}`}
        >
          {node.value}
        </text>

        {overlays.height && (
          <text x={x - 50} y={y + 5} className="text-xs fill-blue-600">
            H:{node.getHeight()}
          </text>
        )}
        {overlays.balanceFactor && (
          <text x={x} y={y + 45} className="text-xs fill-purple-600">
            BF:{node.getBalanceFactor()}
          </text>
        )}

        {renderNode(node.left, x - offset, y + 80, offset / 2)}
        {renderNode(node.right, x + offset, y + 80, offset / 2)}
      </g>
    );
  };

  return (
    <svg width="100%" height="600" className="min-w-[800px]">
      {renderNode(root, 400, 50, 150)}
    </svg>
  );
}