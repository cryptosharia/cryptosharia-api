export const ACADEMY_SUBJECTS = [
  'fundamental',
  'technical',
  'muamalah',
  'web3',
] as const;

export type AcademySubjectId = (typeof ACADEMY_SUBJECTS)[number];

export const ACADEMY_SUBJECT_NAMES: Record<AcademySubjectId, string> = {
  fundamental: 'Analisis Fundamental',
  technical: 'Analisis Teknikal',
  muamalah: 'Fikih Muamalah',
  web3: 'Web3 & Blockchain',
};

/** Planned curriculum slot limits per subject */
export const ACADEMY_PLANNED_LEVELS = 6;
export const ACADEMY_PLANNED_CHAPTERS = 7;

/** Default access scope identifier */
export const DEFAULT_ACADEMY_SCOPE = 'scope-a';

/** Allowed content kinds in hierarchical order */
export const ACADEMY_CONTENT_KINDS = [
  'subject',
  'level',
  'chapter',
  'lesson',
] as const;

export type AcademyContentKind = (typeof ACADEMY_CONTENT_KINDS)[number];

/** Allowed publication statuses */
export const ACADEMY_CONTENT_STATUSES = [
  'draft',
  'review',
  'approved',
  'published',
  'archived',
] as const;

export type AcademyContentStatus = (typeof ACADEMY_CONTENT_STATUSES)[number];
