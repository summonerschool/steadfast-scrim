import { EmbedFieldData, MessageEmbed } from 'discord.js';
import { Player, Scrim } from '../entities/scrim';
import { Queuer } from '../entities/queue';
import { chance } from '../lib/chance';
import { scrimService } from '../services';
import { POSITION_EMOJI_TRANSLATION } from '../utils/utils';
// @ts-ignore
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

export const matchMessage = async (scrim: Scrim) => {
  const lobbyCreator = chance.pickone(scrim.players);
  const teams = scrimService.sortPlayerByTeam(scrim.players);
  const opggBlue = await scrimService.generateScoutingLink(scrim.id, 'BLUE');
  const opggRed = await scrimService.generateScoutingLink(scrim.id, 'RED');

  const scoutingLinksMsg = `
    [**Blue OP.GG**](${opggBlue})
    [**Red OP.GG**](${opggRed})
  `;

  const redText = teams.RED.sort(sortByRole).map(teamToString);
  const blueText = teams.BLUE.sort(sortByRole).map(teamToString);

  return new MessageEmbed()
    .setColor('#698371')
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
    .setTimestamp()
    .setFooter({ text: 'Anything wrong? spam the shit out of Tikka Masala' });
};

export const showQueueMessage = async (users: Queuer[]) => {
  const mentions = users.map((q) => {
    if (!q.userID.includes('-')) {
      // todo: remove later
      return `<@${q.userID}>`;
    }
  });

  const embedfields: EmbedFieldData[] = [];
  const rankCount = new Map<User['rank'], number>();

  users.forEach((value) => {
    if (value.rank) {
      const count = rankCount.get(value.rank) || 0;
      rankCount.set(value.rank, count);
    }

    let roles_img = '';
    if (value.roles) {
      const roles_to_image = value.roles.map((x) => {
        return `${POSITION_EMOJI_TRANSLATION[x]}`;
      });
      roles_img = `${roles_to_image.join('')}`;
    }
    // embedfields.push({
    //   name: `${roles_img}`,
    //   value: `${capitalize(value.rank)}`,
    //   inline: true
    // });
  });

  let resultRanks = '';
  // Object.entries(ranksCount).forEach(([key, value]) => {
  //   resultRanks += `**${capitalize(key)}**: ${value}\n`;
  // });

  return new MessageEmbed()
    .setColor('#698371')
    .setTitle(`**${users.length} players in queue**\n`)
    .setDescription(
      `
    **Total Ranks:**\n ${resultRanks}
    **Players:**\n ${mentions}`
    )
    .addFields(embedfields);
};
