import { Check } from "lucide-react";

export default function SelectableChips({ options, selected, onToggle, label }) {
  return (
    <div className="onboarding__chips" role="group" aria-label={label}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            aria-pressed={isSelected}
            className={`chip chip--button onboarding-chip ${
              isSelected ? "chip--selected" : ""
            }`}
          >
            {isSelected && <Check aria-hidden="true" />}
            {option}
          </button>
        );
      })}
    </div>
  );
}
