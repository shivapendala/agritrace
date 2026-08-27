import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SplitBatchForm, MergeBatchForm, TransformBatchForm } from '../components/genealogy/SplitMergeTransformForms';

// Simple types
interface LineageNode {
  id: string;
  parent_batch_id: string;
  child_batch_id: string;
  operation_type: string;
  quantity_transferred: number;
}

export const BatchGenealogy: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lineage, setLineage] = useState<LineageNode[]>([]);
  const [descendants, setDescendants] = useState<LineageNode[]>([]);
  const [activeTab, setActiveTab] = useState<'tree' | 'actions'>('tree');
  
  const fetchGenealogy = async () => {
    if (!id) return;
    try {
      const [ancRes, descRes] = await Promise.all([
        fetch(`/api/v1/genealogy/${id}/genealogy`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/v1/genealogy/${id}/descendants`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      
      if (ancRes.ok) setLineage(await ancRes.json());
      if (descRes.ok) setDescendants(await descRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchGenealogy();
  }, [id]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Batch Genealogy</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Tracking lineage and transformations for Batch <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{id}</span>
        </p>
      </div>

      <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('tree')}
          className={`pb-4 px-1 ${activeTab === 'tree' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Genealogy Tree
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`pb-4 px-1 ${activeTab === 'actions' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Operations
        </button>
      </div>

      {activeTab === 'tree' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glassmorphism-panel p-6 rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-lg border border-gray-200 dark:border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
              Ancestors
            </h2>
            {lineage.length === 0 ? (
              <p className="text-gray-500 italic">No ancestor lineage found.</p>
            ) : (
              <ul className="space-y-4">
                {lineage.map((l) => (
                  <li key={l.id} className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sm text-indigo-600 dark:text-indigo-400">{l.parent_batch_id.slice(0,8)}</span>
                      <span className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300">
                        {l.operation_type}
                      </span>
                      <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">{l.child_batch_id.slice(0,8)}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Transferred: {l.quantity_transferred} qty</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glassmorphism-panel p-6 rounded-2xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-lg border border-gray-200 dark:border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center">
              <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
              Descendants
            </h2>
            {descendants.length === 0 ? (
              <p className="text-gray-500 italic">No descendant lineage found.</p>
            ) : (
              <ul className="space-y-4">
                {descendants.map((l) => (
                  <li key={l.id} className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sm text-indigo-600 dark:text-indigo-400">{l.parent_batch_id.slice(0,8)}</span>
                      <span className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300">
                        {l.operation_type}
                      </span>
                      <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">{l.child_batch_id.slice(0,8)}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Transferred: {l.quantity_transferred} qty</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SplitBatchForm batchId={id!} onSuccess={fetchGenealogy} />
          <MergeBatchForm onSuccess={fetchGenealogy} />
          <TransformBatchForm batchId={id!} onSuccess={fetchGenealogy} />
        </div>
      )}
    </div>
  );
};
