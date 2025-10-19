'use client';

import { useState, useEffect } from 'react';
import {
  Target,
  CheckCircle,
  Circle,
  Trash2,
  Plus,
  TrendingUp,
  Shield,
  Zap,
  AlertCircle,
  Loader2,
  Square
} from 'lucide-react';
import { StrategyTemplateModal } from '@/components/ui/StrategyTemplateModal';
import { ActivateStrategyDialog, DeleteStrategyDialog, StopStrategyDialog } from '@/components/ui/ConfirmDialog';

interface Strategy {
  id: string;
  name: string;
  type: string;
  description: string;
  config: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StrategyTemplate {
  type: string;
  name: string;
  description: string;
  config: any;
  riskLevel: string;
  estimatedAPY: string;
}

export default function AgentConfigPage() {
  const [activeStrategy, setActiveStrategy] = useState<Strategy | null>(null);
  const [inactiveStrategies, setInactiveStrategies] = useState<Strategy[]>([]);
  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_AWS_API_URL;
  const apiKey = process.env.NEXT_PUBLIC_AWS_API_KEY;

  useEffect(() => {
    fetchStrategies();
  }, []);

  async function fetchStrategies() {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/strategies`, {
        headers: { 'X-Api-Key': apiKey! }
      });

      if (!response.ok) throw new Error('Failed to fetch strategies');

      const data = await response.json();
      setActiveStrategy(data.active);
      setInactiveStrategies(data.inactive || []);
      setTemplates(data.templates || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const handleActivateStrategy = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setActivateDialogOpen(true);
  };

  const handleDeleteStrategy = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setDeleteDialogOpen(true);
  };

  const handleStopStrategy = () => {
    if (activeStrategy) {
      setSelectedStrategy(activeStrategy);
      setStopDialogOpen(true);
    }
  };

  async function activateStrategy(id: string) {
    setActionLoading(true);
    try {
      const response = await fetch(`${apiUrl}/strategies/${id}`, {
        method: 'PUT',
        headers: {
          'X-Api-Key': apiKey!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: true })
      });

      if (!response.ok) throw new Error('Failed to activate strategy');

      await fetchStrategies();
      setActivateDialogOpen(false);
      setSelectedStrategy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate strategy');
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteStrategy(id: string) {
    setActionLoading(true);
    try {
      const response = await fetch(`${apiUrl}/strategies/${id}`, {
        method: 'DELETE',
        headers: { 'X-Api-Key': apiKey! }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete strategy');
      }

      await fetchStrategies();
      setDeleteDialogOpen(false);
      setSelectedStrategy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete strategy');
    } finally {
      setActionLoading(false);
    }
  }

  async function stopStrategy(id: string) {
    setActionLoading(true);
    try {
      const response = await fetch(`${apiUrl}/strategies/${id}`, {
        method: 'PUT',
        headers: {
          'X-Api-Key': apiKey!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: false })
      });

      if (!response.ok) throw new Error('Failed to stop strategy');

      await fetchStrategies();
      setStopDialogOpen(false);
      setSelectedStrategy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop strategy');
    } finally {
      setActionLoading(false);
    }
  }

  async function createFromTemplate(template: StrategyTemplate, customName: string) {
    try {
      const response = await fetch(`${apiUrl}/strategies`, {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: customName,
          type: template.type,
          description: template.description,
          config: template.config,
          isActive: false
        })
      });

      if (!response.ok) throw new Error('Failed to create strategy');

      await fetchStrategies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create strategy');
      throw err; // Re-throw to let the modal handle it
    }
  }

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <Shield className="w-5 h-5 text-green-600" />;
      case 'medium':
        return <TrendingUp className="w-5 h-5 text-yellow-600" />;
      case 'high':
        return <Zap className="w-5 h-5 text-red-600" />;
      default:
        return <Circle className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strategy Configuration</h1>
          <p className="text-gray-600 mt-1">Manage and switch between trading strategies</p>
        </div>
        <button
          onClick={() => setTemplateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Strategy
        </button>
      </div>


      {/* Active Strategy */}
      {activeStrategy ? (
        <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-green-900">Active Strategy</h2>
              </div> */}
              <h3 className="text-2xl font-bold text-green-900 mb-2">{activeStrategy.name}</h3>
              <p className="text-green-700 mb-4">{activeStrategy.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {Object.entries(activeStrategy.config).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="font-semibold text-gray-900">
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-medium">
                  ACTIVE
                </span>
                <span className="px-3 py-1 bg-white text-green-900 rounded-full text-xs font-medium">
                  {activeStrategy.type.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <button
                onClick={handleStopStrategy}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Strategy
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-900">No Active Strategy</h3>
              <p className="text-sm text-yellow-700">Please activate a strategy to start the agent.</p>
            </div>
          </div>
        </div>
      )}

      {/* Inactive Strategies */}
      {inactiveStrategies.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Strategies</h2>
          <div className="space-y-4">
            {inactiveStrategies.map((strategy) => (
              <div
                key={strategy.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Circle className="w-4 h-4 text-gray-400" />
                      <h3 className="font-semibold text-gray-900">{strategy.name}</h3>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {strategy.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{strategy.description}</p>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Created: {new Date(strategy.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Updated: {new Date(strategy.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleActivateStrategy(strategy)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => handleDeleteStrategy(strategy)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!activeStrategy && inactiveStrategies.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Strategies Yet</h3>
          <p className="text-gray-600 mb-6">Create your first strategy from a template</p>
          <button
            onClick={() => setTemplateModalOpen(true)}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            Browse Templates
          </button>
        </div>
      )}

      {/* Modals */}
      <StrategyTemplateModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        templates={templates}
        onSelectTemplate={createFromTemplate}
        loading={actionLoading}
      />

      {selectedStrategy && (
        <>
          <ActivateStrategyDialog
            open={activateDialogOpen}
            onOpenChange={setActivateDialogOpen}
            strategyName={selectedStrategy.name}
            onConfirm={() => activateStrategy(selectedStrategy.id)}
            loading={actionLoading}
          />

          <DeleteStrategyDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            strategyName={selectedStrategy.name}
            onConfirm={() => deleteStrategy(selectedStrategy.id)}
            loading={actionLoading}
          />

          <StopStrategyDialog
            open={stopDialogOpen}
            onOpenChange={setStopDialogOpen}
            strategyName={selectedStrategy.name}
            onConfirm={() => stopStrategy(selectedStrategy.id)}
            loading={actionLoading}
          />
        </>
      )}
    </div>
  );
}
