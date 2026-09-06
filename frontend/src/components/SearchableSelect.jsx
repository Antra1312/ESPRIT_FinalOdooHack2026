import { useEffect, useId, useState } from 'react';

// A native datalist keeps the selector keyboard-friendly while allowing users
// to type and filter long employee, department, position, and schedule lists.
export default function SearchableSelect({ value, onChange, options, placeholder = 'Type to search…', emptyLabel = '' }) {
  const listId = useId().replace(/:/g, '');
  const selected = options.find((option) => String(option.value) === String(value ?? ''));
  const selectedText = selected?.label || String(value ?? '');
  const [text, setText] = useState(selectedText);

  useEffect(() => setText(selectedText), [selectedText]);

  const choose = (nextText) => {
    setText(nextText);
    if (!nextText && emptyLabel) {
      onChange('');
      return;
    }
    const match = options.find((option) => option.label.toLowerCase() === nextText.trim().toLowerCase());
    if (match) onChange(match.value);
  };

  return (
    <>
      <input
        list={listId}
        value={text}
        placeholder={placeholder}
        onChange={(event) => choose(event.target.value)}
        onBlur={() => setTimeout(() => setText(selected?.label || String(value ?? '')), 120)}
      />
      <datalist id={listId}>
        {emptyLabel && <option value="">{emptyLabel}</option>}
        {options.map((option) => <option key={`${option.value}-${option.label}`} value={option.label} />)}
      </datalist>
    </>
  );
}
