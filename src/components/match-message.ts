import { GameSide, Player, Scrim } from '../entities/scrim';
import { chance } from '../lib/chance';
import { capitalize } from '../utils/utils';
// @ts-ignore
import { User } from '../entities/user';
import { EmbedBuilder } from '@discordjs/builders';
import { CommandContext } from 'slash-create';
import { scrimService } from '../services';
import { client } from '..';
import { ProdraftURLs } from '../entities/external';

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

export const createAndSendMatchMessage = async (scrim: Scrim) => {
  const draftURLs = await scrimService.createProdraftLobby(scrim.id);
  const opggBlue = await scrimService.generateScoutingLink(scrim.id, 'BLUE');
  const opggRed = await scrimService.generateScoutingLink(scrim.id, 'RED');
  // Send DMs
  const userPromises = scrim.players
    .filter((p) => !p.userID.includes('-'))
    .map((p) => client.users.fetch(p.userID, { cache: false }));
  const discordUsers = await Promise.all(userPromises);
  const messagePromises = discordUsers.map(async (user) => {
    // remove the spectator url so people dont get confused
    const matchEmbed = matchDetailsEmbed(scrim, opggBlue, opggRed);
    const gameEmbed = await lobbyDetailsEmbed(scrim, user.id, draftURLs);
    return user.send({ embeds: [matchEmbed, gameEmbed] });
  });
  const msgs = await Promise.all(messagePromises);
  console.info(`Sent ${msgs.length} DMs`);
  const publicEmbed = matchDetailsEmbed(scrim, opggBlue, opggRed, draftURLs.SPECTATOR.url);
  return {
    embeds: [publicEmbed as any]
  };
};

const matchDetailsEmbed = (scrim: Scrim, opggBlue: string, opggRed: string, draftURL?: string) => {
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
    No autofilled players in this, feel free to swap roles among yourselves.\n
    **MATCH ID**: **${scrim.id}**\n
    **Lobby creator**: <@${lobbyCreator.userID}>\n
      `
    )
    .addFields(
      { name: 'Team Blue', value: blueText.join('\n'), inline: true },
      { name: 'Team Red', value: redText.join('\n'), inline: true },
      { name: 'Scouting links:', value: scoutingLinksMsg }
    )
    .setTimestamp();

  if (draftURL) {
    embed.addFields({ name: 'Prodraft Link', value: `[**Spectate Draft**](${draftURL})` });
  }

  return embed;
};

const lobbyDetailsEmbed = async (scrim: Scrim, recipientID: string, draftURLs: ProdraftURLs) => {
  const side = scrim.players.find((p) => p.userID === recipientID)?.side || 'BLUE';
  const teammates = await scrimService.getUserProfilesInScrim(scrim.id, side);

  const detailsText = `
      Lobby name: \`${chance.word({ length: 5 })}${chance.integer({ min: 10, max: 20 })}\`
      Password: \`${chance.integer({ min: 1000, max: 9999 })}\`
      [**Join draft**](${draftURLs[side].url})
      `;
  return new EmbedBuilder()
    .setColor(698371)
    .setTitle(`Summoner School Game #${scrim.id}`)
    .setDescription(`**Team ${draftURLs[side].name}**`)
    .addFields({ name: 'Lobby details', value: detailsText, inline: true })
    .addFields({ name: 'Teammates IGNs', value: teammates.map((p) => p.leagueIGN).join('\n'), inline: true });
};
