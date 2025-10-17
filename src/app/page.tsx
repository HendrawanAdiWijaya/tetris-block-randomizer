"use client";

import React, { useEffect, useRef, useState } from "react";

type Block = {
  id: string;
  name: string;
  src: string;
  count: number;
  initial: number;
};

const STORAGE_KEY = "tetris-block-randomizer.config.v1";

const DEFAULT_INITIAL = [
  { id: "red", name: "Merah", src: "/red.svg", initial: 6 },
  { id: "blue", name: "Biru", src: "/blue.svg", initial: 6 },
  { id: "green", name: "Hijau", src: "/green.svg", initial: 6 },
  { id: "pink", name: "Pink", src: "/pink.svg", initial: 6 },
  { id: "grey", name: "Abu", src: "/grey.svg", initial: 6 },
  { id: "orange", name: "Oranye", src: "/orange.svg", initial: 6 },
  { id: "yellow", name: "Kuning", src: "/yellow.svg", initial: 6 },
  { id: "purple", name: "Ungu", src: "/purple.svg", initial: 6 },
];

function loadSavedConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_INITIAL;
    const parsed = JSON.parse(raw);
    // validate shape: array of {id, initial}
    if (!Array.isArray(parsed)) return DEFAULT_INITIAL;
    // Merge parsed values into defaults by id
    return DEFAULT_INITIAL.map((d) => {
      const found = parsed.find((p: any) => p.id === d.id);
      return found ? { ...d, initial: Number(found.initial) || d.initial } : d;
    });
  } catch (e) {
    return DEFAULT_INITIAL;
  }
}

