import React, { useState, useEffect, useRef } from 'react';
import { Inspector } from './shared/Inspector';
import { Stepper } from './shared/Stepper';
import { EventLog } from './shared/EventLog';
import { Plus, Trash2, RefreshCw, ArrowDown, ArrowUp } from 'lucide-react';

interface AlgorithmStep {
  type: 'insert' | 'sift-up' | 'sift-down' | 'swap' | 'extract' | 'complete' | 'change-key';
  description: string;
  heap: number[];
  activeIndices?: number[];
  swapIndices?: [number, number];
}

export function HeapMode() {
  const [heap, setHeap] = useState<number[]>([]);
  const [heapType, setHeapType] = useState<'min' | 'max'>('min');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
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

  const parent = (i: number) => Math.floor((i - 1) / 2);
  const leftChild = (i: number) => 2 * i + 1;
  const rightChild = (i: number) => 2 * i + 2;

  const compare = (a: number, b: number): boolean => {
    return heapType === 'min' ? a < b : a > b;
  };

  const insertHeap = (value: number) => {
    const algorithmSteps: AlgorithmStep[] = [];
    const currentHeap = [...heap];

    currentHeap.push(value);
    algorithmSteps.push({
      type: 'insert',
      description: `Insert ${value} at end of heap (index ${currentHeap.length - 1})`,
      heap: [...currentHeap],
      activeIndices: [currentHeap.length - 1],
    });

    // Sift up
    let idx = currentHeap.length - 1;
    while (idx > 0) {
      const parentIdx = parent(idx);
      
      algorithmSteps.push({
        type: 'sift-up',
        description: `Compare ${currentHeap[idx]} at index ${idx} with parent ${currentHeap[parentIdx]} at index ${parentIdx}`,
        heap: [...currentHeap],
        activeIndices: [idx, parentIdx],
      });

      if (compare(currentHeap[idx], currentHeap[parentIdx])) {
        // Swap
        [currentHeap[idx], currentHeap[parentIdx]] = [currentHeap[parentIdx], currentHeap[idx]];
        algorithmSteps.push({
          type: 'swap',
          description: `Swap ${currentHeap[parentIdx]} and ${currentHeap[idx]}`,
          heap: [...currentHeap],
          swapIndices: [idx, parentIdx],
        });
        idx = parentIdx;
      } else {
        break;
      }
    }

    algorithmSteps.push({
      type: 'complete',
      description: 'Insertion complete - heap property restored',
      heap: [...currentHeap],
    });

    setSteps(algorithmSteps);
    setCurrentStep(0);
    addEvent(`Insert ${value}`);
  };

  const extractRoot = () => {
    if (heap.length === 0) return;

    const algorithmSteps: AlgorithmStep[] = [];
    const currentHeap = [...heap];
    const root = currentHeap[0];

    if (currentHeap.length === 1) {
      currentHeap.pop();
      algorithmSteps.push({
        type: 'extract',
        description: `Extract root ${root} (only element)`,
        heap: [...currentHeap],
      });
      setSteps(algorithmSteps);
      setCurrentStep(0);
      addEvent(`Extract ${root}`);
      return;
    }

    // Move last to root
    currentHeap[0] = currentHeap[currentHeap.length - 1];
    currentHeap.pop();

    algorithmSteps.push({
      type: 'extract',
      description: `Extract root ${root}, move last element ${currentHeap[0]} to root`,
      heap: [...currentHeap],
      activeIndices: [0],
    });

    // Sift down
    let idx = 0;
    while (true) {
      const left = leftChild(idx);
      const right = rightChild(idx);
      let targetIdx = idx;

      algorithmSteps.push({
        type: 'sift-down',
        description: `Check children of ${currentHeap[idx]} at index ${idx}`,
        heap: [...currentHeap],
        activeIndices: [idx, left, right].filter(i => i < currentHeap.length),
      });

      if (left < currentHeap.length && compare(currentHeap[left], currentHeap[targetIdx])) {
        targetIdx = left;
      }
      if (right < currentHeap.length && compare(currentHeap[right], currentHeap[targetIdx])) {
        targetIdx = right;
      }

      if (targetIdx !== idx) {
        [currentHeap[idx], currentHeap[targetIdx]] = [currentHeap[targetIdx], currentHeap[idx]];
        algorithmSteps.push({
          type: 'swap',
          description: `Swap ${currentHeap[targetIdx]} and ${currentHeap[idx]}`,
          heap: [...currentHeap],
          swapIndices: [idx, targetIdx],
        });
        idx = targetIdx;
      } else {
        break;
      }
    }

    algorithmSteps.push({
      type: 'complete',
      description: `Extraction complete - extracted ${root}`,
      heap: [...currentHeap],
    });

    setSteps(algorithmSteps);
    setCurrentStep(0);
    addEvent(`Extract ${root}`);
  };

  const deleteAtIndex = (index: number) => {
    if (index < 0 || index >= heap.length) return;
    
    const currentHeap = [...heap];
    const value = currentHeap[index];
    
    // Replace with last element
    currentHeap[index] = currentHeap[currentHeap.length - 1];
    currentHeap.pop();
    
    setHeap(currentHeap);
    addEvent(`Delete ${value} at index ${index} (simplified)`);
    setSelectedIndex(null);
  };

  const changeKey = (index: number, newValue: number) => {
    if (index < 0 || index >= heap.length) return;

    const algorithmSteps: AlgorithmStep[] = [];
    const currentHeap = [...heap];
    const oldValue = currentHeap[index];
    currentHeap[index] = newValue;

    algorithmSteps.push({
      type: 'change-key',
      description: `Change key at index ${index} from ${oldValue} to ${newValue}`,
      heap: [...currentHeap],
      activeIndices: [index],
    });

    // Decide whether to sift up or down
    const shouldSiftUp = (heapType === 'min' && newValue < oldValue) || (heapType === 'max' && newValue > oldValue);

    if (shouldSiftUp) {
      // Sift up
      let idx = index;
      while (idx > 0) {
        const parentIdx = parent(idx);
        if (compare(currentHeap[idx], currentHeap[parentIdx])) {
          [currentHeap[idx], currentHeap[parentIdx]] = [currentHeap[parentIdx], currentHeap[idx]];
          algorithmSteps.push({
            type: 'swap',
            description: `Sift up: Swap ${currentHeap[parentIdx]} and ${currentHeap[idx]}`,
            heap: [...currentHeap],
            swapIndices: [idx, parentIdx],
          });
          idx = parentIdx;
        } else {
          break;
        }
      }
    } else {
      // Sift down
      let idx = index;
      while (true) {
        const left = leftChild(idx);
        const right = rightChild(idx);
        let targetIdx = idx;

        if (left < currentHeap.length && compare(currentHeap[left], currentHeap[targetIdx])) {
          targetIdx = left;
        }
        if (right < currentHeap.length && compare(currentHeap[right], currentHeap[targetIdx])) {
          targetIdx = right;
        }

        if (targetIdx !== idx) {
          [currentHeap[idx], currentHeap[targetIdx]] = [currentHeap[targetIdx], currentHeap[idx]];
          algorithmSteps.push({
            type: 'swap',
            description: `Sift down: Swap ${currentHeap[targetIdx]} and ${currentHeap[idx]}`,
            heap: [...currentHeap],
            swapIndices: [idx, targetIdx],
          });
          idx = targetIdx;
        } else {
          break;
        }
      }
    }

    algorithmSteps.push({
      type: 'complete',
      description: 'Key change complete',
      heap: [...currentHeap],
    });

    setSteps(algorithmSteps);
    setCurrentStep(0);
    addEvent(`Change key at index ${index}: ${oldValue} → ${newValue}`);
  };

  const stepForward = () => {
    if (currentStep < steps.length) {
      const step = steps[currentStep];
      setHeap([...step.heap]);
      setCurrentStep(currentStep + 1);
    }
  };

  const stepBackward = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      const step = steps[newStep];
      setHeap([...step.heap]);
      setCurrentStep(newStep);
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setIsRunning(false);
    if (steps.length > 0) {
      setHeap([...steps[0].heap]);
    }
  };

  const clearHeap = () => {
    setHeap([]);
    setSelectedIndex(null);
    setEvents([]);
    setSteps([]);
    setCurrentStep(0);
    addEvent('Cleared heap');
  };

  const validateHeap = (): string[] => {
    const violations: string[] = [];
    for (let i = 0; i < heap.length; i++) {
      const left = leftChild(i);
      const right = rightChild(i);
      
      if (left < heap.length && !compare(heap[i], heap[left])) {
        violations.push(`Heap property violated at index ${i} and left child ${left}`);
      }
      if (right < heap.length && !compare(heap[i], heap[right])) {
        violations.push(`Heap property violated at index ${i} and right child ${right}`);
      }
    }
    return violations;
  };

  const violations = validateHeap();
  const currentStepData = steps[currentStep] || steps[currentStep - 1];
  const inspectorData = selectedIndex !== null && selectedIndex < heap.length
    ? [
        { label: 'Index', value: selectedIndex },
        { label: 'Value', value: heap[selectedIndex] },
        { label: 'Parent Index', value: selectedIndex > 0 ? parent(selectedIndex) : 'none' },
        { label: 'Parent Value', value: selectedIndex > 0 ? heap[parent(selectedIndex)] : 'none' },
        { label: 'Left Child Index', value: leftChild(selectedIndex) < heap.length ? leftChild(selectedIndex) : 'none' },
        { label: 'Right Child Index', value: rightChild(selectedIndex) < heap.length ? rightChild(selectedIndex) : 'none' },
      ]
    : [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Controls */}
        <div className="w-72 bg-white border-r border-slate-200 p-4 overflow-y-auto">
          <h3 className="font-semibold text-slate-900 mb-4">Heap Controls</h3>

          {/* Heap Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Heap Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setHeapType('min');
                  clearHeap();
                }}
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  heapType === 'min'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Min-Heap
              </button>
              <button
                onClick={() => {
                  setHeapType('max');
                  clearHeap();
                }}
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  heapType === 'max'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Max-Heap
              </button>
            </div>
          </div>

          {/* Insert */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Insert Value
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('value') as HTMLInputElement;
                const value = parseInt(input.value);
                if (!isNaN(value)) {
                  insertHeap(value);
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

          {/* Extract Root */}
          <button
            onClick={extractRoot}
            className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center justify-center gap-2 mb-4"
            disabled={isRunning || heap.length === 0}
          >
            <ArrowDown className="w-4 h-4" />
            Extract Root
          </button>

          {/* Selected Node Actions */}
          {selectedIndex !== null && selectedIndex < heap.length && (
            <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="text-sm font-medium text-slate-900 mb-2">
                Selected Index: {selectedIndex}
              </h4>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const newValue = prompt('Enter new value:');
                    if (newValue !== null) {
                      const val = parseInt(newValue);
                      if (!isNaN(val)) {
                        changeKey(selectedIndex, val);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700"
                  disabled={isRunning}
                >
                  Change Key
                </button>
                <button
                  onClick={() => deleteAtIndex(selectedIndex)}
                  className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  disabled={isRunning}
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Clear */}
          <button
            onClick={clearHeap}
            className="w-full px-3 py-2 bg-slate-600 text-white rounded text-sm hover:bg-slate-700 flex items-center justify-center gap-2 mb-6"
            disabled={isRunning}
          >
            <RefreshCw className="w-4 h-4" />
            Clear Heap
          </button>

          {/* Event Log */}
          <EventLog events={events} />
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-slate-50 overflow-auto p-8">
          {heap.length > 0 ? (
            <div className="space-y-8">
              {/* Tree View */}
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-4">Tree Representation</h3>
                <HeapTreeVisualization
                  heap={heap}
                  selectedIndex={selectedIndex}
                  onSelectIndex={setSelectedIndex}
                  activeIndices={currentStepData?.activeIndices || []}
                  swapIndices={currentStepData?.swapIndices}
                />
              </div>

              {/* Array View */}
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-4">Array Representation</h3>
                <HeapArrayVisualization
                  heap={heap}
                  selectedIndex={selectedIndex}
                  onSelectIndex={setSelectedIndex}
                  activeIndices={currentStepData?.activeIndices || []}
                  swapIndices={currentStepData?.swapIndices}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400">Insert a value to start building the heap</p>
            </div>
          )}
        </div>

        {/* Inspector */}
        <div className="w-80">
          <Inspector
            title="Element Inspector"
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

function HeapTreeVisualization({
  heap,
  selectedIndex,
  onSelectIndex,
  activeIndices,
  swapIndices,
}: {
  heap: number[];
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
  activeIndices: number[];
  swapIndices?: [number, number];
}) {
  const renderNode = (index: number, x: number, y: number, offset: number): JSX.Element | null => {
    if (index >= heap.length) return null;

    const left = 2 * index + 1;
    const right = 2 * index + 2;
    const isSelected = selectedIndex === index;
    const isActive = activeIndices.includes(index);
    const isSwapping = swapIndices && (swapIndices[0] === index || swapIndices[1] === index);

    return (
      <g key={index}>
        {left < heap.length && (
          <line
            x1={x}
            y1={y}
            x2={x - offset}
            y2={y + 70}
            stroke="#94a3b8"
            strokeWidth="2"
          />
        )}
        {right < heap.length && (
          <line
            x1={x}
            y1={y}
            x2={x + offset}
            y2={y + 70}
            stroke="#94a3b8"
            strokeWidth="2"
          />
        )}

        <circle
          cx={x}
          cy={y}
          r="25"
          fill={isSwapping ? '#f97316' : isActive ? '#fbbf24' : isSelected ? '#3b82f6' : 'white'}
          stroke="#64748b"
          strokeWidth="2"
          className="cursor-pointer"
          onClick={() => onSelectIndex(index)}
        />
        
        <text
          x={x}
          y={y + 5}
          textAnchor="middle"
          className={`text-sm font-semibold ${isSwapping || isActive || isSelected ? 'fill-white' : 'fill-slate-900'}`}
        >
          {heap[index]}
        </text>

        <text
          x={x}
          y={y + 40}
          textAnchor="middle"
          className="text-xs fill-slate-500"
        >
          [{index}]
        </text>

        {renderNode(left, x - offset, y + 70, offset / 2)}
        {renderNode(right, x + offset, y + 70, offset / 2)}
      </g>
    );
  };

  return (
    <svg width="100%" height="400" className="min-w-[800px]">
      {renderNode(0, 400, 50, 150)}
    </svg>
  );
}

function HeapArrayVisualization({
  heap,
  selectedIndex,
  onSelectIndex,
  activeIndices,
  swapIndices,
}: {
  heap: number[];
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
  activeIndices: number[];
  swapIndices?: [number, number];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {heap.map((value, index) => {
        const isSelected = selectedIndex === index;
        const isActive = activeIndices.includes(index);
        const isSwapping = swapIndices && (swapIndices[0] === index || swapIndices[1] === index);

        return (
          <div
            key={index}
            onClick={() => onSelectIndex(index)}
            className={`w-16 h-16 border-2 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isSwapping
                ? 'bg-orange-500 text-white border-orange-600'
                : isActive
                ? 'bg-yellow-400 text-white border-yellow-500'
                : isSelected
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-white border-slate-300 hover:border-slate-400'
            }`}
          >
            <div className={`text-lg font-semibold ${!isSwapping && !isActive && !isSelected ? 'text-slate-900' : ''}`}>
              {value}
            </div>
            <div className={`text-xs ${isSwapping || isActive || isSelected ? 'text-white' : 'text-slate-500'}`}>
              [{index}]
            </div>
          </div>
        );
      })}
    </div>
  );
}
