import React, { useState, useCallback } from 'react';
import { Inspector } from './shared/Inspector';
import { EventLog } from './shared/EventLog';
import { Plus, Trash2, Edit2, RefreshCw } from 'lucide-react';

class TreeNode {
  value: number;
  left: TreeNode | null = null;
  right: TreeNode | null = null;
  parent: TreeNode | null = null;
  id: string;

  constructor(value: number) {
    this.value = value;
    this.id = Math.random().toString(36).substr(2, 9);
  }

  // Height (node-based): height(empty) = 0, height(leaf) = 0, height(node) = 1 + max(left, right)
  getHeight(): number {
    if (!this.left && !this.right) return 0;
    const leftHeight = this.left ? this.left.getHeight() : 0;
    const rightHeight = this.right ? this.right.getHeight() : 0;
    return 1 + Math.max(leftHeight, rightHeight);
  }

  // Depth: edges from root
  getDepth(): number {
    let depth = 0;
    let current: TreeNode | null = this;
    while (current.parent) {
      depth++;
      current = current.parent;
    }
    return depth;
  }

  // Balance factor: height(left) - height(right)
  getBalanceFactor(): number {
    const leftHeight = this.left ? this.left.getHeight() : 0;
    const rightHeight = this.right ? this.right.getHeight() : 0;
    return leftHeight - rightHeight;
  }
}

