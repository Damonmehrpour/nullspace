import type { ContactChannel, ContactSection } from '../../content/schema'

export type Stone = { label: string; value: string }

/** One transmitter stone per public contact channel, straight from the CV; pending channels are left out. */
export function contactStones(channels: ContactChannel[]): Stone[] {
  return channels.flatMap((c) => (c.value.state === 'confirmed' ? [{ label: c.label, value: c.value.value }] : []))
}

/** The lines engraved on the tower's base: location and availability, when confirmed. */
export function contactBase(contact: Pick<ContactSection, 'location' | 'availability'>): string[] {
  return [contact.location, contact.availability].flatMap((f) => (f.state === 'confirmed' ? [f.value] : []))
}
