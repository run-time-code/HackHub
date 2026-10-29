import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

const MAX_SKILLS = 10;

export default function SkillPicker({ taxonomy = {}, selected = [], proficiency = {}, onChange, disabled }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef(null);

  const selectedSet = useMemo(() => new Set(selected.map((skill) => skill.toLowerCase())), [selected]);

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    return Object.entries(taxonomy)
      .map(([group, skills]) => ({
        group,
        skills: (Array.isArray(skills) ? skills : []).filter(
          (skill) => !selectedSet.has(skill.toLowerCase()) && (!term || skill.toLowerCase().includes(term))
        ),
      }))
      .filter((entry) => entry.skills.length > 0);
  }, [taxonomy, query, selectedSet]);

  const flatOptions = useMemo(
    () => groups.flatMap((entry) => entry.skills.map((skill) => ({ group: entry.group, skill }))),
    [groups]
  );

  useEffect(() => {
    function onPointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function addSkill(skill) {
    if (disabled || selected.length >= MAX_SKILLS) return;
    onChange([...selected, skill], {
      ...proficiency,
      [skill]: proficiency[skill] || "intermediate",
    });
    setQuery("");
    setOpen(false);
  }

  function removeSkill(skill) {
    const nextProficiency = { ...proficiency };
    delete nextProficiency[skill];
    onChange(
      selected.filter((entry) => entry !== skill),
      nextProficiency
    );
  }

  function setLevel(skill, level) {
    onChange(selected, { ...proficiency, [skill]: level });
  }

  function handleKeyDown(event) {
    if (!open) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => Math.min(index + 1, flatOptions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = flatOptions[highlighted];
      if (option) addSkill(option.skill);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  let optionIndex = -1;

  return (
    <div className="skill-picker" ref={wrapperRef}>
      <div className="skill-picker__selected">
        {selected.length === 0 && (
          <p className="field__hint">Add up to ten skills. Proficiency sets the dots on your card.</p>
        )}
        {selected.map((skill) => (
          <div className="skill-row" key={skill}>
            <span className="skill-row__name">{skill}</span>
            <select
              className="skill-row__level"
              value={proficiency[skill] || "intermediate"}
              onChange={(event) => setLevel(skill, event.target.value)}
              aria-label={`Proficiency in ${skill}`}
              disabled={disabled}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
            <button
              type="button"
              className="skill-row__remove"
              onClick={() => removeSkill(skill)}
              aria-label={`Remove ${skill}`}
              disabled={disabled}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div className="skill-picker__search">
        <div className="input-group">
          <Search aria-hidden="true" />
          <input
            className="input"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlighted(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selected.length >= MAX_SKILLS ? "Ten skills is the ceiling" : "Search the skill index…"}
            aria-label="Search skills"
            aria-expanded={open}
            aria-controls="skill-picker-results"
            role="combobox"
            aria-autocomplete="list"
            disabled={disabled || selected.length >= MAX_SKILLS}
          />
        </div>

        {open && selected.length < MAX_SKILLS && (
          <div className="skill-picker__results" id="skill-picker-results" role="listbox">
            {flatOptions.length === 0 && (
              <div className="skill-picker__empty">
                {query ? `No skill matches “${query}”.` : "The skill index is loading."}
              </div>
            )}
            {groups.map((group) => (
              <div key={group.group}>
                <div className="skill-picker__group-label">{group.group}</div>
                {group.skills.map((skill) => {
                  optionIndex += 1;
                  const index = optionIndex;
                  return (
                    <button
                      key={skill}
                      type="button"
                      role="option"
                      aria-selected={index === highlighted}
                      className={`skill-picker__option ${index === highlighted ? "is-highlighted" : ""}`}
                      onMouseEnter={() => setHighlighted(index)}
                      onClick={() => addSkill(skill)}
                    >
                      {skill}
                      <span>{index === highlighted ? "↵ add" : ""}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="skill-picker__foot">
        <span>
          {selected.length} / {MAX_SKILLS} skills
        </span>
        <span className="cluster" style={{ gap: 4 }}>
          <kbd className="kbd">↑</kbd>
          <kbd className="kbd">↓</kbd>
          <kbd className="kbd">↵</kbd>
        </span>
      </div>
    </div>
  );
}

export { MAX_SKILLS };
