// Reusable multi-select chip picker for skills/interests steps
export default function SelectableChips({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              isSelected
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-blue-400"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}