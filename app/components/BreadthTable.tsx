'use client';

import React, { useState } from 'react';
import { BreadthRow } from '@/lib/breadthQueries';
import { BreadthModal } from './BreadthModal';

type Props = {
  title: string;
  data: BreadthRow[];
};

type MetricKey =
  | 'aboveMa5'
  | 'aboveMa10'
  | 'aboveMa20'
  | 'aboveMa50'
  | 'aboveMa200'
  | 'spikeUp'
  | 'spikeDown';


type SelectedState = {
  groupId: number;
  groupName: string;
  metric: MetricKey;
} | null;

type SortKey =
  | 'groupName'
  | 'total'
  | 'adv'
  | 'dec'
  | 'ad'
  | 'advRatio'
  | 'newHigh52w'
  | 'newLow52w'
  | 'ma5Ratio'
  | 'ma10Ratio'
  | 'ma20Ratio'
  | 'ma50Ratio'
  | 'ma200Ratio'
  | 'spikeUp'
  | 'spikeDown';

export function BreadthTable({ title, data }: Props) {
  const [selected, setSelected] = useState<SelectedState>(null);
  const [sortKey, setSortKey] = useState<SortKey>('groupName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  if (data.length === 0) return null;

  const openMetricModal = (row: BreadthRow, metric: MetricKey) => {
    setSelected({
      groupId: row.groupId,
      groupName: row.groupName,
      metric,
    });
  };

  const closeModal = () => {
    setSelected(null);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // default: descending for numeric, ascending for name
      setSortDir(key === 'groupName' ? 'asc' : 'desc');
    }
  };

  const getSortValue = (row: BreadthRow): string | number => {
    const ad = row.adv - row.dec;
    const advRatio = row.total ? (row.adv / row.total) * 100 : 0;
    const ma5Ratio = row.total ? (row.aboveMa5 / row.total) * 100 : 0;
    const ma10Ratio = row.total ? (row.aboveMa10 / row.total) * 100 : 0;
    const ma20Ratio = row.total ? (row.aboveMa20 / row.total) * 100 : 0;
    const ma50Ratio = row.total ? (row.aboveMa50 / row.total) * 100 : 0;
    const ma200Ratio = row.total ? (row.aboveMa200 / row.total) * 100 : 0;

    switch (sortKey) {
      case 'groupName':
        return row.groupName;
      case 'total':
        return row.total;
      case 'adv':
        return row.adv;
      case 'dec':
        return row.dec;
      case 'ad':
        return ad; // A-D by absolute diff
      case 'advRatio':
        return advRatio; // A-D % (adv/total)
      case 'newHigh52w':
        return row.newHigh52w;
      case 'newLow52w':
        return row.newLow52w;
      case 'ma5Ratio':
        return ma5Ratio;
      case 'ma10Ratio':
        return ma10Ratio;
      case 'ma20Ratio':
        return ma20Ratio;
      case 'ma50Ratio':
        return ma50Ratio;
      case 'ma200Ratio':
        return ma200Ratio;
      case 'spikeUp':
        return row.spikeUp;
      case 'spikeDown':
        return row.spikeDown;
      default:
        return 0;
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const va = getSortValue(a);
    const vb = getSortValue(b);

    if (typeof va === 'string' && typeof vb === 'string') {
      const cmp = va.localeCompare(vb);
      return sortDir === 'asc' ? cmp : -cmp;
    }

    const na = Number(va) || 0;
    const nb = Number(vb) || 0;
    const cmp = na - nb;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '';

  return (
    <>
      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">
            {title}
          </h2>
          <span className="text-[11px] uppercase text-zinc-500">
            n = {data.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/70 shadow-lg shadow-black/30">
          <table className="table-fixed min-w-full text-[11px] md:text-xs">
            <thead className="bg-zinc-900/80">
              <tr>
                {/* List (name) */}
                <th
                  className="sticky left-0 z-10 bg-zinc-900/80 px-3 py-2 text-left font-medium text-zinc-300 w-48 cursor-pointer select-none"
                  onClick={() => handleSort('groupName')}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>List</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('groupName')}
                    </span>
                  </div>
                </th>

                {/* Each numeric col gets same width & sortable */}
                <th
                  className="w-24 px-2 py-2 text-right font-medium text-zinc-300 cursor-pointer select-none"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('total')}
                    </span>
                  </div>
                </th>

                <th
                  className="w-24 px-2 py-2 text-right font-medium text-zinc-300 cursor-pointer select-none"
                  onClick={() => handleSort('adv')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Adv</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('adv')}
                    </span>
                  </div>
                </th>

                <th
                  className="w-24 px-2 py-2 text-right font-medium text-zinc-300 cursor-pointer select-none"
                  onClick={() => handleSort('dec')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Dec</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('dec')}
                    </span>
                  </div>
                </th>

                <th
                  className="w-24 px-2 py-2 text-right font-medium text-zinc-300 cursor-pointer select-none"
                  onClick={() => handleSort('ad')}
                >
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1">
                      <span>A-D</span>
                      <span className="text-[9px] text-zinc-500">
                        {sortIcon('ad')}
                      </span>
                    </div>
                    <span className="block text-[10px] font-normal text-zinc-500">
                      (count / %)
                    </span>
                  </div>
                </th>

                <th
                  className="w-24 px-2 py-2 text-right font-medium text-zinc-300 cursor-pointer select-none"
                  onClick={() => handleSort('newHigh52w')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>52w High</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('newHigh52w')}
                    </span>
                  </div>
                </th>

                <th
                  className="w-24 px-2 py-2 text-right font-medium text-zinc-300 cursor-pointer select-none"
                  onClick={() => handleSort('newLow52w')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>52w Low</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('newLow52w')}
                    </span>
                  </div>
                </th>

                <th
                  className="w-24 px-2 py-2 text-right font-medium text-zinc-300 cursor-pointer select-none"
                  onClick={() => handleSort('ma5Ratio')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>% &gt;MA5</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('ma5Ratio')}
                    </span>
                  </div>
                </th>

                <th
                  className="w-24 px-2 py-2 text-right font-medium text-zinc-300 cursor-pointer select-none"
                  onClick={() => handleSort('ma10Ratio')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>% &gt;MA10</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('ma10Ratio')}
                    </span>
                  </div>
                </th>

                <th
                  className="w-24 px-2 py-2 text-right font-medium text-zinc-300 cursor-pointer select-none"
                  onClick={() => handleSort('ma20Ratio')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>% &gt;MA20</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('ma20Ratio')}
                    </span>
                  </div>
                </th>

                <th
                  className="w-24 px-2 py-2 text-right font-medium text-zinc-300 cursor-pointer select-none"
                  onClick={() => handleSort('ma50Ratio')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>% &gt;MA50</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('ma50Ratio')}
                    </span>
                  </div>
                </th>

                <th
                  className="w-24 px-2 py-2 text-right font-medium text-zinc-300 cursor-pointer select-none"
                  onClick={() => handleSort('ma200Ratio')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>% &gt;MA200</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('ma200Ratio')}
                    </span>
                  </div>
                </th>

                <th
                  className="w-28 px-2 py-2 text-right font-medium text-zinc-300 cursor-pointer select-none"
                  onClick={() => handleSort('spikeUp')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Up On Volume</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('spikeUp')}
                    </span>
                  </div>
                </th>

                <th
                  className="w-28 px-2 py-2 text-right font-medium text-zinc-300 cursor-pointer select-none"
                  onClick={() => handleSort('spikeDown')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Down On Volume</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('spikeDown')}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedData.map((row, idx) => {
                const ad = row.adv - row.dec;
                const advRatio = row.total ? (row.adv / row.total) * 100 : 0;

                const ma5Ratio = row.total ? (row.aboveMa5 / row.total) * 100 : 0;
                const ma10Ratio = row.total ? (row.aboveMa10 / row.total) * 100 : 0;
                const ma20Ratio = row.total ? (row.aboveMa20 / row.total) * 100 : 0;
                const ma50Ratio = row.total ? (row.aboveMa50 / row.total) * 100 : 0;
                const ma200Ratio = row.total ? (row.aboveMa200 / row.total) * 100 : 0;

                const adColor =
                  ad > 0
                    ? 'text-emerald-400'
                    : ad < 0
                    ? 'text-rose-400'
                    : 'text-zinc-300';

                const rowBg =
                  idx % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/50';

                return (
                  <tr
                    key={row.groupId}
                    className={`border-t border-zinc-800/80 ${rowBg} hover:bg-zinc-800/70 transition-colors`}
                  >
                    <td className="sticky left-0 z-10 max-w-[180px] truncate bg-inherit px-3 py-1.5 text-zinc-100 w-48">
                      {row.groupName}
                    </td>

                    <td className="w-24 px-2 py-1.5 text-right text-zinc-300">
                      {row.total}
                    </td>

                    <td className="w-24 px-2 py-1.5 text-right text-emerald-300">
                      {row.adv}
                    </td>

                    <td className="w-24 px-2 py-1.5 text-right text-rose-300">
                      {row.dec}
                    </td>

                    <td className={`w-24 px-2 py-1.5 text-right ${adColor}`}>
                      <div className="flex flex-col items-end">
                        <span>{ad}</span>
                        <span className="text-[10px] text-zinc-500">
                          {advRatio.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    <td className="w-24 px-2 py-1.5 text-right text-amber-200">
                      {row.newHigh52w}
                    </td>
                    <td className="w-24 px-2 py-1.5 text-right text-sky-200">
                      {row.newLow52w}
                    </td>

                    {/* MA cells clickable */}
                    <td
                      className="w-24 px-2 py-1.5 text-right text-zinc-200 cursor-pointer hover:text-emerald-300"
                      onClick={() => openMetricModal(row, 'aboveMa5')}
                    >
                      {ma5Ratio.toFixed(0)}%
                    </td>
                    <td
                      className="w-24 px-2 py-1.5 text-right text-zinc-200 cursor-pointer hover:text-emerald-300"
                      onClick={() => openMetricModal(row, 'aboveMa10')}
                    >
                      {ma10Ratio.toFixed(0)}%
                    </td>
                    <td
                      className="w-24 px-2 py-1.5 text-right text-zinc-200 cursor-pointer hover:text-emerald-300"
                      onClick={() => openMetricModal(row, 'aboveMa20')}
                    >
                      {ma20Ratio.toFixed(0)}%
                    </td>
                    <td
                      className="w-24 px-2 py-1.5 text-right text-zinc-200 cursor-pointer hover:text-emerald-300"
                      onClick={() => openMetricModal(row, 'aboveMa50')}
                    >
                      {ma50Ratio.toFixed(0)}%
                    </td>
                    <td
                      className="w-24 px-2 py-1.5 text-right text-zinc-200 cursor-pointer hover:text-emerald-300"
                      onClick={() => openMetricModal(row, 'aboveMa200')}
                    >
                      {ma200Ratio.toFixed(0)}%
                    </td>
                    <td
                    className="w-28 px-2 py-1.5 text-right text-emerald-300 cursor-pointer hover:text-emerald-200"
                    onClick={() => openMetricModal(row, 'spikeUp')}
                    >
                    <div className="flex flex-col items-end">
                        <span>{row.spikeUp}</span>
                    </div>
                    </td>

                    <td
                    className="w-28 px-2 py-1.5 text-right text-rose-300 cursor-pointer hover:text-rose-200"
                    onClick={() => openMetricModal(row, 'spikeDown')}
                    >
                    <div className="flex flex-col items-end">
                        <span>{row.spikeDown}</span>
                    </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selected && <BreadthModal selected={selected} onClose={closeModal} />}
    </>
  );
}