export default function Home() {
  // load initial config from localStorage (client-only)
  const [blocks, setBlocks] = useState<Block[]>(() =>
    DEFAULT_INITIAL.map((b) => ({
      id: b.id,
      name: b.name,
      src: b.src,
      count: b.initial,
      initial: b.initial,
    }))
  );
  const [savedConfig, setSavedConfig] = useState(() =>
    DEFAULT_INITIAL.map((b) => ({ ...b }))
  );
  const [selected, setSelected] = useState<Block | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const totalRemaining = blocks.reduce((s, b) => s + b.count, 0);

  // Cleanup animation timers on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Weighted pick and decrement
  function pickAndDecrement() {
    const total = blocks.reduce((s, b) => s + b.count, 0);
    if (total <= 0) return;

    let r = Math.floor(Math.random() * total);
    let cum = 0;
    let pickedIndex = -1;
    for (let i = 0; i < blocks.length; i++) {
      cum += blocks[i].count;
      if (r < cum) {
        pickedIndex = i;
        break;
      }
    }
    if (pickedIndex === -1) pickedIndex = blocks.length - 1;

    const picked = blocks[pickedIndex];

    // Only update the count of the picked block
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === pickedIndex ? { ...b, count: Math.max(0, b.count - 1) } : b
      )
    );

    return picked;
  }

  // Check if only one type of block remains
  function getSingleRemainingBlock() {
    const availableBlocks = blocks.filter(b => b.count > 0);
    return availableBlocks.length === 1 ? availableBlocks[0] : null;
  }

  // Animation function that cycles through available blocks
  function animateSelection(duration: number = 2000) {
    const startTime = Date.now();
    const availableBlocks = blocks.filter(b => b.count > 0);
    if (availableBlocks.length === 0) return null;

    // If only one block type remains, pick it immediately
    if (availableBlocks.length === 1) {
      const finalPick = pickAndDecrement();
      if (finalPick) {
        setSelected(finalPick);
      }
      return;
    }

    setIsAnimating(true);

    let frameIndex = 0;
    function easeOut(t: number) {
      return 1 - Math.pow(1 - t, 2); // quadratic ease out
    }

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      frameIndex++;

      // For the last 30% of animation, always cycle through all blocks
      let index;
      if (progress < 0.7) {
        // First 70%: cycle through blocks at regular speed
        index = frameIndex % availableBlocks.length;
      } else {
        // Last 30%: ease out and show all blocks in order
        const lastPhaseProgress = (progress - 0.7) / 0.3;
        const eased = easeOut(lastPhaseProgress);
        index = Math.floor(eased * (availableBlocks.length - 1));
      }
      setSelected(availableBlocks[index]);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Animation finished, make the real pick
        const finalPick = pickAndDecrement();
        if (finalPick) {
          setSelected(finalPick);
        }
        setIsAnimating(false);
      }
    }

    animate();
  }

  // Mulai - first click to start the game
  function handleMulai() {
    if (isAnimating || totalRemaining <= 0) return;
    
    // Start animation unless only one block type remains
    const singleBlock = getSingleRemainingBlock();
    if (singleBlock) {
      const picked = pickAndDecrement();
      if (picked) {
        setSelected(picked);
      }
    } else {
      animateSelection(2000);
    }
    setHasStarted(true);
  }

  // Acak - subsequent randomize clicks with animation
  function handleAcak() {
    if (isAnimating || totalRemaining <= 0) return;
    animateSelection(2000);
  }

  function handleReset() {
    // use savedConfig (if loaded) or defaults
    const base = savedConfig.length ? savedConfig : DEFAULT_INITIAL;
    setBlocks(
      base.map((b) => ({
        id: b.id,
        name: b.name,
        src: b.src,
        count: b.initial,
        initial: b.initial,
      }))
    );
    setSelected(null);
    setHasStarted(false); // Reset to show Mulai again
  }

  // on mount, load saved config and apply
  useEffect(() => {
    try {
      const cfg = loadSavedConfig();
      setSavedConfig(
        cfg.map((c) => ({
          id: c.id,
          name: c.name,
          src: c.src,
          initial: c.initial,
        }))
      );
      setBlocks(
        cfg.map((c) => ({
          id: c.id,
          name: c.name,
          src: c.src,
          count: c.initial,
          initial: c.initial,
        }))
      );
    } catch (e) {
      // ignore
    } finally {
      // config loaded
    }
  }, []);

  function saveConfig(config: { id: string; initial: number }[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    const merged = DEFAULT_INITIAL.map((d) => {
      const found = config.find((c) => c.id === d.id);
      return found ? { ...d, initial: Number(found.initial) || d.initial } : d;
    });
    setSavedConfig(merged);
  }

  // Stable image component that never re-renders
  const BlockImage = React.memo(
    ({ src, name }: { src: string; name: string }) => {
      return (
        <div className="w-[120px] h-[48px] sm:w-[160px] sm:h-[64px] md:w-[200px] md:h-[80px] relative flex items-center justify-center">
          <img 
            src={src} 
            alt={name}
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        </div>
      );
    },
    // Deep compare props to prevent any re-renders
    (prev, next) => prev.src === next.src && prev.name === next.name
  );
  BlockImage.displayName = 'BlockImage';

  // Separate counter to handle only count updates
  const BlockCount = React.memo(
    ({ count, onEdit, isEditable }: { count: number; onEdit: () => void; isEditable: boolean }) => (
      <div className="flex items-center gap-2">
        <span className="shrink-0 min-w-[2ch]">{count}</span>
        {isEditable && (
          <button
            className="text-sm text-blue-600 px-2"
            onClick={onEdit}
            aria-label="edit"
          >
            ✏️
          </button>
        )}
      </div>
    ),
    (prev, next) => prev.count === next.count && prev.isEditable === next.isEditable
  );
  BlockCount.displayName = 'BlockCount';

  // Editor component that's always mounted but conditionally visible
  const BlockEditor = React.memo(
    ({ 
      isVisible, 
      initialValue, 
      onSave, 
      onCancel 
    }: { 
      isVisible: boolean; 
      initialValue: number;
      onSave: (n: number) => void;
      onCancel: () => void;
    }) => {
      const [value, setValue] = useState(String(initialValue));

      useEffect(() => {
        if (isVisible) {
          setValue(String(initialValue));
        }
      }, [isVisible, initialValue]);

      return (
        <div className={`flex items-center gap-1 ${isVisible ? '' : 'hidden'}`}>
          <input
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-20 text-center rounded border px-1"
          />
          <button
            onClick={() => {
              const n = Number(value) || 0;
              onSave(n);
            }}
            className="w-8 h-8 flex items-center justify-center bg-green-600 text-white rounded hover:bg-green-700"
            aria-label="save"
          >
            ✓
          </button>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center bg-gray-300 rounded hover:bg-gray-400"
            aria-label="cancel"
          >
            ✕
          </button>
        </div>
      );
    }
  );
  BlockEditor.displayName = 'BlockEditor';

  // Main block item component
  const BlockItem = React.memo(({ block, onSave, canEdit }: { block: Block; onSave: (n: number) => void; canEdit: boolean }) => {
    const [isEditing, setIsEditing] = useState(false);
    
    return (
      <div className="flex flex-col gap-2 items-center justify-start">
        <BlockImage src={block.src} name={block.name} />
        <div className="relative">
          <div className={isEditing ? 'hidden' : ''}>
            <BlockCount 
              count={block.count} 
              onEdit={() => setIsEditing(true)}
              isEditable={canEdit}
            />
          </div>
          <BlockEditor
            isVisible={isEditing && canEdit}
            initialValue={block.initial}
            onSave={(n) => {
              onSave(n);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }, (prev, next) => {
    return prev.block.count === next.block.count && 
           prev.block.initial === next.block.initial &&
           prev.block.src === next.block.src;
  });
  BlockItem.displayName = 'BlockItem';

  // Container for all blocks
  const BlocksList = React.memo(({ 
    blocks, 
    onSave,
    canEdit
  }: { 
    blocks: Block[], 
    onSave: (id: string, value: number) => void,
    canEdit: boolean
  }) => {
    return (
      <div className="flex flex-row gap-2 sm:gap-3 md:gap-4 justify-center sm:justify-start flex-wrap max-w-full px-2 sm:px-4">
        {blocks.map((b) => (
          <BlockItem
            key={b.id}
            block={b}
            onSave={(newInitial) => onSave(b.id, newInitial)}
            canEdit={canEdit}
          />
        ))}
      </div>
    );
  }, (prev, next) => {
    return prev.blocks.every((block, i) => 
      block.count === next.blocks[i].count &&
      block.initial === next.blocks[i].initial
    ) && prev.canEdit === next.canEdit;
  });
  BlocksList.displayName = 'BlocksList';

  // Memoized selected block display
  const SelectedBlock = React.memo(({ selected }: { selected: Block | undefined | null }) => {
    return selected ? (
      <img
        src={selected.src}
        alt={`Selected ${selected.name}`}
        className="w-[240px] h-[120px] sm:w-[320px] sm:h-[160px] md:w-[400px] md:h-[200px] object-contain"
        draggable={false}
        loading="eager"
      />
    ) : (
      <div className="w-[240px] h-[120px] sm:w-[320px] sm:h-[160px] md:w-[400px] md:h-[200px] flex items-center justify-center border-2 border-dashed border-[#81523F] rounded-lg">
        Randomize Block
      </div>
    );
  }, (prev, next) => {
    if (!prev.selected && !next.selected) return true;
    if (!prev.selected || !next.selected) return false;
    return prev.selected.id === next.selected.id;
  });
  SelectedBlock.displayName = 'SelectedBlock';

  return (
    <main className="min-h-screen flex flex-col justify-content-center align-items-center overflow-x-hidden overflow-y-auto pb-32 p-4 sm:p-6 md:p-8 bg-[#FFFBBD] text-[#81523F] text-xl sm:text-2xl font-bold">
      <BlocksList 
        blocks={blocks} 
        canEdit={!hasStarted}
        onSave={React.useCallback((id: string, newInitial: number) => {
          const updatedSaved = savedConfig.map((s) =>
            s.id === id ? { ...s, initial: newInitial } : s
          );
          saveConfig(
            updatedSaved.map((s) => ({ id: s.id, initial: s.initial }))
          );
          setSavedConfig(updatedSaved);
          setBlocks((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, count: newInitial, initial: newInitial }
                : p
            )
          );
        }, [savedConfig])}
      />

      <div className="flex flex-col flex-grow items-center justify-center">
        <div className="mb-4">
          <SelectedBlock selected={selected} />
        </div>

        <div className="flex gap-4">
          {totalRemaining <= 0 ? (
            <div className="flex flex-col items-center gap-4">
              <div className="text-3xl font-bold text-[#81523F]">Selesai</div>
              <button
                onClick={handleReset}
                className="cursor-pointer px-4 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 active:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Mulai lagi
              </button>
            </div>
          ) : !hasStarted ? (
            <button
              onClick={handleMulai}
              className="cursor-pointer px-4 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 active:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              Mulai
            </button>
          ) : !isAnimating ? (
            <button
              onClick={handleAcak}
              className="cursor-pointer px-4 py-2 rounded-xl bg-[#81523F] text-white font-semibold hover:bg-[#6c4435] active:bg-[#5a382c] transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              Acak
            </button>
          ) : null}
        </div>
      </div>

      {hasStarted && totalRemaining > 0 && (
        <div className="mt-4 sm:mt-8">
          <button
            onClick={handleReset}
            className="cursor-pointer px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 active:bg-red-700 transition-colors duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
          >
            Reset
          </button>
        </div>
      )}
      {/* Tokopedia Buy Button */}
      <div className="fixed right-2 sm:right-6 bottom-2 sm:bottom-6 z-50 flex flex-col items-end">
        <a
          href="https://tk.tokopedia.com/ZSUx1qjPq/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 sm:px-6 py-2 sm:py-3 rounded-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold shadow-lg text-sm sm:text-lg transition-colors duration-200 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l1.5 9a1 1 0 001 .9h13a1 1 0 001-.9L21 10M16 10V6a4 4 0 10-8 0v4" />
          </svg>
          <span className="whitespace-nowrap">Beli Tetris Balance Game</span>
        </a>
      </div>
    </main>
  );
}
