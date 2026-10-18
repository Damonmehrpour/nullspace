import { useId, type ReactNode } from 'react'
import { useStore, type Settings as SettingsData } from '../state/store'
import { Panel } from './Panel/Panel'

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 border-0 border-t-2 border-slab p-0 py-4">
      <legend className="float-left mb-2 w-full font-bold">{legend}</legend>
      <div className="clear-both flex flex-wrap gap-4">{children}</div>
    </fieldset>
  )
}

function Radio<K extends keyof SettingsData>({ name, value, label, field }: { name: string; value: SettingsData[K]; label: string; field: K }) {
  const current = useStore((s) => s.settings[field])
  const update = useStore((s) => s.updateSettings)
  return (
    <label className="flex items-center gap-2">
      <input type="radio" name={name} checked={current === value} onChange={() => update({ [field]: value } as Partial<SettingsData>)} className="size-4 accent-black" />
      {label}
    </label>
  )
}

function Check({ field, label, hint }: { field: 'typing' | 'subtitles'; label: string; hint: string }) {
  const checked = useStore((s) => s.settings[field])
  const update = useStore((s) => s.updateSettings)
  const hintId = useId()
  return (
    <div className="flex items-start gap-3 py-2">
      <input id={hintId + '-input'} type="checkbox" checked={checked} aria-describedby={hintId} onChange={(e) => update({ [field]: e.target.checked })} className="mt-1 size-4 accent-black" />
      <div>
        <label htmlFor={hintId + '-input'} className="block font-semibold">
          {label}
        </label>
        <p id={hintId} className="m-0 text-sm text-graphite">
          {hint}
        </p>
      </div>
    </div>
  )
}

/** Visitor preferences. Each change applies immediately and is remembered on this device. */
export function Settings({ onClose }: { onClose: () => void }) {
  return (
    <Panel title="Settings" onClose={onClose}>
      <div className="border-t-2 border-slab py-2">
        <Check field="typing" label="Typing effect" hint="Type the guide's lines out letter by letter." />
        <Check field="subtitles" label="Subtitles" hint="Show the guide's lines. Navigation help stays available to screen readers either way." />
      </div>
      <Group legend="Reduced motion">
        <Radio name="reduced-motion" field="reducedMotion" value="system" label="Follow system" />
        <Radio name="reduced-motion" field="reducedMotion" value="on" label="On" />
        <Radio name="reduced-motion" field="reducedMotion" value="off" label="Off" />
      </Group>
      <Group legend="Quality">
        <Radio name="quality" field="quality" value="high" label="High" />
        <Radio name="quality" field="quality" value="low" label="Low" />
        <p className="m-0 w-full text-sm text-graphite">High lowers itself automatically if the frame rate drops. Low is lighter for older devices.</p>
      </Group>
    </Panel>
  )
}
