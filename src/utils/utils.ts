export const ELO_TRANSLATION: { [key: string]: number } = {
  IRON: 400,
  BRONZE: 800,
  SILVER: 1200,
  GOLD: 1600,
  PLATINUM: 2000,
  EMERALD: 2400,
  DIAMOND: 2800,
  MASTER: 3200,
  GRANDMASTER: 3400,
  CHALLENGER: 3600
};

export const getEstimatedRank = (elo: number) => {
  const ranks = Object.entries(ELO_TRANSLATION);
  let closestRank = ranks[0][0]; // Starts at Iron
  for (const [rank, rankElo] of ranks) {
    if (elo > rankElo) {
      closestRank = rank;
    }
  }
  return closestRank;
};

export const RANK_IMAGE_TRANSLATION: { [key: string]: string } = {
  IRON: 'https://static.wikia.nocookie.net/leagueoflegends/images/f/f8/Season_2023_-_Iron.png',
  BRONZE: 'https://static.wikia.nocookie.net/leagueoflegends/images/c/cb/Season_2023_-_Bronze.png',
  SILVER: 'https://static.wikia.nocookie.net/leagueoflegends/images/c/c4/Season_2023_-_Silver.png',
  GOLD: 'https://static.wikia.nocookie.net/leagueoflegends/images/7/78/Season_2023_-_Gold.png',
  PLATINUM: 'https://static.wikia.nocookie.net/leagueoflegends/images/b/bd/Season_2023_-_Platinum.png',
  EMERALD: 'https://static.wikia.nocookie.net/leagueoflegends/images/4/4b/Season_2023_-_Emerald.png',
  DIAMOND: 'https://static.wikia.nocookie.net/leagueoflegends/images/3/37/Season_2023_-_Diamond.png',
  MASTER: 'https://static.wikia.nocookie.net/leagueoflegends/images/d/d5/Season_2023_-_Master.png',
  GRANDMASTER: 'https://static.wikia.nocookie.net/leagueoflegends/images/6/64/Season_2023_-_Grandmaster.png',
  CHALLENGER: 'https://static.wikia.nocookie.net/leagueoflegends/images/1/14/Season_2023_-_Challenger.png'
};

export const POSITION_IMAGE_TRANSLATION: { [key: string]: string } = {
  TOP: 'https://static.wikia.nocookie.net/leagueoflegends/images/e/ef/Top_icon.png/revision/latest/scale-to-width-down/32',
  JUNGLE:
    'https://static.wikia.nocookie.net/leagueoflegends/images/1/1b/Jungle_icon.png/revision/latest/scale-to-width-down/32',
  MID: 'https://static.wikia.nocookie.net/leagueoflegends/images/9/98/Middle_icon.png/revision/latest/scale-to-width-down/32',
  BOT: 'https://static.wikia.nocookie.net/leagueoflegends/images/9/97/Bottom_icon.png/revision/latest/scale-to-width-down/32',
  SUPPORT:
    'https://static.wikia.nocookie.net/leagueoflegends/images/e/e0/Support_icon.png/revision/latest/scale-to-width-down/32'
};

export const POSITION_EMOJI_TRANSLATION: { [key: string]: string } = {
  TOP: '<:TOP:1010190987420762153>',
  JUNGLE: '<:JUNGLE:1010190985663365261>',
  MID: '<:MID:1010190983939493888>',
  BOT: '<:BOTTOM:1010190988809093171>',
  SUPPORT: '<:SUPPORT:1010190959709016235>'
};

export const capitalize = (text: string) => `${text[0].toUpperCase()}${text.slice(1).toLowerCase()}`;
