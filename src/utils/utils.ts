export const ELO_TRANSLATION: { [key: string]: number } = {
  IRON: 400,
  BRONZE: 800,
  SILVER: 1200,
  GOLD: 1600,
  PLATINUM: 2000,
  DIAMOND: 2400,
  MASTER: 2800,
  GRANDMASTER: 2800,
  CHALLENGER: 3000
};

export const RANK_IMAGE_TRANSLATION: { [key: string]: string } = {
  IRON: 'https://static.wikia.nocookie.net/leagueoflegends/images/f/fe/Season_2022_-_Iron.png',
  BRONZE: 'https://static.wikia.nocookie.net/leagueoflegends/images/e/e9/Season_2022_-_Bronze.png',
  SILVER: 'https://static.wikia.nocookie.net/leagueoflegends/images/4/44/Season_2022_-_Silver.png',
  GOLD: 'https://static.wikia.nocookie.net/leagueoflegends/images/8/8d/Season_2022_-_Gold.png',
  PLATINUM: 'https://static.wikia.nocookie.net/leagueoflegends/images/3/3b/Season_2022_-_Platinum.png',
  DIAMOND: 'https://static.wikia.nocookie.net/leagueoflegends/images/e/ee/Season_2022_-_Diamond.png',
  MASTER: 'https://static.wikia.nocookie.net/leagueoflegends/images/e/eb/Season_2022_-_Master.png',
  GRANDMASTER: 'https://static.wikia.nocookie.net/leagueoflegends/images/f/fc/Season_2022_-_Grandmaster.png',
  CHALLENGER: 'https://static.wikia.nocookie.net/leagueoflegends/images/0/02/Season_2022_-_Challenger.png'
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
  TOP: '<:TOP:1010191406666633266>',
  JUNGLE: '<:JUNGLE:1010191406666633266>',
  MID: '<:MID:1010191406666633266>',
  BOT: '<:BOT:1010191406666633266>',
  SUPPORT: '<:SUPPORT:1010191406666633266>'
};

export const capitalize = (text: string) => `${text[0].toUpperCase()}${text.slice(1).toLowerCase()}`;
