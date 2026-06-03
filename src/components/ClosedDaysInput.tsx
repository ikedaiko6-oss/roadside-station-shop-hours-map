"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const QUICK_OPTIONS = ["無休", "不定休", "年末年始"];
const WEEKDAY_OPTIONS = ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"];

function splitClosedDays(value: string) {
  return value
    .split(/[、,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinClosedDays(items: string[]) {
  return items.join("、");
}

export default function ClosedDaysInput({ value, onChange }: Props) {
  const items = splitClosedDays(value);

  const setSingleValue = (option: string) => {
    onChange(value.trim() === option ? "" : option);
  };

  const toggleWeekday = (weekday: string) => {
    if (items.includes(weekday)) {
      onChange(joinClosedDays(items.filter((item) => item !== weekday)));
      return;
    }

    const nextItems = QUICK_OPTIONS.includes(value.trim()) ? [weekday] : [...items, weekday];
    onChange(joinClosedDays(nextItems));
  };

  return (
    <div className="space-y-2 rounded-lg border border-sky-100 bg-sky-50/60 p-3">
      <label className="block text-sm font-medium text-gray-700">定休日</label>

      <div className="grid grid-cols-3 gap-2">
        {QUICK_OPTIONS.map((option) => {
          const selected = value.trim() === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setSingleValue(option)}
              className={`min-h-10 rounded-lg border px-2 text-sm font-medium ${
                selected
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-sky-200 bg-white text-sky-800 hover:bg-sky-100"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {WEEKDAY_OPTIONS.map((weekday) => {
          const selected = items.includes(weekday);
          return (
            <button
              key={weekday}
              type="button"
              onClick={() => toggleWeekday(weekday)}
              className={`min-h-10 rounded-lg border px-2 text-sm font-medium ${
                selected
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-emerald-50"
              }`}
            >
              {weekday.replace("曜", "")}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例：水曜、年末年始"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        maxLength={80}
      />
    </div>
  );
}
