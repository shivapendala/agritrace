import React, { useState } from 'react';

// Using inline styling or generic CSS classes for now
// A highly polished modern aesthetics implementation is required.
import '../../index.css';

interface FormProps {
  batchId: string;
  onSuccess: () => void;
}

export const SplitBatchForm: React.FC<FormProps> = ({ batchId, onSuccess }) => {
  const [quantities, setQuantities] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyArray = quantities.split(',').map((q) => parseFloat(q.trim()));
    try {
      const response = await fetch(`/api/v1/genealogy/${batchId}/split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ quantities: qtyArray })
      });
      if (response.ok) {
        onSuccess();
      } else {
        alert("Error splitting batch");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="glassmorphism-panel p-6 rounded-xl shadow-lg bg-white/10 backdrop-blur-md border border-white/20">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Split Batch</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantities (comma separated, e.g. 50, 50)</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={quantities}
            onChange={(e) => setQuantities(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-transform active:scale-95"
        >
          Split Batch
        </button>
      </form>
    </div>
  );
};

export const MergeBatchForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [batchIds, setBatchIds] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = batchIds.split(',').map((id) => id.trim());
    try {
      const response = await fetch(`/api/v1/genealogy/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ source_batch_ids: ids })
      });
      if (response.ok) {
        onSuccess();
      } else {
        alert("Error merging batches");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="glassmorphism-panel p-6 rounded-xl shadow-lg bg-white/10 backdrop-blur-md border border-white/20">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Merge Batches</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Batch IDs (comma separated)</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={batchIds}
            onChange={(e) => setBatchIds(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-transform active:scale-95"
        >
          Merge Batches
        </button>
      </form>
    </div>
  );
};

export const TransformBatchForm: React.FC<FormProps> = ({ batchId, onSuccess }) => {
  const [transformType, setTransformType] = useState<string>('');
  const [yieldPct, setYieldPct] = useState<number>(100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/v1/genealogy/${batchId}/transform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ transformation_type: transformType, yield_percentage: yieldPct })
      });
      if (response.ok) {
        onSuccess();
      } else {
        alert("Error transforming batch");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="glassmorphism-panel p-6 rounded-xl shadow-lg bg-white/10 backdrop-blur-md border border-white/20">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Transform Batch</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Transformation Type</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={transformType}
            onChange={(e) => setTransformType(e.target.value)}
            placeholder="e.g. ROASTING"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Yield Percentage (%)</label>
          <input
            type="number"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={yieldPct}
            onChange={(e) => setYieldPct(Number(e.target.value))}
            min="1" max="100"
            required
          />
        </div>
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-amber-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-transform active:scale-95"
        >
          Transform Batch
        </button>
      </form>
    </div>
  );
};
