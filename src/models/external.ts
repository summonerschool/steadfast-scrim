export interface ProdraftResponse {
  auth: [string, string];
  id: string;
  champions: string[];
  // dont care
  game: object;
}

export interface DraftURLs {
  roomId: string;
  RED: string;
  BLUE: string;
  SPECTATOR: string;
}
