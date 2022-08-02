import { GameSide, LobbyDetails, Player, Scrim } from '../entities/scrim';
import { chance } from '../lib/chance';
// @ts-ignore
import { EmbedBuilder } from '@discordjs/builders';
import { User } from '../entities/user';

const ROLES_ORDER = {
  TOP: 1,
  JUNGLE: 2,
  MID: 3,
  BOT: 4,
  SUPPORT: 5
};

const sortByRole = (p1: Player, p2: Player) => {
  return ROLES_ORDER[p1.role] - ROLES_ORDER[p2.role];
};
const teamToString = (player: Player) => `${player.role}: <@${player.userID}>`;

export const matchDetailsEmbed = (scrim: Scrim, opggBlue: string, opggRed: string, lobbyDetails: LobbyDetails) => {
  const { teamNames, eloDifference, offroleCount, autoFilledCount } = lobbyDetails;
  const lobbyCreator = chance.pickone(scrim.players);
  // Sort the teams by side
  const teams: { [key in GameSide]: Player[] } = { RED: [], BLUE: [] };
  scrim.players.forEach((player) => {
    teams[player.side].push(player);
  });

  const scoutingLinksMsg = `
    [**Blue OP.GG**](${opggBlue})
    [**Red OP.GG**](${opggRed})
  `;

  const redText = teams.RED.sort(sortByRole).map(teamToString);
  const blueText = teams.BLUE.sort(sortByRole).map(teamToString);
  const embed = new EmbedBuilder()
    .setColor(698371)
    .setTitle(`Queue Popped!`)
    .setDescription(
      `
    **MATCH ID**: **${scrim.id}**\n
    ${
      autoFilledCount === 0
        ? 'No autofilled players in this, feel free to swap roles among yourselves.'
        : `${autoFilledCount} players have been autofilled`
    }\n
    Elo difference: ${eloDifference}\n
    Players on offrole: ${offroleCount}\n
    **Lobby creator**: <@${lobbyCreator.userID}>\n
      `
    )
    .addFields(
      { name: teamNames[0], value: blueText.join('\n'), inline: true },
      { name: teamNames[1], value: redText.join('\n'), inline: true },
      { name: 'Scouting links:', value: scoutingLinksMsg }
    )
    .setTimestamp();
  return embed;
};

export const lobbyDetailsEmbed = (
  teamName: string,
  scrimID: number,
  teammates: User[],
  draftURL: string,
  lobbyName: string,
  password: number
) => {
  const detailsText = `
      Lobby name: ${lobbyName}
      Password: ${password}
      [**Join draft**](${draftURL})
      `;
  const embed = new EmbedBuilder()
    .setColor(698371)
    .setTitle(`Summoner School Game #${scrimID}`)
    .setDescription(`**${teamName}**`)
    .addFields({ name: 'Lobby details', value: detailsText, inline: true })
    .addFields({ name: 'Teammates IGNs', value: teammates.map((p) => p.leagueIGN).join('\n'), inline: true })
    .setTimestamp();
  return embed;
};
