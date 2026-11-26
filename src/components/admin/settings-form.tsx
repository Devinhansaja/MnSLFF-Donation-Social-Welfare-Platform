import { SubmitButton } from "@/components/forms";
import { saveSettings } from "@/app/actions/admin/system";
import { cardPad } from "./styles";

export type SettingField = { key: string; label: string; type?: "text" | "textarea" | "number" | "email" | "url"; rows?: number; hint?: string; wide?: boolean };

export function SettingsForm({ fields, values, back, title, id, readOnly }: { fields: SettingField[]; values: Record<string, string>; back: string; title?: string; id?: string; readOnly?: boolean }) {
  return (
    <form id={id} action={saveSettings} className={`${cardPad} grid grid-cols-1 scroll-mt-24 gap-4 md:grid-cols-2`}>
      {title && <h2 className="md:col-span-2 font-semibold">{title}</h2>}
      <input type="hidden" name="back" value={back} />
      {fields.map((f) => (
        <div key={f.key} className={f.wide || f.type === "textarea" ? "md:col-span-2" : undefined}>
          <label className="label" htmlFor={`s-${f.key}`}>{f.label}</label>
          {f.type === "textarea" ? (
            <textarea id={`s-${f.key}`} name={`s:${f.key}`} rows={f.rows ?? 6} defaultValue={values[f.key] ?? ""} className="field" readOnly={readOnly} />
          ) : (
            <input id={`s-${f.key}`} name={`s:${f.key}`} type={f.type ?? "text"} defaultValue={values[f.key] ?? ""} className="field" readOnly={readOnly} />
          )}
          {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
        </div>
      ))}
      {!readOnly && <div className="md:col-span-2"><SubmitButton>Save</SubmitButton></div>}
    </form>
  );
}
