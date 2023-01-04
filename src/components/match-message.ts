import { GameSide, LobbyDetails, Player, Scrim } from '../entities/scrim';
import { chance } from '../lib/chance';
// @ts-ignore
import { User } from '../entities/user';
import { EmbedBuilder } from 'discord.js';

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
const teamToString = (player: Player) => `${player.role}: <@${player.userID}> (${player.pregameElo})`;

export const matchDetailsEmbed = (scrim: Scrim, lobbyDetails: LobbyDetails) => {
  const { teamNames, eloDifference, offroleCount, autoFilledCount } = lobbyDetails;
  const lobbyCreator = chance.pickone(scrim.players);
  // Sort the teams by side
  const teams: { [key in GameSide]: Player[] } = { RED: [], BLUE: [] };
  scrim.players.forEach((player) => {
    teams[player.side].push(player);
  });

  const blue = teams.BLUE.sort(sortByRole);
  const red = teams.RED.sort(sortByRole);

  const embed = new EmbedBuilder()
    .setColor(698371)
    .setTitle(`Queue Popped!`)
    .setDescription(
      `
    **MATCH ID**: **${scrim.id}**\n
    ${autoFilledCount === 0 ? 'No autofilled players in this' : `${autoFilledCount} players have been autofilled`}\n
    Elo difference: ${eloDifference}\n
    Players on offrole: ${offroleCount}\n
    **Lobby creator**: <@${lobbyCreator.userID}>\n
      `
    )
    .addFields(
      { name: teamNames[0], value: blue.map(teamToString).join('\n'), inline: true },
      { name: teamNames[1], value: red.map(teamToString).join('\n'), inline: true }
    )
    .setTimestamp();
  return embed;
};

export const lobbyDetailsEmbed = (
  teamName: string,
  scrimID: number,
  teammates: User[],
  enemies: User[],
  draftURL: string,
  lobbyName: string,
  password: number,
  opggTeam: string,
  opggEnemy: string
) => {
  const detailsText = `
      Lobby name: ${lobbyName}
      Password: ${password}
      [**Become Draft Captain**](${draftURL})
      [**Spectate draft**](${draftURL.split('/').slice(0, -1).join('/')})
      `;
  const scoutingLinksMsg = `
    [**Team Profiles**](${opggTeam})
    [**Enemy Profiles**](${opggEnemy})
  `;

  const embed = new EmbedBuilder()
    .setColor(698371)
    .setTitle(`Summoner School Match #${scrimID}`)
    .setDescription(`**${teamName}**`)
    .addFields(
      { name: 'Lobby details', value: detailsText, inline: true },
      { name: 'Scouting Links', value: scoutingLinksMsg, inline: true },
      { name: '\u200B', value: '\u200B' },
      { name: 'Teammates IGNs', value: teammates.map((p) => p.leagueIGN).join('\n'), inline: true },
      { name: 'Enemy IGNs', value: enemies.map((p) => p.leagueIGN).join('\n'), inline: true }
    )
    .setTimestamp();
  return embed;
};
