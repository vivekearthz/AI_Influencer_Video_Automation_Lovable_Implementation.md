import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function MultiSelectField({
  label,
  options,
  value,
  onChange,
  required,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  required?: boolean;
}) {
  function toggle(option: string) {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  }

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
            <Checkbox checked={value.includes(option)} onCheckedChange={() => toggle(option)} />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}
