import React, { useState, useEffect, useRef } from 'react';
import { Inspector } from './shared/Inspector';
import { Stepper } from './shared/Stepper';
import { EventLog } from './shared/EventLog';
import { Plus, Trash2, RefreshCw, Shuffle, ArrowRight } from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  id: string;
}

interface AlgorithmStep {
  type: string;
  description: string;
  activeNodes?: string[];
  activeEdges?: string[];
  mstEdges?: string[];
  distances?: Map<string, number>;
  pq?: Array<{ node: string; priority: number }>;
  visited?: Set<string>;
  topoResult?: string[];
  inDegrees?: Map<string, number>;
  queue?: string[];
}

type AlgorithmType = 'prim' | 'dijkstra' | 'topo' | null;

export function GraphMode() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [directed, setDirected] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>(null);
  const [startNode, setStartNode] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [edgeFrom, setEdgeFrom] = useState<string>('');
  const [edgeTo, setEdgeTo] = useState<string>('');
  const [edgeWeight, setEdgeWeight] = useState<number>(1);

  const intervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

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

  const addNode = () => {
    const newNode: GraphNode = {
      id: `N${nodes.length}`,
      label: `${nodes.length}`,
      x: 100 + Math.random() * 400,
      y: 100 + Math.random() * 300,
    };
    setNodes([...nodes, newNode]);
    addEvent(`Added node ${newNode.label}`);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setEdges(edges.filter(e => e.from !== nodeId && e.to !== nodeId));
    addEvent(`Deleted node ${nodeId}`);
    setSelectedNode(null);
  };

  const addEdge = () => {
    if (!edgeFrom || !edgeTo) return;
    
    const newEdge: GraphEdge = {
      from: edgeFrom,
      to: edgeTo,
      weight: edgeWeight,
      id: Math.random().toString(36).substr(2, 9),
    };
    setEdges([...edges, newEdge]);
    addEvent(`Added edge ${edgeFrom} → ${edgeTo} (weight: ${edgeWeight})`);
    setEdgeFrom('');
    setEdgeTo('');
    setEdgeWeight(1);
  };

  const deleteEdge = (edgeId: string) => {
    setEdges(edges.filter(e => e.id !== edgeId));
    addEvent(`Deleted edge`);
    setSelectedEdge(null);
  };

  const generateRandomGraph = () => {
    const nodeCount = 6;
    const density = 0.4;
    const newNodes: GraphNode[] = [];
    
    for (let i = 0; i < nodeCount; i++) {
      newNodes.push({
        id: `N${i}`,
        label: `${i}`,
        x: 150 + (i % 3) * 200,
        y: 100 + Math.floor(i / 3) * 200,
      });
    }

    const newEdges: GraphEdge[] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (Math.random() < density) {
          newEdges.push({
            from: `N${i}`,
            to: `N${j}`,
            weight: Math.floor(Math.random() * 10) + 1,
            id: Math.random().toString(36).substr(2, 9),
          });
        }
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
    addEvent(`Generated random graph with ${nodeCount} nodes`);
  };

  const runPrim = () => {
    if (directed) {
      addEvent('Error: Prim requires undirected graph');
      return;
    }

    if (nodes.length === 0) return;

    const algorithmSteps: AlgorithmStep[] = [];
    const mstEdges: string[] = [];
    const visited = new Set<string>();
    const pq: Array<{ from: string; to: string; weight: number; edgeId: string }> = [];

    // Start from first node
    const start = nodes[0].id;
    visited.add(start);

    algorithmSteps.push({
      type: 'start',
      description: `Start Prim from node ${start}`,
      activeNodes: [start],
      mstEdges: [],
      visited: new Set(visited),
    });

    // Add edges from start node
    edges.forEach(e => {
      if (e.from === start || e.to === start) {
        const other = e.from === start ? e.to : e.from;
        if (!visited.has(other)) {
          pq.push({ from: start, to: other, weight: e.weight, edgeId: e.id });
        }
      }
    });

    pq.sort((a, b) => a.weight - b.weight);

    while (pq.length > 0 && visited.size < nodes.length) {
      algorithmSteps.push({
        type: 'pq',
        description: `Priority queue has ${pq.length} candidates`,
        visited: new Set(visited),
        mstEdges: [...mstEdges],
        pq: pq.map(e => ({ node: e.to, priority: e.weight })),
      });

      // Extract min
      const minEdge = pq.shift()!;
      
      if (visited.has(minEdge.to)) {
        algorithmSteps.push({
          type: 'skip',
          description: `Skip edge to ${minEdge.to} (already visited)`,
          visited: new Set(visited),
          mstEdges: [...mstEdges],
        });
        continue;
      }

      // Add to MST
      visited.add(minEdge.to);
      mstEdges.push(minEdge.edgeId);

      algorithmSteps.push({
        type: 'add-mst',
        description: `Add edge ${minEdge.from} → ${minEdge.to} (weight: ${minEdge.weight}) to MST`,
        activeNodes: [minEdge.to],
        activeEdges: [minEdge.edgeId],
        visited: new Set(visited),
        mstEdges: [...mstEdges],
      });

      // Add new edges from newly added node
      edges.forEach(e => {
        const isConnected = (e.from === minEdge.to || e.to === minEdge.to);
        if (isConnected) {
          const other = e.from === minEdge.to ? e.to : e.from;
          if (!visited.has(other)) {
            pq.push({ from: minEdge.to, to: other, weight: e.weight, edgeId: e.id });
          }
        }
      });

      pq.sort((a, b) => a.weight - b.weight);
    }

    // Check if graph is connected
    if (visited.size < nodes.length) {
      const unvisited = nodes.filter(n => !visited.has(n.id)).map(n => n.label).join(', ');
      algorithmSteps.push({
        type: 'error',
        description: `Graph is disconnected! Unreachable nodes: ${unvisited}`,
        visited: new Set(visited),
        mstEdges: [...mstEdges],
      });
    } else {
      const totalWeight = edges.filter(e => mstEdges.includes(e.id)).reduce((sum, e) => sum + e.weight, 0);
      algorithmSteps.push({
        type: 'complete',
        description: `MST complete! Total weight: ${totalWeight}`,
        mstEdges: [...mstEdges],
        visited: new Set(visited),
      });
    }

    setSteps(algorithmSteps);
    setCurrentStep(0);
    addEvent('Running Prim\'s algorithm');
  };

  const runDijkstra = () => {
    if (!startNode) {
      addEvent('Error: Select a start node');
      return;
    }

    // Check for negative weights
    const hasNegative = edges.some(e => e.weight < 0);
    if (hasNegative) {
      addEvent('Error: Dijkstra does not support negative weights');
      return;
    }

    const algorithmSteps: AlgorithmStep[] = [];
    const distances = new Map<string, number>();
    const visited = new Set<string>();
    const pq: Array<{ node: string; dist: number }> = [];

    // Initialize
    nodes.forEach(n => distances.set(n.id, Infinity));
    distances.set(startNode, 0);
    pq.push({ node: startNode, dist: 0 });

    algorithmSteps.push({
      type: 'start',
      description: `Start Dijkstra from node ${startNode}`,
      activeNodes: [startNode],
      distances: new Map(distances),
      visited: new Set(),
      pq: [...pq],
    });

    while (pq.length > 0) {
      pq.sort((a, b) => a.dist - b.dist);
      const current = pq.shift()!;

      if (visited.has(current.node)) continue;

      visited.add(current.node);

      algorithmSteps.push({
        type: 'visit',
        description: `Visit node ${current.node} with distance ${current.dist}`,
        activeNodes: [current.node],
        distances: new Map(distances),
        visited: new Set(visited),
        pq: [...pq],
      });

      // Relax edges
      const outgoingEdges = edges.filter(e => 
        (directed && e.from === current.node) || 
        (!directed && (e.from === current.node || e.to === current.node))
      );

      for (const edge of outgoingEdges) {
        const neighbor = edge.from === current.node ? edge.to : edge.from;
        const newDist = distances.get(current.node)! + edge.weight;

        if (newDist < distances.get(neighbor)!) {
          distances.set(neighbor, newDist);
          pq.push({ node: neighbor, dist: newDist });

          algorithmSteps.push({
            type: 'relax',
            description: `Relax edge to ${neighbor}: distance updated to ${newDist}`,
            activeNodes: [current.node, neighbor],
            activeEdges: [edge.id],
            distances: new Map(distances),
            visited: new Set(visited),
            pq: [...pq],
          });
        }
      }
    }

    algorithmSteps.push({
      type: 'complete',
      description: 'Dijkstra complete!',
      distances: new Map(distances),
      visited: new Set(visited),
    });

    setSteps(algorithmSteps);
    setCurrentStep(0);
    addEvent('Running Dijkstra\'s algorithm');
  };

  const runTopologicalSort = () => {
    if (!directed) {
      addEvent('Error: Topological sort requires directed graph');
      return;
    }

    const algorithmSteps: AlgorithmStep[] = [];
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Calculate in-degrees
    nodes.forEach(n => inDegree.set(n.id, 0));
    edges.forEach(e => {
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    });

    algorithmSteps.push({
      type: 'init',
      description: 'Calculate in-degrees for all nodes',
      inDegrees: new Map(inDegree),
    });

    // Find nodes with in-degree 0
    nodes.forEach(n => {
      if (inDegree.get(n.id) === 0) {
        queue.push(n.id);
      }
    });

    algorithmSteps.push({
      type: 'queue',
      description: `Initial queue: ${queue.join(', ') || 'empty'}`,
      queue: [...queue],
      inDegrees: new Map(inDegree),
      topoResult: [],
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      algorithmSteps.push({
        type: 'process',
        description: `Process node ${current}, add to result`,
        activeNodes: [current],
        queue: [...queue],
        inDegrees: new Map(inDegree),
        topoResult: [...result],
      });

      // Reduce in-degree of neighbors
      const outgoing = edges.filter(e => e.from === current);
      for (const edge of outgoing) {
        const newDegree = (inDegree.get(edge.to) || 0) - 1;
        inDegree.set(edge.to, newDegree);

        if (newDegree === 0) {
          queue.push(edge.to);
          algorithmSteps.push({
            type: 'enqueue',
            description: `Node ${edge.to} in-degree became 0, add to queue`,
            activeNodes: [edge.to],
            queue: [...queue],
            inDegrees: new Map(inDegree),
            topoResult: [...result],
          });
        }
      }
    }

    // Check for cycles
    if (result.length !== nodes.length) {
      const remaining = nodes.filter(n => !result.includes(n.id)).map(n => n.label).join(', ');
      algorithmSteps.push({
        type: 'error',
        description: `Cycle detected! Remaining nodes with non-zero in-degree: ${remaining}`,
        topoResult: [...result],
        inDegrees: new Map(inDegree),
      });
    } else {
      algorithmSteps.push({
        type: 'complete',
        description: `Topological sort complete: ${result.join(' → ')}`,
        topoResult: [...result],
      });
    }

    setSteps(algorithmSteps);
    setCurrentStep(0);
    addEvent('Running Topological Sort (Kahn\'s algorithm)');
  };

  const stepForward = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const stepBackward = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setIsRunning(false);
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setEvents([]);
    setSteps([]);
    setCurrentStep(0);
    setSelectedNode(null);
    setSelectedEdge(null);
    setStartNode(null);
    addEvent('Cleared graph');
  };

  const currentStepData = steps[currentStep] || steps[currentStep - 1];
  
  const inspectorData = selectedNode
    ? [
        { label: 'Node ID', value: selectedNode.id },
        { label: 'Label', value: selectedNode.label },
        ...(currentStepData?.distances ? [
          { label: 'Distance', value: currentStepData.distances.get(selectedNode.id) || '∞' },
        ] : []),
        ...(currentStepData?.inDegrees ? [
          { label: 'In-Degree', value: currentStepData.inDegrees.get(selectedNode.id) || 0 },
        ] : []),
      ]
    : selectedEdge
    ? [
        { label: 'From', value: selectedEdge.from },
        { label: 'To', value: selectedEdge.to },
        { label: 'Weight', value: selectedEdge.weight },
      ]
    : [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Controls */}
        <div className="w-80 bg-white border-r border-slate-200 p-4 overflow-y-auto">
          <h3 className="font-semibold text-slate-900 mb-4">Graph Controls</h3>

          {/* Directed/Undirected */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Graph Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setDirected(false)}
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  !directed
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                disabled={isRunning}
              >
                Undirected
              </button>
              <button
                onClick={() => setDirected(true)}
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  directed
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                disabled={isRunning}
              >
                Directed
              </button>
            </div>
          </div>

          {/* Add Node */}
          <button
            onClick={addNode}
            className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center justify-center gap-2 mb-4"
            disabled={isRunning}
          >
            <Plus className="w-4 h-4" />
            Add Node
          </button>

          {/* Add Edge */}
          <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <h4 className="text-sm font-medium text-slate-900 mb-2">Add Edge</h4>
            <div className="space-y-2">
              <select
                value={edgeFrom}
                onChange={(e) => setEdgeFrom(e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                disabled={isRunning}
              >
                <option value="">From...</option>
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
              <select
                value={edgeTo}
                onChange={(e) => setEdgeTo(e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                disabled={isRunning}
              >
                <option value="">To...</option>
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
              <input
                type="number"
                value={edgeWeight}
                onChange={(e) => setEdgeWeight(parseInt(e.target.value) || 1)}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                placeholder="Weight"
                disabled={isRunning}
              />
              <button
                onClick={addEdge}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                disabled={isRunning || !edgeFrom || !edgeTo}
              >
                Add Edge
              </button>
            </div>
          </div>

          {/* Selected Element Actions */}
          {selectedNode && (
            <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="text-sm font-medium text-slate-900 mb-2">
                Node: {selectedNode.label}
              </h4>
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                disabled={isRunning}
              >
                Delete Node
              </button>
            </div>
          )}

          {selectedEdge && (
            <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <h4 className="text-sm font-medium text-slate-900 mb-2">
                Edge: {selectedEdge.from} → {selectedEdge.to}
              </h4>
              <button
                onClick={() => deleteEdge(selectedEdge.id)}
                className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                disabled={isRunning}
              >
                Delete Edge
              </button>
            </div>
          )}

          {/* Algorithm Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Algorithm
            </label>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setAlgorithm('prim');
                  runPrim();
                }}
                className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                disabled={isRunning || nodes.length === 0 || directed}
              >
                Prim's MST
              </button>
              <button
                onClick={() => setAlgorithm('dijkstra')}
                className="w-full px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                disabled={isRunning || nodes.length === 0}
              >
                Dijkstra
              </button>
              <button
                onClick={() => {
                  setAlgorithm('topo');
                  runTopologicalSort();
                }}
                className="w-full px-3 py-2 bg-cyan-600 text-white rounded text-sm hover:bg-cyan-700"
                disabled={isRunning || nodes.length === 0 || !directed}
              >
                Topological Sort
              </button>
            </div>
          </div>

          {/* Start Node Selection for Dijkstra */}
          {algorithm === 'dijkstra' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Node
              </label>
              <select
                value={startNode || ''}
                onChange={(e) => setStartNode(e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm mb-2"
              >
                <option value="">Select...</option>
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
              <button
                onClick={runDijkstra}
                className="w-full px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                disabled={isRunning || !startNode}
              >
                Run Dijkstra
              </button>
            </div>
          )}

          {/* Random Graph */}
          <button
            onClick={generateRandomGraph}
            className="w-full px-3 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 flex items-center justify-center gap-2 mb-4"
            disabled={isRunning}
          >
            <Shuffle className="w-4 h-4" />
            Random Graph
          </button>

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
        <div className="flex-1 bg-slate-50 overflow-auto p-8" ref={canvasRef}>
          {nodes.length > 0 ? (
            <div className="space-y-8">
              {/* Graph Visualization */}
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-4">Graph</h3>
                <GraphVisualization
                  nodes={nodes}
                  edges={edges}
                  directed={directed}
                  selectedNode={selectedNode}
                  selectedEdge={selectedEdge}
                  onSelectNode={setSelectedNode}
                  onSelectEdge={setSelectedEdge}
                  activeNodes={currentStepData?.activeNodes || []}
                  activeEdges={currentStepData?.activeEdges || []}
                  mstEdges={currentStepData?.mstEdges || []}
                />
              </div>

              {/* Algorithm-specific Panels */}
              {currentStepData?.pq && currentStepData.pq.length > 0 && (
                <div className="p-4 bg-white border border-slate-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Priority Queue</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentStepData.pq.map((item, idx) => (
                      <div key={idx} className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm">
                        {item.node}: {item.priority}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStepData?.distances && (
                <div className="p-4 bg-white border border-slate-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Distance Table</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from(currentStepData.distances.entries()).map(([node, dist]) => (
                      <div key={node} className="flex justify-between px-3 py-2 bg-slate-50 rounded text-sm">
                        <span className="font-medium">{node}:</span>
                        <span className="text-slate-600">{dist === Infinity ? '∞' : dist}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStepData?.topoResult && (
                <div className="p-4 bg-white border border-slate-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Topological Ordering</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentStepData.topoResult.map((node, idx) => (
                      <React.Fragment key={node}>
                        <div className="px-3 py-2 bg-cyan-100 border border-cyan-300 rounded font-medium text-sm">
                          {node}
                        </div>
                        {idx < currentStepData.topoResult!.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {currentStepData?.queue && (
                <div className="p-4 bg-white border border-slate-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Ready Queue</h4>
                  <div className="flex gap-2 flex-wrap">
                    {currentStepData.queue.map(node => (
                      <div key={node} className="px-3 py-2 bg-green-100 border border-green-300 rounded font-medium text-sm">
                        {node}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400">Add nodes and edges to build a graph</p>
            </div>
          )}
        </div>

        {/* Inspector */}
        <div className="w-80">
          <Inspector
            title="Element Inspector"
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
        description={currentStepData?.description || 'Build a graph and select an algorithm'}
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

function GraphVisualization({
  nodes,
  edges,
  directed,
  selectedNode,
  selectedEdge,
  onSelectNode,
  onSelectEdge,
  activeNodes,
  activeEdges,
  mstEdges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed: boolean;
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  onSelectNode: (node: GraphNode) => void;
  onSelectEdge: (edge: GraphEdge) => void;
  activeNodes: string[];
  activeEdges: string[];
  mstEdges: string[];
}) {
  return (
    <svg width="700" height="500" className="border border-slate-300 rounded-lg bg-white">
      {/* Edges */}
      {edges.map(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return null;

        const isSelected = selectedEdge?.id === edge.id;
        const isActive = activeEdges.includes(edge.id);
        const isMST = mstEdges.includes(edge.id);

        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / len;
        const uy = dy / len;

        const x1 = fromNode.x + ux * 25;
        const y1 = fromNode.y + uy * 25;
        const x2 = toNode.x - ux * 25;
        const y2 = toNode.y - uy * 25;

        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;

        return (
          <g key={edge.id}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isMST ? '#10b981' : isActive ? '#fbbf24' : isSelected ? '#3b82f6' : '#94a3b8'}
              strokeWidth={isMST || isActive || isSelected ? 3 : 2}
              markerEnd={directed ? 'url(#arrowhead)' : undefined}
              className="cursor-pointer"
              onClick={() => onSelectEdge(edge)}
            />
            <text
              x={midX}
              y={midY - 5}
              textAnchor="middle"
              className="text-xs fill-slate-700 font-semibold bg-white"
            >
              {edge.weight}
            </text>
          </g>
        );
      })}

      {/* Arrow marker for directed edges */}
      {directed && (
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>
      )}

      {/* Nodes */}
      {nodes.map(node => {
        const isSelected = selectedNode?.id === node.id;
        const isActive = activeNodes.includes(node.id);

        return (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r="25"
              fill={isActive ? '#fbbf24' : isSelected ? '#3b82f6' : 'white'}
              stroke="#64748b"
              strokeWidth="2"
              className="cursor-pointer"
              onClick={() => onSelectNode(node)}
            />
            <text
              x={node.x}
              y={node.y + 5}
              textAnchor="middle"
              className={`text-sm font-semibold ${isActive || isSelected ? 'fill-white' : 'fill-slate-900'}`}
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
