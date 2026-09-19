import React, { useState, useEffect } from 'react';
import {
  Search,
  Building2,
  MapPin,
  Phone,
  Sparkles,
  Award,
  Check,
  Filter,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../api/client.js';
import { Supplier } from '../../types/index.js';

interface ServiceProviderSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (provider: Supplier, customRate?: number, details?: string) => void;
}

const SERVICE_CATEGORIES = [
  'All',
  'Hotel',
  'Bus',
  'Cab',
  'Guide',
  'Adventure Activity',
  'Entry Ticket',
  'Food/Restaurant',
  'Club',
  'Other Travel Service',
];

export const ServiceProviderSelectModal: React.FC<ServiceProviderSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTier, setSelectedTier] = useState('All');

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
    }
  }, [isOpen]);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/suppliers?limit=100&status=ACTIVE');
      setSuppliers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
      (s.city && s.city.toLowerCase().includes(search.toLowerCase())) ||
      (s.district && s.district.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.includes(search));

    let matchesCategory = true;
    if (selectedCategory !== 'All') {
      let cats: string[] = [];
      if (Array.isArray(s.serviceCategories)) {
        cats = s.serviceCategories;
      } else if (typeof s.serviceCategories === 'string') {
        try {
          cats = JSON.parse(s.serviceCategories);
        } catch {
          cats = [s.serviceCategories];
        }
      }
      matchesCategory = Boolean(
        cats.includes(selectedCategory) ||
        s.supplierType?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        s.category?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    let matchesTier = true;
    if (selectedTier !== 'All') {
      matchesTier = (s.tier || 'Silver').toLowerCase() === selectedTier.toLowerCase();
    }

    return matchesSearch && matchesCategory && matchesTier;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select B2B Service Provider"
      subtitle="Search and link verified Hotels, Cabs, Buses, Guides & Activity Vendors to this booking"
      maxWidth="xl"
    >
      <div className="space-y-4 text-xs max-h-[75vh] flex flex-col">
        {/* Search & Category Filter */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search provider by name, contact, phone, city, district..."
              className="w-full pl-9 pr-3.5 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Category:
            </span>
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#C91F28] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Tier:</span>
            {['All', 'Diamond', 'Gold', 'Silver'].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                  selectedTier === tier
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tier === 'Diamond' && '💎 '}
                {tier === 'Gold' && '🥇 '}
                {tier === 'Silver' && '🥈 '}
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* List of matching providers */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading B2B service providers...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              No service providers found matching filters.
            </div>
          ) : (
            filteredSuppliers.map((provider) => {
              const tier = provider.tier || 'Silver';
              let cats: string[] = [];
              if (Array.isArray(provider.serviceCategories)) {
                cats = provider.serviceCategories;
              } else if (typeof provider.serviceCategories === 'string') {
                try {
                  cats = JSON.parse(provider.serviceCategories);
                } catch {
                  cats = [provider.serviceCategories];
                }
              }

              return (
                <div
                  key={provider.id}
                  className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {provider.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                          tier === 'Diamond'
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300'
                            : tier === 'Gold'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {tier === 'Diamond' && <Sparkles className="w-2.5 h-2.5 text-cyan-600" />}
                        {tier === 'Gold' && <Award className="w-2.5 h-2.5 text-amber-600" />}
                        {tier}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                        {provider.supplierType}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {provider.city || '—'}
                        {provider.district && <span> ({provider.district})</span>}
                        {provider.state && <span>, {provider.state}</span>}
                      </span>
                      {provider.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {provider.phone}
                        </span>
                      )}
                      {provider.contactPerson && (
                        <span>• Contact: {provider.contactPerson}</span>
                      )}
                    </div>

                    {cats.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cats.map((c) => (
                          <span
                            key={c}
                            className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelect(provider);
                      onClose();
                    }}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-[#C91F28] hover:bg-[#a81920] text-white font-bold text-xs shadow-xs transition-colors self-end sm:self-auto flex-shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Select</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
