"use client";

import { useMemo, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

function buildTimeOptions() {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of ["00", "30"]) {
      options.push(`${hour}:${minute}`);
    }
  }
  return options;
}

function parseTimeRange(value: string) {
  const match = value.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (!match) return null;
  return { start: match[1], end: match[2] };
}

export default function BusinessHoursInput({ value, onChange }: Props) {
  const options = useMemo(() => buildTimeOptions(), []);
  const parsed = parseTimeRange(value);
  const [startTime, setStartTime] = useState(parsed?.start ?? "9:00");
  const [endTime, setEndTime] = useState(parsed?.end ?? "17:00");
  const isOpen24Hours = value === "24時間";

  const updateRange = (nextStart: string, nextEnd: string) => {
    setStartTime(nextStart);
    setEndTime(nextEnd);
    onChange(`${nextStart}-${nextEnd}`);
  };

  const handleOpen24HoursChange = (checked: boolean) => {
    if (checked) {
      onChange("24時間");
      return;
    }
    onChange(`${startTime}-${endTime}`);
  };

  return (
    <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-gray-700">
          営業時間 <span className="text-red-500">*</span>
        </label>
        <label className="flex min-h-9 items-center gap-2 rounded-full bg-white px-3 text-sm font-medium text-emerald-700 shadow-sm">
          <input
            type="checkbox"
            checked={isOpen24Hours}
            onChange={(e) => handleOpen24HoursChange(e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          <span>24時間</span>
        </label>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <select
          value={startTime}
          onChange={(e) => updateRange(e.target.value, endTime)}
          disabled={isOpen24Hours}
          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
        >
          {options.map((time) => (
            <option key={`start-${time}`} value={time}>
              {time}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">から</span>
        <select
          value={endTime}
          onChange={(e) => updateRange(startTime, e.target.value)}
          disabled={isOpen24Hours}
          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
        >
          {options.map((time) => (
            <option key={`end-${time}`} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例：9:00-17:00、売り切れ次第終了"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        maxLength={80}
        required
      />
    </div>
  );
}
