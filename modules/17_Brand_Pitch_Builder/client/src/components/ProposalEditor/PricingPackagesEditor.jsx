import React, { useState } from 'react';
import { DollarSign, Check, Plus, Trash2, Edit3, Sparkles } from 'lucide-react';

export function PricingPackagesEditor({ pricingData, onUpdatePricing }) {
  const packages = pricingData?.packages || [];

  const handlePriceChange = (index, newPrice) => {
    const updated = packages.map((pkg, i) =>
      i === index ? { ...pkg, price: parseFloat(newPrice) || 0 } : pkg
    );
    onUpdatePricing({ ...pricingData, packages: updated });
  };

  const handleDeliverableChange = (pkgIndex, delivIndex, text) => {
    const updated = packages.map((pkg, i) => {
      if (i !== pkgIndex) return pkg;
      const updatedDelivs = [...pkg.deliverables];
      updatedDelivs[delivIndex] = text;
      return { ...pkg, deliverables: updatedDelivs };
    });
    onUpdatePricing({ ...pricingData, packages: updated });
  };

  const handleAddDeliverable = (pkgIndex) => {
    const updated = packages.map((pkg, i) => {
      if (i !== pkgIndex) return pkg;
      return { ...pkg, deliverables: [...pkg.deliverables, "New deliverable asset"] };
    });
    onUpdatePricing({ ...pricingData, packages: updated });
  };

  const handleRemoveDeliverable = (pkgIndex, delivIndex) => {
    const updated = packages.map((pkg, i) => {
      if (i !== pkgIndex) return pkg;
      return {
        ...pkg,
        deliverables: pkg.deliverables.filter((_, dIdx) => dIdx !== delivIndex)
      };
    });
    onUpdatePricing({ ...pricingData, packages: updated });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            {pricingData?.title || 'Proposed Partnership Packages & Rate Options'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Calibrated based on creator rate card with flexible deliverables and full commercial rights.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {packages.map((pkg, pkgIndex) => {
          const isRecommended = pkg.badge === 'Recommended' || pkgIndex === 1;

          return (
            <div
              key={pkgIndex}
              className={`rounded-2xl p-5 border flex flex-col justify-between transition-all relative ${
                isRecommended
                  ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-950/20 shadow-lg ring-1 ring-brand-500'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
              }`}
            >
              {/* Badge */}
              {pkg.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-600 text-white shadow-md">
                    {pkg.badge}
                  </span>
                </div>
              )}

              <div>
                {/* Tier Title */}
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  {pkg.tier}
                </div>

                {/* Price Input */}
                <div className="flex items-baseline gap-1 my-3">
                  <span className="text-xl font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    value={pkg.price || ''}
                    onChange={(e) => handlePriceChange(pkgIndex, e.target.value)}
                    className="text-3xl font-black text-slate-900 dark:text-white bg-transparent w-32 focus:outline-none focus:ring-1 focus:ring-brand-500 rounded px-1"
                  />
                  <span className="text-xs font-medium text-slate-400">USD</span>
                </div>

                {/* Ideal For */}
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 min-h-[36px]">
                  {pkg.idealFor}
                </p>

                {/* Deliverables List */}
                <div className="space-y-2 mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Included Deliverables:
                  </span>
                  {pkg.deliverables.map((item, delivIndex) => (
                    <div key={delivIndex} className="flex items-start gap-2 group">
                      <Check className="w-3.5 h-3.5 text-emerald-500 mt-1 flex-shrink-0" />
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleDeliverableChange(pkgIndex, delivIndex, e.target.value)}
                        className="w-full text-xs text-slate-700 dark:text-slate-300 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-1.5 py-0.5 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveDeliverable(pkgIndex, delivIndex)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-0.5 transition-opacity"
                        title="Remove deliverable"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add item button */}
              <button
                type="button"
                onClick={() => handleAddDeliverable(pkgIndex)}
                className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Deliverable
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
