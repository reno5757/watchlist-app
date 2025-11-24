'use client';

import React, { useState } from 'react';
import { BreadthRow } from '@/lib/breadthQueries';
import { BreadthModal } from './BreadthModal';
import { BreadthAdModal } from './BreadthAdModal';
import { McClellanModal } from './McClellanModal';

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

type SelectedAdState = {
  groupId: number;
  groupName: string;
} | null;

type SelectedMcState = {
  groupId: number;
  groupName: string;
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
  const [selectedAd, setSelectedAd] = useState<SelectedAdState>(null);
  const [selectedMc, setSelectedMc] = useState<SelectedMcState>(null);
  const [sortKey, setSortKey] = useState<SortKey>('groupName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  if (data.length === 0) return null;

  const openMetricModal = (row: BreadthRow, metric: MetricKey) => {
    setSelectedAd(null);
    setSelectedMc(null);
    setSelected({
      groupId: row.groupId,
      groupName: row.groupName,
      metric,
    });
  };

  const closeMetricModal = () => {
    setSelected(null);
  };

  const openAdModal = (row: BreadthRow) => {
    setSelected(null);
    setSelectedMc(null);
    setSelectedAd({
      groupId: row.groupId,
      groupName: row.groupName,
    });
  };

  const closeAdModal = () => {
    setSelectedAd(null);
  };

  const openMcModal = (row: BreadthRow) => {
    setSelected(null);
    setSelectedAd(null);
    setSelectedMc({
      groupId: row.groupId,
      groupName: row.groupName,
    });
  };

  const closeMcModal = () => {
    setSelectedMc(null);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
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
        return ad;
      case 'advRatio':
        return advRatio;
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
                {/* List */}
                <th
                  className="sticky left-0 z-10 bg-zinc-900/80 px-3 py-2 text-leftfont-medium text-zinc-300 w-48 cursor-pointer select-none"
                  onClick={() => handleSort('groupName')}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>List</span>
                    <span className="text-[9px] text-zinc-500">
                      {sortIcon('groupName')}
                    </span>
                  </div>
                </th>

                {/* Total */}
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

                {/* Adv */}
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

                {/* Dec */}
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

                {/* A-D */}
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

                {/* Mc column (not sortable) */}
                <th className="w-16 px-2 py-2 text-right font-medium text-zinc-300">
                  <div className="flex items-center justify-end gap-1">
                    <span>McClellan</span>
                  </div>
                </th>

                {/* 52w High */}
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

                {/* 52w Low */}
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

                {/* % >MAs */}
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

                {/* Up / Down on volume */}
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

                const spikeUpRatio = row.total ? (row.spikeUp / row.total) * 100 : 0;
                const spikeDownRatio = row.total
                  ? (row.spikeDown / row.total) * 100
                  : 0;

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
                    {/* List */}
                    <td className="sticky left-0 z-10 max-w-[220px] bg-inherit px-3 py-1.5 w-48">
                      <span className="truncate text-zinc-100">
                        {row.groupName}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="w-24 px-2 py-1.5 text-right text-zinc-300">
                      {row.total}
                    </td>

                    {/* Adv -> AD modal */}
                    <td
                      className="w-24 px-2 py-1.5 text-right text-emerald-300 cursor-pointer hover:text-emerald-200"
                      onClick={() => openAdModal(row)}
                    >
                      {row.adv}
                    </td>

                    {/* Dec -> AD modal */}
                    <td
                      className="w-24 px-2 py-1.5 text-right text-rose-300 cursor-pointer hover:text-rose-200"
                      onClick={() => openAdModal(row)}
                    >
                      {row.dec}
                    </td>

                    {/* A-D -> AD modal */}
                    <td
                      className={`w-24 px-2 py-1.5 text-right cursor-pointer hover:opacity-80 ${adColor}`}
                      onClick={() => openAdModal(row)}
                    >
                      <div className="flex flex-col items-end">
                        <span>{ad}</span>
                        <span className="text-[10px] text-zinc-500">
                          {advRatio.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* Mc button column */}
                    <td className="w-16 px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => openMcModal(row)}
                        className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-300 hover:bg-zinc-800"
                        title="Open McClellan charts"
                      >
                        Mc
                      </button>
                    </td>

                    {/* 52w high/low */}
                    <td className="w-24 px-2 py-1.5 text-right text-amber-200">
                      {row.newHigh52w}
                    </td>
                    <td className="w-24 px-2 py-1.5 text-right text-sky-200">
                      {row.newLow52w}
                    </td>

                    {/* MA cells -> metric modal */}
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

                    {/* Up / Down On Volume */}
                    <td
                      className="w-28 px-2 py-1.5 text-right text-emerald-300 cursor-pointer hover:text-emerald-200"
                      onClick={() => openMetricModal(row, 'spikeUp')}
                    >
                      <div className="flex flex-col items-end">
                        <span>{row.spikeUp}</span>
                        <span className="text-[10px] text-zinc-500">
                          {spikeUpRatio.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    <td
                      className="w-28 px-2 py-1.5 text-right text-rose-300 cursor-pointer hover:text-rose-200"
                      onClick={() => openMetricModal(row, 'spikeDown')}
                    >
                      <div className="flex flex-col items-end">
                        <span>{row.spikeDown}</span>
                        <span className="text-[10px] text-zinc-500">
                          {spikeDownRatio.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selected && <BreadthModal selected={selected} onClose={closeMetricModal} />}
      {selectedAd && <BreadthAdModal selected={selectedAd} onClose={closeAdModal} />}
      {selectedMc && <McClellanModal selected={selectedMc} onClose={closeMcModal} />}
    </>
  );
}
