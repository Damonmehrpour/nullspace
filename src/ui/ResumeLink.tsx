import type { ContactSection } from '../content/schema'

/** Direct résumé access when a PDF is confirmed; an honest disabled item otherwise. */
export function ResumeLink({ contact, className = '' }: { contact: ContactSection; className?: string }) {
  if (contact.resumePdf.state === 'confirmed') {
    return (
      <a href={contact.resumePdf.value} download className={className}>
        Download résumé (PDF)
      </a>
    )
  }
  return (
    <span aria-disabled="true" className={`cursor-not-allowed opacity-60 ${className}`}>
      Résumé: coming soon
    </span>
  )
}
