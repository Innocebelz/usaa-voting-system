export interface User {
  matNumber: string;
  hasVoted: boolean;
  name: string;
  userBallot?: Record<string, string>;
}

export interface Candidate {
  id: string;
  name: string;
  manifesto: string;
  image: string;
}

export interface ElectionCategory {
  position: string;
  unopposed: boolean;
  candidates: Candidate[];
}
