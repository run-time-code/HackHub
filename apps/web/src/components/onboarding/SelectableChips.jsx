export default function SelectableChips({ options, selected, onToggle, label }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            aria-pressed={isSelected}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              isSelected
                ? "border-emerald-800 bg-emerald-800 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-emerald-700"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}