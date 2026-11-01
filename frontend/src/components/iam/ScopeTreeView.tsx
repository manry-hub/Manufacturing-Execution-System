import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  ChevronRight,
  ChevronDown,
  Globe,
  Factory,
  Layers,
  Cpu,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type { ScopeNode, ScopeNodeType } from '../../types/iam.js';

interface ScopeTreeNodeProps {
  node: ScopeNode;
  level: number;
  expandedNodes: Set<string>;
  toggleExpand: (id: string) => void;
  onAddChild: (parent: ScopeNode) => void;
  onEdit: (node: ScopeNode) => void;
  onDeactivate: (node: ScopeNode) => void;
}

const getNodeIcon = (type: ScopeNodeType) => {
  switch (type) {
    case 'GLOBAL':
      return <Globe className="w-4 h-4 text-[#1868DB]" />;
    case 'PLANT':
      return <Factory className="w-4 h-4 text-[#00875A]" />;
    case 'AREA':
      return <Layers className="w-4 h-4 text-[#FFAB00]" />;
    case 'MACHINE':
      return <Cpu className="w-4 h-4 text-[#6554C0]" />;
  }
};

const ScopeTreeNodeItem: React.FC<ScopeTreeNodeProps> = ({
  node,
  level,
  expandedNodes,
  toggleExpand,
  onAddChild,
  onEdit,
  onDeactivate,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  return (
    <div>
      <div
        className={`flex items-center justify-between p-2.5 rounded-md hover:bg-[#F4F5F7] transition-colors border border-transparent hover:border-[#0B120E15] ${
          !node.isActive ? 'opacity-60 bg-[#FAFBFC]' : ''
        }`}
        style={{ paddingLeft: `${Math.max(8, level * 24)}px` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="p-1 text-[#505258] hover:text-[#292A2E] rounded hover:bg-[#EBECF0]"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-6" />
          )}

          <div className="p-1 bg-[#FFFFFF] border border-[#0B120E15] rounded shadow-2xs">
            {getNodeIcon(node.type)}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-[#292A2E] truncate">{node.name}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#EBECF0] text-[#505258]">
                {node.code}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                  node.type === 'GLOBAL'
                    ? 'bg-[#DEEBFF] text-[#0747A6]'
                    : node.type === 'PLANT'
                    ? 'bg-[#E3FCEF] text-[#006644]'
                    : node.type === 'AREA'
                    ? 'bg-[#FFF0B3] text-[#172B4D]'
                    : 'bg-[#EAE6FF] text-[#403294]'
                }`}
              >
                {node.type}
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#6B778C] truncate">{node.path}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {node._count?.roleAssignments !== undefined && node._count.roleAssignments > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#DEEBFF] text-[#0747A6]">
              {node._count.roleAssignments} assignment{node._count.roleAssignments > 1 ? 's' : ''}
            </span>
          )}

          {node.type !== 'MACHINE' && (
            <button
              onClick={() => onAddChild(node)}
              className="p-1 text-[#505258] hover:text-[#00875A] rounded hover:bg-[#E3FCEF] transition-colors"
              title="Add child scope node"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onEdit(node)}
            className="p-1 text-[#505258] hover:text-[#1868DB] rounded hover:bg-[#DEEBFF] transition-colors"
            title="Edit node"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {node.type !== 'GLOBAL' && node.isActive && (
            <button
              onClick={() => onDeactivate(node)}
              className="p-1 text-[#505258] hover:text-[#DE350B] rounded hover:bg-[#FFEBE6] transition-colors"
              title="Deactivate node"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="space-y-0.5">
          {node.children!.map((child) => (
            <ScopeTreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ScopeTreeView: React.FC = () => {
  const [tree, setTree] = useState<ScopeNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [activeNode, setActiveNode] = useState<ScopeNode | null>(null);
  const [parentNode, setParentNode] = useState<ScopeNode | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    type: ScopeNodeType;
  }>({
    name: '',
    code: '',
    type: 'PLANT',
  });

  const loadTree = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getScopeTree(false);
      setTree(data);

      // Auto-expand root nodes and plant level
      const toExpand = new Set<string>();
      data.forEach((root) => {
        toExpand.add(root.id);
        root.children?.forEach((plant) => toExpand.add(plant.id));
      });
      setExpandedNodes(toExpand);
    } catch (err: any) {
      setError(err?.message || 'Failed to load scope tree');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTree();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenAdd = (parent: ScopeNode) => {
    setModalMode('create');
    setParentNode(parent);
    setActiveNode(null);

    // Auto-suggest child type based on ISA-95 hierarchy
    let defaultType: ScopeNodeType = 'PLANT';
    if (parent.type === 'GLOBAL') defaultType = 'PLANT';
    else if (parent.type === 'PLANT') defaultType = 'AREA';
    else if (parent.type === 'AREA') defaultType = 'MACHINE';

    setFormData({
      name: '',
      code: '',
      type: defaultType,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (node: ScopeNode) => {
    setModalMode('edit');
    setActiveNode(node);
    setParentNode(null);
    setFormData({
      name: node.name,
      code: node.code,
      type: node.type,
    });
    setIsModalOpen(true);
  };

  const handleDeactivate = async (node: ScopeNode) => {
    if (!window.confirm(`Are you sure you want to deactivate scope node "${node.name}" (${node.path})?`)) {
      return;
    }
    try {
      setError(null);
      await api.deactivateScopeNode(node.id);
      setSuccessMsg(`Scope node "${node.name}" deactivated successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadTree();
    } catch (err: any) {
      setError(err?.message || 'Failed to deactivate node');
    }
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (modalMode === 'create') {
        await api.createScopeNode({
          parentId: parentNode?.id || null,
          type: formData.type,
          code: formData.code.trim().toLowerCase(),
          name: formData.name.trim(),
        });
        setSuccessMsg(`Scope node "${formData.name}" created successfully.`);
      } else if (activeNode) {
        await api.updateScopeNode(activeNode.id, {
          name: formData.name.trim(),
          code: formData.code.trim().toLowerCase(),
        });
        setSuccessMsg(`Scope node "${formData.name}" updated with atomic path recalculation.`);
      }
      setIsModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadTree();
    } catch (err: any) {
      setError(err?.message || 'Operation failed');
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#0B120E24] rounded-lg p-5 shadow-xs space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#DEEBFF] text-[#1868DB] rounded-md">
              <FolderTree className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-[#292A2E]">
              Hierarchical Scope Tree (ISA-95 Materialized Paths)
            </h2>
          </div>
          <p className="text-xs text-[#505258] mt-1">
            Enterprise boundary tree with strict trailing slashes (<code className="font-mono bg-[#EBECF0] px-1 py-0.5 rounded text-[11px]">/global/plant-01/fin-insp/</code>) ensuring segment boundary isolation and automatic downward permission inheritance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadTree()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#0B120E24] rounded-md text-xs font-semibold text-[#505258] hover:bg-[#F4F5F7] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-[#FFEBE6] border border-[#FF8F73] text-[#BF2600] rounded-md text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[#E3FCEF] border border-[#57D9A3] text-[#006644] rounded-md text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Scope Tree Container */}
      <div className="border border-[#0B120E15] rounded-md p-3 bg-[#FFFFFF] min-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-[#505258] text-xs">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading materialized scope tree...
          </div>
        ) : tree.length === 0 ? (
          <div className="text-center py-12 text-[#505258] text-xs">
            No scope nodes found. Please initialize the tree.
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map((root) => (
              <ScopeTreeNodeItem
                key={root.id}
                node={root}
                level={0}
                expandedNodes={expandedNodes}
                toggleExpand={toggleExpand}
                onAddChild={handleOpenAdd}
                onEdit={handleOpenEdit}
                onDeactivate={handleDeactivate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-lg shadow-xl border border-[#0B120E24] w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-[#0B120E15] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#292A2E]">
                {modalMode === 'create'
                  ? `Add Scope Node under "${parentNode?.name}"`
                  : `Edit Scope Node "${activeNode?.name}"`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#505258] hover:text-[#292A2E] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#505258] mb-1">
                  Node Type
                </label>
                <select
                  value={formData.type}
                  disabled={modalMode === 'edit'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ScopeNodeType })}
                  className="w-full px-3 py-2 text-xs border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB] disabled:bg-[#EBECF0]"
                >
                  <option value="PLANT">PLANT</option>
                  <option value="AREA">AREA</option>
                  <option value="MACHINE">MACHINE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#505258] mb-1">
                  Node Code (Slug)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. plant-01, fin-insp, imm-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2 text-xs border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB] font-mono"
                />
                <p className="text-[10px] text-[#6B778C] mt-1">
                  Lowercase alphanumeric characters, hyphens, and underscores only.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#505258] mb-1">
                  Node Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Plant 01 (Cikarang)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#0B120E24] rounded-md focus:outline-hidden focus:border-[#1868DB]"
                />
              </div>

              {modalMode === 'create' && parentNode && (
                <div className="p-2.5 bg-[#F4F5F7] rounded text-[11px] text-[#505258]">
                  <span className="font-semibold block mb-0.5">Calculated Path:</span>
                  <code className="font-mono text-[#0747A6]">
                    {parentNode.path}
                    {formData.code || '[code]'}/
                  </code>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0B120E15]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#505258] hover:bg-[#EBECF0] rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-[#1868DB] hover:bg-[#0747A6] text-white rounded-md font-semibold shadow-xs"
                >
                  {modalMode === 'create' ? 'Create Node' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
