import { chance } from '../lib/chance';
// @ts-ignore
import { EmbedBuilder } from 'discord.js';
import type { Player, Scrim, User } from '@prisma/client';
import type { GameSide, LobbyDetails } from '../models/matchmaking';

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
const teamToString = (player: Player) => `${player.role}: <@${player.userId}> (${player.pregameElo})`;

export const MatchDetailsEmbed = (scrim: Scrim, players: Player[], lobbyDetails: LobbyDetails) => {
  const { teamNames, eloDifference, offroleCount, autoFilledCount } = lobbyDetails;
  const lobbyCreator = chance.pickone(players);
  // Sort the teams by side
  const teams: { [key in GameSide]: Player[] } = { RED: [], BLUE: [] };
  players.forEach((player) => {
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
    **Lobby creator**: <@${lobbyCreator.userId}>\n
      `
    )
    .addFields(
      { name: teamNames[0], value: blue.map(teamToString).join('\n'), inline: true },
      { name: teamNames[1], value: red.map(teamToString).join('\n'), inline: true }
    )
    .setTimestamp();
  return embed;
};

export const LobbyDetailsEmbed = (
  teamName: string,
  scrimID: number,
  teammates: User[],
  enemies: User[],
  draftURL: string,
  lobbyName: string,
  password: number,
  scoutingLinkTeam: string,
  scoutingLinkEnemy: string
) => {
  const detailsText = `
      Lobby name: ${lobbyName}
      Password: ${password}
      [**Become Draft Captain**](${draftURL})
      [**Spectate draft**](${draftURL.split('/').slice(0, -1).join('/')})
      `;
  const scoutingLinksMsg = `
    [**Team Profiles**](${scoutingLinkTeam})
    [**Enemy Profiles**](${scoutingLinkEnemy})
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
