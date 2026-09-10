import { useMemo, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { TextInput } from '../ui/FormField';
import {
  DAK_SCAN_COLUMNS,
  scanRowToPayload,
  validateScanRow,
} from '../../utils/dakAiExtract';

export default function DakScanPreviewTable({ rows, scanPhotoUrl = '', onChange, onSave, onDismiss }) {
  const [saveErrors, setSaveErrors] = useState('');

  const validCount = useMemo(
    () => rows.filter((row) => Object.keys(validateScanRow(row)).length === 0).length,
    [rows],
  );

  const updateRow = (id, key, value) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
    setSaveErrors('');
  };

  const removeRow = (id) => {
    onChange(rows.filter((row) => row.id !== id));
    setSaveErrors('');
  };

  const addBlankRow = () => {
    onChange([
      ...rows,
      {
        id: `scan-blank-${Date.now()}`,
        registerSr: '',
        subject: '',
        forwardedDate: '',
        receivedDate: '',
        designation: '',
        externalDispatchNo: '',
      },
    ]);
  };

  const handleSave = () => {
    const invalid = rows.filter((row) => Object.keys(validateScanRow(row)).length > 0);
    if (invalid.length) {
      setSaveErrors(
        `${invalid.length} row incomplete — Subject, Date (Dispatched), Marked To zaroori hain`,
      );
      return;
    }
    onSave(rows.map((row) => scanRowToPayload(row, { scanPhotoUrl })));
  };

  if (!rows.length) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
            Scan result — manual register jaisi list (verify karein)
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {rows.length} row{rows.length === 1 ? '' : 's'} · {validCount} ready to save
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-xs text-zinc-400 hover:bg-white/5"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      <div className="-mx-1 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-2 py-2 w-8">#</th>
              {DAK_SCAN_COLUMNS.map((col) => (
                <th key={col.key} className="px-2 py-2 whitespace-nowrap">
                  {col.label}
                  {col.required ? ' *' : ''}
                </th>
              ))}
              <th className="px-2 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rowErrors = validateScanRow(row);
              const invalid = Object.keys(rowErrors).length > 0;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-white/5 ${invalid ? 'bg-red-500/5' : ''}`}
                >
                  <td className="px-2 py-2 text-zinc-500">{index + 1}</td>
                  {DAK_SCAN_COLUMNS.map((col) => (
                    <td key={col.key} className="px-2 py-2 min-w-[120px]">
                      <TextInput
                        type={col.type === 'date' ? 'date' : col.key === 'registerSr' ? 'number' : 'text'}
                        value={row[col.key] || ''}
                        onChange={(e) => updateRow(row.id, col.key, e.target.value)}
                        className={`py-1.5 text-xs ${rowErrors[col.key] ? 'border-red-500/50' : ''}`}
                        placeholder={col.label}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-red-300"
                      title="Row hatao"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {saveErrors && <p className="mt-2 text-sm text-red-300">{saveErrors}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          <Check className="h-4 w-4" />
          Dak Log mein save ({validCount})
        </button>
        <button
          type="button"
          onClick={addBlankRow}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          Row add
        </button>
      </div>
    </div>
  );
}
