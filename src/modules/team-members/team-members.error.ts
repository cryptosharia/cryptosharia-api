export type TeamMembersErrorCode =
  | 'TEAM_MEMBER_NOT_FOUND'
  | 'SLUG_ALREADY_EXISTS'
  | 'INVALID_EXPERTISE_DATA';

export class TeamMembersError extends Error {
  constructor(
    public readonly code: TeamMembersErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'TeamMembersError';
  }
}
