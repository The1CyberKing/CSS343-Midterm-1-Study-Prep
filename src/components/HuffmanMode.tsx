import React, { useState, useEffect, useRef } from 'react';
import { Inspector } from './shared/Inspector';
import { Stepper } from './shared/Stepper';
import { EventLog } from './shared/EventLog';
import { Plus, Trash2, RefreshCw, FileText, Binary } from 'lucide-react';

interface HuffmanNode {
  symbol: string | null;
  frequency: number;
  left: HuffmanNode | null;
  right: HuffmanNode | null;
  id: string;
}

interface FrequencyEntry {
  symbol: string;
  frequency: number;
}

interface CodeEntry {
  symbol: string;
  code: string;
  length: number;
}

interface AlgorithmStep {
  type: 'pop' | 'merge' | 'push' | 'complete';
  description: string;
  pq: HuffmanNode[];
  tree?: HuffmanNode;
}

export function HuffmanMode() {
  const [inputMode, setInputMode] = useState<'manual' | 'text'>('manual');
  const [frequencies, setFrequencies] = useState<FrequencyEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [tree, setTree] = useState<HuffmanNode | null>(null);
  const [codes, setCodes] = useState<CodeEntry[]>([]);
  const [canonical, setCanonical] = useState(false);
  const [selectedNode, setSelectedNode] = useState<HuffmanNode | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [encodeText, setEncodeText] = useState('');
  const [encodedBits, setEncodedBits] = useState('');
  const [decodeText, setDecodeText] = useState('');

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

  const computeFrequenciesFromText = (text: string): FrequencyEntry[] => {
    const freqMap = new Map<string, number>();
    for (const char of text) {
      freqMap.set(char, (freqMap.get(char) || 0) + 1);
    }
    return Array.from(freqMap.entries()).map(([symbol, frequency]) => ({ symbol, frequency }));
  };

  const buildHuffmanTree = () => {
    const algorithmSteps: AlgorithmStep[] = [];
    const freqList = inputMode === 'text' ? computeFrequenciesFromText(inputText) : frequencies;

    if (freqList.length === 0) {
      addEvent('No frequencies to build tree');
      return;
    }

    // Create leaf nodes
    const pq: HuffmanNode[] = freqList.map(({ symbol, frequency }) => ({
      symbol,
      frequency,
      left: null,
      right: null,
      id: Math.random().toString(36).substr(2, 9),
    }));

    pq.sort((a, b) => a.frequency - b.frequency);

    algorithmSteps.push({
      type: 'complete',
      description: `Initialize priority queue with ${pq.length} symbols`,
      pq: [...pq],
    });

    while (pq.length > 1) {
      // Pop two minimum
      const left = pq.shift()!;
      const right = pq.shift()!;

      algorithmSteps.push({
        type: 'pop',
        description: `Pop two minimum: '${left.symbol || 'internal'}' (freq: ${left.frequency}) and '${right.symbol || 'internal'}' (freq: ${right.frequency})`,
        pq: [...pq],
      });

      // Merge
      const merged: HuffmanNode = {
        symbol: null,
        frequency: left.frequency + right.frequency,
        left,
        right,
        id: Math.random().toString(36).substr(2, 9),
      };

      algorithmSteps.push({
        type: 'merge',
        description: `Merge into new node with frequency ${merged.frequency}`,
        pq: [...pq],
        tree: merged,
      });

      // Push back
      pq.push(merged);
      pq.sort((a, b) => a.frequency - b.frequency);

      algorithmSteps.push({
        type: 'push',
        description: `Push merged node back to PQ`,
        pq: [...pq],
      });
    }

    const finalTree = pq[0];
    algorithmSteps.push({
      type: 'complete',
      description: 'Huffman tree complete!',
      pq: [],
      tree: finalTree,
    });

    setSteps(algorithmSteps);
    setCurrentStep(0);
    addEvent(`Built Huffman tree with ${freqList.length} symbols`);
  };

  const generateCodes = (node: HuffmanNode | null, code: string = '', codesMap: Map<string, string> = new Map()): Map<string, string> => {
    if (!node) return codesMap;
    
    if (node.symbol !== null) {
      codesMap.set(node.symbol, code || '0'); // Handle single-symbol case
    }
    
    generateCodes(node.left, code + '0', codesMap);
    generateCodes(node.right, code + '1', codesMap);
    
    return codesMap;
  };

  const generateCanonicalCodes = (standardCodes: Map<string, string>): Map<string, string> => {
    // Sort by length, then lexicographically by symbol
    const entries = Array.from(standardCodes.entries()).map(([symbol, code]) => ({
      symbol,
      length: code.length,
    }));
    entries.sort((a, b) => a.length - b.length || a.symbol.localeCompare(b.symbol));

    const canonicalCodes = new Map<string, string>();
    let code = 0;
    let prevLength = 0;

    for (const entry of entries) {
      if (entry.length > prevLength) {
        code <<= (entry.length - prevLength);
        prevLength = entry.length;
      }
      canonicalCodes.set(entry.symbol, code.toString(2).padStart(entry.length, '0'));
      code++;
    }

    return canonicalCodes;
  };

  const finalizeCodes = () => {
    if (!tree) return;

    const standardCodes = generateCodes(tree);
    const finalCodes = canonical ? generateCanonicalCodes(standardCodes) : standardCodes;
    
    const codeEntries: CodeEntry[] = Array.from(finalCodes.entries()).map(([symbol, code]) => ({
      symbol,
      code,
      length: code.length,
    }));
    codeEntries.sort((a, b) => a.symbol.localeCompare(b.symbol));

    setCodes(codeEntries);
    addEvent(`Generated ${canonical ? 'canonical' : 'standard'} Huffman codes`);
  };

  const encode = (text: string) => {
    const codeMap = new Map(codes.map(c => [c.symbol, c.code]));
    const bits = text.split('').map(char => codeMap.get(char) || '?').join('');
    setEncodedBits(bits);
    addEvent(`Encoded "${text}" to ${bits.length} bits`);
  };

  const decode = (bits: string) => {
    if (!tree) return;

    let result = '';
    let current = tree;

    for (const bit of bits) {
      if (bit === '0') {
        current = current.left!;
      } else if (bit === '1') {
        current = current.right!;
      }

      if (current && current.symbol !== null) {
        result += current.symbol;
        current = tree;
      }
    }

    setDecodeText(result);
    addEvent(`Decoded ${bits.length} bits to "${result}"`);
  };

  const stepForward = () => {
    if (currentStep < steps.length) {
      const step = steps[currentStep];
      if (step.tree) {
        setTree(step.tree);
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const stepBackward = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      const step = steps[newStep];
      if (step.tree) {
        setTree(step.tree);
      } else if (newStep === 0) {
        setTree(null);
      }
      setCurrentStep(newStep);
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setIsRunning(false);
    setTree(null);
    setCodes([]);
  };

  const clearAll = () => {
    setFrequencies([]);
    setInputText('');
    setTree(null);
    setCodes([]);
    setEvents([]);
    setSteps([]);
    setCurrentStep(0);
    setEncodedBits('');
    setDecodeText('');
    addEvent('Cleared all');
  };

  useEffect(() => {
    if (tree) {
      finalizeCodes();
    }
  }, [tree, canonical]);

  const currentStepData = steps[currentStep] || steps[currentStep - 1];
  const inspectorData = selectedNode
    ? [
        { label: 'Symbol', value: selectedNode.symbol || 'Internal' },
        { label: 'Frequency', value: selectedNode.frequency },
        { label: 'Is Leaf', value: selectedNode.symbol !== null ? 'Yes' : 'No' },
      ]
    : [];

  const originalBits = inputMode === 'text' ? inputText.length * 8 : 0;
  const compressedBits = encodedBits.length;
  const compressionRatio = originalBits > 0 ? ((1 - compressedBits / originalBits) * 100).toFixed(2) : '0';

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Controls */}
        <div className="w-80 bg-white border-r border-slate-200 p-4 overflow-y-auto">
          <h3 className="font-semibold text-slate-900 mb-4">Huffman Controls</h3>

          {/* Input Mode */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Input Source
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setInputMode('manual')}
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  inputMode === 'manual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Manual
              </button>
              <button
                onClick={() => setInputMode('text')}
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  inputMode === 'text'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Text
              </button>
            </div>
          </div>

          {inputMode === 'manual' ? (
            <>
              {/* Manual Frequency Table */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Frequency Table
                </label>
                <div className="space-y-2 mb-2">
                  {frequencies.map((entry, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={entry.symbol}
                        onChange={(e) => {
                          const newFreq = [...frequencies];
                          newFreq[idx].symbol = e.target.value;
                          setFrequencies(newFreq);
                        }}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
                        placeholder="Symbol"
                        maxLength={1}
                      />
                      <input
                        type="number"
                        value={entry.frequency}
                        onChange={(e) => {
                          const newFreq = [...frequencies];
                          newFreq[idx].frequency = parseInt(e.target.value) || 0;
                          setFrequencies(newFreq);
                        }}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                        placeholder="Freq"
                      />
                      <button
                        onClick={() => {
                          setFrequencies(frequencies.filter((_, i) => i !== idx));
                        }}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setFrequencies([...frequencies, { symbol: '', frequency: 1 }])}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Symbol
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Text Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Input Text
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono"
                  rows={4}
                  placeholder="Enter text to compute frequencies..."
                />
              </div>
            </>
          )}

          {/* Build Tree */}
          <button
            onClick={buildHuffmanTree}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-2 mb-4"
            disabled={isRunning || (inputMode === 'manual' && frequencies.length === 0) || (inputMode === 'text' && inputText.length === 0)}
          >
            Build Huffman Tree
          </button>

          {/* Canonical Toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={canonical}
                onChange={(e) => setCanonical(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-slate-700">Use Canonical Huffman Codes</span>
            </label>
          </div>

          {/* Encode/Decode */}
          {codes.length > 0 && (
            <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="text-sm font-medium text-slate-900 mb-2">Encode</h4>
              <input
                type="text"
                value={encodeText}
                onChange={(e) => setEncodeText(e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm mb-2"
                placeholder="Text to encode"
              />
              <button
                onClick={() => encode(encodeText)}
                className="w-full px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 mb-2"
              >
                Encode
              </button>
              {encodedBits && (
                <div className="p-2 bg-white border border-slate-300 rounded text-xs font-mono break-all">
                  {encodedBits}
                </div>
              )}

              <h4 className="text-sm font-medium text-slate-900 mb-2 mt-4">Decode</h4>
              <input
                type="text"
                value={encodedBits}
                onChange={(e) => setEncodedBits(e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm mb-2 font-mono"
                placeholder="Bits to decode"
              />
              <button
                onClick={() => decode(encodedBits)}
                className="w-full px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 mb-2"
              >
                Decode
              </button>
              {decodeText && (
                <div className="p-2 bg-white border border-slate-300 rounded text-xs">
                  {decodeText}
                </div>
              )}
            </div>
          )}

          {/* Clear */}
          <button
            onClick={clearAll}
            className="w-full px-3 py-2 bg-slate-600 text-white rounded text-sm hover:bg-slate-700 flex items-center justify-center gap-2 mb-6"
            disabled={isRunning}
          >
            <RefreshCw className="w-4 h-4" />
            Clear All
          </button>

          {/* Event Log */}
          <EventLog events={events} />
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-slate-50 overflow-auto p-8">
          <div className="space-y-8">
            {/* Priority Queue */}
            {currentStepData && currentStepData.pq && currentStepData.pq.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-4">Priority Queue</h3>
                <div className="flex flex-wrap gap-2">
                  {currentStepData.pq.map((node) => (
                    <div
                      key={node.id}
                      className="px-4 py-2 bg-white border-2 border-slate-300 rounded-lg"
                    >
                      <div className="text-sm font-semibold">{node.symbol || 'Internal'}</div>
                      <div className="text-xs text-slate-500">freq: {node.frequency}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Huffman Tree */}
            {tree && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-4">Huffman Tree</h3>
                <HuffmanTreeVisualization
                  root={tree}
                  selectedNode={selectedNode}
                  onSelectNode={setSelectedNode}
                />
              </div>
            )}

            {/* Code Table */}
            {codes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-4">
                  {canonical ? 'Canonical ' : ''}Huffman Codes
                </h3>
                <div className="grid grid-cols-3 gap-2 max-w-md">
                  <div className="font-semibold text-xs text-slate-600">Symbol</div>
                  <div className="font-semibold text-xs text-slate-600">Code</div>
                  <div className="font-semibold text-xs text-slate-600">Length</div>
                  {codes.map((entry) => (
                    <React.Fragment key={entry.symbol}>
                      <div className="text-sm font-mono">{entry.symbol === ' ' ? '(space)' : entry.symbol}</div>
                      <div className="text-sm font-mono text-blue-600">{entry.code}</div>
                      <div className="text-sm text-slate-600">{entry.length}</div>
                    </React.Fragment>
                  ))}
                </div>

                {/* Compression Stats */}
                {inputMode === 'text' && inputText && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Compression Statistics</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <div>Original: {originalBits} bits ({inputText.length} chars × 8)</div>
                      <div>Compressed: {compressedBits} bits</div>
                      <div>Compression ratio: {compressionRatio}%</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!tree && !currentStepData && (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400">Configure frequencies and build the Huffman tree</p>
              </div>
            )}
          </div>
        </div>

        {/* Inspector */}
        <div className="w-80">
          <Inspector
            title="Node Inspector"
            data={inspectorData}
          />
        </div>
      </div>

      {/* Stepper */}
      <Stepper
        currentStep={currentStep}
        totalSteps={steps.length}
        isRunning={isRunning}
        speed={speed}
        description={currentStepData?.description || 'Configure input and build tree'}
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

function HuffmanTreeVisualization({
  root,
  selectedNode,
  onSelectNode,
}: {
  root: HuffmanNode;
  selectedNode: HuffmanNode | null;
  onSelectNode: (node: HuffmanNode) => void;
}) {
  const renderNode = (node: HuffmanNode | null, x: number, y: number, offset: number, edge: string = ''): JSX.Element | null => {
    if (!node) return null;

    const isSelected = selectedNode?.id === node.id;
    const isLeaf = node.symbol !== null;

    return (
      <g key={node.id}>
        {node.left && (
          <>
            <line
              x1={x}
              y1={y}
              x2={x - offset}
              y2={y + 80}
              stroke="#94a3b8"
              strokeWidth="2"
            />
            <text
              x={x - offset / 2}
              y={y + 35}
              className="text-xs fill-blue-600 font-semibold"
            >
              0
            </text>
          </>
        )}
        {node.right && (
          <>
            <line
              x1={x}
              y1={y}
              x2={x + offset}
              y2={y + 80}
              stroke="#94a3b8"
              strokeWidth="2"
            />
            <text
              x={x + offset / 2}
              y={y + 35}
              className="text-xs fill-red-600 font-semibold"
            >
              1
            </text>
          </>
        )}

        <circle
          cx={x}
          cy={y}
          r="28"
          fill={isSelected ? '#3b82f6' : isLeaf ? '#10b981' : 'white'}
          stroke={isLeaf ? '#059669' : '#64748b'}
          strokeWidth="2"
          className="cursor-pointer"
          onClick={() => onSelectNode(node)}
        />
        
        <text
          x={x}
          y={y + 5}
          textAnchor="middle"
          className={`text-sm font-semibold ${isSelected || isLeaf ? 'fill-white' : 'fill-slate-900'}`}
        >
          {node.symbol || node.frequency}
        </text>

        {renderNode(node.left, x - offset, y + 80, offset / 2, '0')}
        {renderNode(node.right, x + offset, y + 80, offset / 2, '1')}
      </g>
    );
  };

  return (
    <svg width="100%" height="500" className="min-w-[800px]">
      {renderNode(root, 400, 50, 150)}
    </svg>
  );
}
