import { useId } from "react";

type RatingInputProps = {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
};

const STARS = [1, 2, 3, 4, 5];

// Controlled 1-5 star picker for use inside a "log this" form. Built from
// visually-hidden native radio inputs so the group stays keyboard- and
// screen-reader-accessible without a manual ARIA radiogroup.
export function RatingInput({ value, onChange, disabled }: RatingInputProps) {
  // Unique per instance so multiple RatingInputs on one page (e.g. several
  // "log this" forms open at once) don't share a radio group by name.
  const groupName = useId();

  return (
    <fieldset className="flex items-center gap-1">
      <legend className="sr-only">Rating</legend>
      {STARS.map((star) => {
        const filled = value !== null && star <= value;
        return (
          <label
            key={star}
            className="p-0.5 text-2xl leading-none has-[:disabled]:opacity-50"
          >
            <input
              type="radio"
              name={groupName}
              value={star}
              checked={value === star}
              disabled={disabled}
              onChange={() => onChange(star)}
              className="sr-only"
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
            />
            <span
              className={
                filled
                  ? "text-amber-400"
                  : "text-neutral-300 dark:text-neutral-700"
              }
            >
              {filled ? "★" : "☆"}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