export function BinaryTreeMode() {
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [insertMode, setInsertMode] = useState<'bst' | 'manual'>('bst');
  const [overlays, setOverlays] = useState({
    height: true,
    depth: true,
    balanceFactor: true,
    highlightUnbalanced: true,
  });
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const forceUpdate = () => setUpdateTrigger(prev => prev + 1);

  const addEvent = (event: string) => {
    setEvents((prev) => [...prev, event]);
  };

  const insertBST = (value: number) => {
    if (root === null) {
      const newNode = new TreeNode(value);
      setRoot(newNode);
      addEvent(`Inserted ${value} as root`);
      return;
    }

    let current = root;
    while (true) {
      if (value < current.value) {
        if (current.left === null) {
          const newNode = new TreeNode(value);
          current.left = newNode;
          newNode.parent = current;
          forceUpdate();
          addEvent(`Inserted ${value} as left child of ${current.value}`);
          return;
        }
        current = current.left;
      } else {
        if (current.right === null) {
          const newNode = new TreeNode(value);
          current.right = newNode;
          newNode.parent = current;
          forceUpdate();
          addEvent(`Inserted ${value} as right child of ${current.value}`);
          return;
        }
        current = current.right;
      }
    }
  };

  const deleteNode = (node: TreeNode) => {
    if (!root) return;

    // Case 1: Leaf node
    if (!node.left && !node.right) {
      if (node.parent) {
        if (node.parent.left === node) {
          node.parent.left = null;
        } else {
          node.parent.right = null;
        }
        forceUpdate();
      } else {
        setRoot(null);
      }
      addEvent(`Deleted leaf node ${node.value}`);
      setSelectedNode(null);
      return;
    }

    // Case 2: One child
    if (!node.left || !node.right) {
      const child = node.left || node.right;
      if (child) {
        if (node.parent) {
          if (node.parent.left === node) {
            node.parent.left = child;
          } else {
            node.parent.right = child;
          }
          child.parent = node.parent;
          forceUpdate();
        } else {
          child.parent = null;
          setRoot(child);
        }
      }
      addEvent(`Deleted node ${node.value} (one child)`);
      setSelectedNode(null);
      return;
    }

    // Case 3: Two children - find inorder successor
    let successor = node.right;
    while (successor.left) {
      successor = successor.left;
    }
    node.value = successor.value;
    
    // Delete successor
    if (successor.parent) {
      if (successor.parent.left === successor) {
        successor.parent.left = successor.right;
      } else {
        successor.parent.right = successor.right;
      }
      if (successor.right) {
        successor.right.parent = successor.parent;
      }
    }
    forceUpdate();
    addEvent(`Deleted node (replaced with successor ${successor.value})`);
  };

  const editNodeValue = (node: TreeNode, newValue: number) => {
    node.value = newValue;
    forceUpdate();
    addEvent(`Edited node value to ${newValue}`);
  };

  const clearTree = () => {
    setRoot(null);
    setSelectedNode(null);
    setEvents([]);
    addEvent('Cleared tree');
  };

  const validateBST = (node: TreeNode | null, min: number = -Infinity, max: number = Infinity): string[] => {
    if (!node) return [];
    const violations: string[] = [];

    if (node.value <= min || node.value >= max) {
      violations.push(`Node ${node.value} violates BST property`);
    }

    violations.push(...validateBST(node.left, min, node.value));
    violations.push(...validateBST(node.right, node.value, max));

    return violations;
  };

  const violations = insertMode === 'bst' ? validateBST(root) : [];

  const inspectorData = selectedNode
    ? [
        { label: 'Value', value: selectedNode.value },
        { label: 'Parent', value: selectedNode.parent?.value ?? 'null' },
        { label: 'Left', value: selectedNode.left?.value ?? 'null' },
        { label: 'Right', value: selectedNode.right?.value ?? 'null' },
        { label: 'Depth/Level', value: selectedNode.getDepth() },
        { label: 'Height', value: selectedNode.getHeight() },
        { label: 'Balance Factor', value: selectedNode.getBalanceFactor(), highlight: Math.abs(selectedNode.getBalanceFactor()) > 1 },
      ]
    : [];

  return (
    <div className="h-full flex">
      {/* Left Controls */}
      <div className="w-72 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <h3 className="font-semibold text-slate-900 mb-4">Controls</h3>

        {/* Insert Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Insert Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setInsertMode('bst')}
              className={`flex-1 px-3 py-2 rounded text-sm ${
                insertMode === 'bst'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              BST Insert
            </button>
            <button
              onClick={() => setInsertMode('manual')}
              className={`flex-1 px-3 py-2 rounded text-sm ${
                insertMode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        {/* Add Node */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Add Node
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('value') as HTMLInputElement;
              const value = parseInt(input.value);
              if (!isNaN(value)) {
                if (insertMode === 'bst') {
                  insertBST(value);
                } else {
                  // Manual mode requires selecting a parent first
                  if (!selectedNode && !root) {
                    const newNode = new TreeNode(value);
                    setRoot(newNode);
                    addEvent(`Created root node ${value}`);
                  } else if (selectedNode) {
                    addEvent(`Manual mode: Select left/right to attach ${value}`);
                  }
                }
                input.value = '';
              }
            }}
            className="flex gap-2"
          >
            <input
              type="number"
              name="value"
              placeholder="Value"
              className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
          {insertMode === 'manual' && selectedNode && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  const input = document.querySelector('input[name="value"]') as HTMLInputElement;
                  const value = parseInt(input.value);
                  if (!isNaN(value) && !selectedNode.left) {
                    const newNode = new TreeNode(value);
                    selectedNode.left = newNode;
                    newNode.parent = selectedNode;
                    forceUpdate();
                    addEvent(`Attached ${value} as left child of ${selectedNode.value}`);
                    input.value = '';
                  }
                }}
                className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs"
                disabled={selectedNode.left !== null}
              >
                Attach Left
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector('input[name="value"]') as HTMLInputElement;
                  const value = parseInt(input.value);
                  if (!isNaN(value) && !selectedNode.right) {
                    const newNode = new TreeNode(value);
                    selectedNode.right = newNode;
                    newNode.parent = selectedNode;
                    forceUpdate();
                    addEvent(`Attached ${value} as right child of ${selectedNode.value}`);
                    input.value = '';
                  }
                }}
                className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs"
                disabled={selectedNode.right !== null}
              >
                Attach Right
              </button>
            </div>
          )}
        </div>

        {/* Node Actions */}
        {selectedNode && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Node Actions
            </label>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const newValue = prompt('Enter new value:');
                  if (newValue !== null) {
                    const val = parseInt(newValue);
                    if (!isNaN(val)) {
                      editNodeValue(selectedNode, val);
                    }
                  }
                }}
                className="w-full px-3 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Value
              </button>
              <button
                onClick={() => deleteNode(selectedNode)}
                className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Node
              </button>
            </div>
          </div>
        )}

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
                checked={overlays.depth}
                onChange={(e) => setOverlays({ ...overlays, depth: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-700">Depth/Level</span>
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
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={overlays.highlightUnbalanced}
                onChange={(e) => setOverlays({ ...overlays, highlightUnbalanced: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-700">Highlight |BF| &gt; 1</span>
            </label>
          </div>
        </div>

        {/* Clear */}
        <button
          onClick={clearTree}
          className="w-full px-3 py-2 bg-slate-600 text-white rounded text-sm hover:bg-slate-700 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Clear Tree
        </button>

        {/* Event Log */}
        <div className="mt-6">
          <EventLog events={events} />
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-slate-50 overflow-auto p-8">
        {root ? (
          <TreeVisualization
            root={root}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            overlays={overlays}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400">Add a node to start building the tree</p>
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
  );
}

function TreeVisualization({
  root,
  selectedNode,
  onSelectNode,
  overlays,
}: {
  root: TreeNode;
  selectedNode: TreeNode | null;
  onSelectNode: (node: TreeNode) => void;
  overlays: any;
}) {
  const renderNode = (node: TreeNode | null, x: number, y: number, offset: number): JSX.Element | null => {
    if (!node) return null;

    const isSelected = selectedNode?.id === node.id;
    const isUnbalanced = Math.abs(node.getBalanceFactor()) > 1;
    const shouldHighlight = overlays.highlightUnbalanced && isUnbalanced;

    return (
      <g key={node.id}>
        {/* Left edge */}
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
        {/* Right edge */}
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

        {/* Node circle */}
        <circle
          cx={x}
          cy={y}
          r="28"
          fill={isSelected ? '#3b82f6' : shouldHighlight ? '#ef4444' : 'white'}
          stroke={shouldHighlight ? '#dc2626' : '#64748b'}
          strokeWidth="2"
          className="cursor-pointer"
          onClick={() => onSelectNode(node)}
        />
        
        {/* Node value */}
        <text
          x={x}
          y={y + 5}
          textAnchor="middle"
          className={`text-sm font-semibold ${isSelected ? 'fill-white' : 'fill-slate-900'}`}
        >
          {node.value}
        </text>

        {/* Overlays */}
        {overlays.height && (
          <text x={x - 50} y={y + 5} className="text-xs fill-blue-600">
            H:{node.getHeight()}
          </text>
        )}
        {overlays.depth && (
          <text x={x + 40} y={y + 5} className="text-xs fill-green-600">
            D:{node.getDepth()}
          </text>
        )}
        {overlays.balanceFactor && (
          <text x={x} y={y + 45} className="text-xs fill-purple-600">
            BF:{node.getBalanceFactor()}
          </text>
        )}

        {/* Recursive rendering */}
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