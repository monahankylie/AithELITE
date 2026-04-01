import React from "react";
import { useNavigate } from "react-router";

interface SelectionActionsProps {
  selectedCount: number;
  onAnalyze: () => void;
  onSave: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  onCancel: () => void;
}

const SelectionActions: React.FC<SelectionActionsProps> = ({
  selectedCount,
  onAnalyze,
  onSave,
  onRemove,
  removeLabel = "Remove Selected",
  onCancel,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {selectedCount > 0 && (
        <>
          <button
            onClick={onAnalyze}
            className="rounded-xl bg-amber-500 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm hover:bg-amber-600 transition-all active:scale-95 whitespace-nowrap"
          >
            Analyze ({selectedCount})
          </button>
          <button
            onClick={onSave}
            className="rounded-xl bg-[#00599c] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm hover:bg-[#004a82] transition-all active:scale-95 whitespace-nowrap"
          >
            Save ({selectedCount})
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="rounded-xl bg-red-500 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm hover:bg-red-600 transition-all active:scale-95 whitespace-nowrap"
            >
              {removeLabel} ({selectedCount})
            </button>
          )}
        </>
      )}
      
      <button
        onClick={onCancel}
        className="rounded-xl bg-white border-2 border-[#00599c] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#00599c] shadow-sm hover:bg-slate-50 transition-all active:scale-95 whitespace-nowrap"
      >
        Cancel Selection
      </button>
    </div>
  );
};

export default SelectionActions;
