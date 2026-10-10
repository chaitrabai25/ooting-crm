import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Phone,
  Mail,
  MapPin,
  Check,
  ShieldCheck,
  AlertCircle,
  Loader2,
  FileText,
  UserCheck,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { Agent, Package } from '../../types/index.js';

interface B2BAgentSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAgent: (snapshot: Partial<Package>) => void;
  currentAgentId?: string | null;
}

export const B2BAgentSelectModal: React.FC<B2BAgentSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectAgent,
  currentAgentId,
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchAgents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await api.get('/agents?limit=200&sortBy=companyName&sortOrder=asc');
        setAgents(res.data?.data || []);
      } catch (err: any) {
        console.error('Failed to load agents list:', err);
        setError(err.response?.data?.message || 'Failed to load travel agents.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, [isOpen]);

  const filteredAgents = agents.filter((agent) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (agent.companyName || '').toLowerCase().includes(term) ||
      (agent.contactPerson || '').toLowerCase().includes(term) ||
      (agent.phone || '').toLowerCase().includes(term) ||
      (agent.email || '').toLowerCase().includes(term) ||
      (agent.city || '').toLowerCase().includes(term) ||
      (agent.state || '').toLowerCase().includes(term) ||
      (agent.gstNumber || '').toLowerCase().includes(term)
    );
  });

  const handleSelect = (agent: any) => {
    // Decoupled snapshot copy: only copies values to itinerary, zero mutation of master Agent record
    const snapshot: Partial<Package> = {
      b2bAgentId: agent.id,
      b2bAgencyName: agent.companyName || '',
      b2bContactPerson: agent.contactPerson || '',
      b2bPhone: agent.phone || '',
      b2bAlternatePhone: agent.alternatePhone || '',
      b2bEmail: agent.email || '',
      b2bAddress: agent.address || '',
      b2bCity: agent.city || '',
      b2bState: agent.state || '',
      b2bGstin: agent.gstNumber || '',
      b2bWebsite: agent.website || '',
      b2bTagline: agent.tagline || 'Authorized Travel Partner',
      b2bAgencyLogo: agent.logoUrl || null,
    };
    onSelectAgent(snapshot);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select B2B Travel Agent"
      subtitle="Choose an existing agent to populate itinerary branding"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs font-sans">
        {/* Safety & Isolation Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-blue-900 dark:text-blue-300">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold">Snapshot Isolation:</span> Selecting an agent copies details directly into this itinerary's custom branding snapshot. The master travel agent record in your CRM will <strong>never</strong> be modified.
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by agency name, contact person, phone, city, or GSTIN..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28]"
            autoFocus
          />
        </div>

        {/* Loading and Error states */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-[#C91F28]" />
            <span className="text-xs">Loading B2B travel agents...</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Agents List */}
        {!isLoading && !error && (
          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredAgents.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                  {searchTerm ? 'No matching agents found' : 'No travel agents registered'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {searchTerm ? 'Try searching with another keyword.' : 'Add agents in the Agents directory first.'}
                </p>
              </div>
            ) : (
              filteredAgents.map((agent: any) => {
                const isSelected = currentAgentId === agent.id;
                return (
                  <div
                    key={agent.id}
                    className={`pt-2 pb-2.5 px-3 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-xs tracking-tight">
                          {agent.companyName}
                        </span>
                        {agent.agentType && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {agent.agentType}
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Currently Applied</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {agent.contactPerson && (
                          <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                            <UserCheck className="w-3 h-3 text-slate-400" />
                            <span>{agent.contactPerson}</span>
                          </span>
                        )}
                        {agent.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{agent.phone}</span>
                          </span>
                        )}
                        {agent.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{agent.email}</span>
                          </span>
                        )}
                        {(agent.city || agent.state) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{[agent.city, agent.state].filter(Boolean).join(', ')}</span>
                          </span>
                        )}
                        {agent.gstNumber && (
                          <span className="inline-flex items-center gap-1 font-mono text-[10.5px]">
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span>GSTIN: {agent.gstNumber}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelect(agent)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-900 text-[#C91F28] dark:text-rose-200'
                          : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 shadow-xs'
                      }`}
                    >
                      {isSelected ? 'Re-Apply Snapshot' : 'Select Agent'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-400">
            {filteredAgents.length} {filteredAgents.length === 1 ? 'agent' : 'agents'} available
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
