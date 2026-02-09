import React, { useState } from 'react';
import { BinaryTreeMode } from './components/BinaryTreeMode';
import { AVLTreeMode } from './components/AVLTreeMode';
import { TwoThreeTreeMode } from './components/TwoThreeTreeMode';
import { TwoThreeFourTreeMode } from './components/TwoThreeFourTreeMode';
import { HeapMode } from './components/HeapMode';
import { HuffmanMode } from './components/HuffmanMode';
import { GraphMode } from './components/GraphMode';
import { Info } from 'lucide-react';

type Mode = 'bst' | 'avl' | '2-3' | '2-3-4' | 'heap' | 'huffman' | 'graph';

export default function App() {
  const [mode, setMode] = useState<Mode>('bst');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with Mode Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Interactive Data Structures & Algorithms Visualizer
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Build, modify, and visualize data structures with step-by-step algorithm execution
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
              <Info className="w-4 h-4" />
              <span>Select a mode to begin</span>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            <ModeButton
              active={mode === 'bst'}
              onClick={() => setMode('bst')}
              label="Binary Tree / BST"
            />
            <ModeButton
              active={mode === 'avl'}
              onClick={() => setMode('avl')}
              label="AVL Tree"
            />
            <ModeButton
              active={mode === '2-3'}
              onClick={() => setMode('2-3')}
              label="2–3 Tree"
            />
            <ModeButton
              active={mode === '2-3-4'}
              onClick={() => setMode('2-3-4')}
              label="2–3–4 Tree"
            />
            <ModeButton
              active={mode === 'heap'}
              onClick={() => setMode('heap')}
              label="Heap"
            />
            <ModeButton
              active={mode === 'huffman'}
              onClick={() => setMode('huffman')}
              label="Huffman Coding"
            />
            <ModeButton
              active={mode === 'graph'}
              onClick={() => setMode('graph')}
              label="Graph Algorithms"
            />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-180px)]">
        {mode === 'bst' && <BinaryTreeMode />}
        {mode === 'avl' && <AVLTreeMode />}
        {mode === '2-3' && <TwoThreeTreeMode />}
        {mode === '2-3-4' && <TwoThreeFourTreeMode />}
        {mode === 'heap' && <HeapMode />}
        {mode === 'huffman' && <HuffmanMode />}
        {mode === 'graph' && <GraphMode />}
      </main>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}