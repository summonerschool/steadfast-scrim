import { MessageEmbed } from 'discord.js';
import { GameSide, Player, Scrim } from '../entities/scrim';
import { chance } from '../lib/chance';
import { capitalize } from '../utils/utils';
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

export const matchMessage = (scrim: Scrim, opggBlue: string, opggRed: string, draftURL?: string) => {
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
  const embed = new MessageEmbed()
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

  if (draftURL) {
    embed.addField('Prodraft Link', `[**Spectate Draft**](${draftURL})`);
  }

  return embed;
};

export const showQueueMessage = async (users: User[]) => {
  const mentions = users.map((q) => {
    // if (!q.userID.includes('-')) {
    // todo: remove later
    return `<@${q.id}>`;
    // }
  });

  const rankCount = new Map<User['rank'], number>();

  users.forEach((value) => {
    if (value.rank) {
      const count = rankCount.get(value.rank) || 0;
      rankCount.set(value.rank, count + 1);
    }
  });

  let resultRanks = '';
  for (const [rank, count] of rankCount.entries()) {
    // TODO: Add emoji rank translation
    resultRanks += `${capitalize(rank)}: ${count}`;
  }

  return new MessageEmbed()
    .setColor('#698371')
    .setTitle(`**${users.length} players in queue**\n`)
    .setDescription(
      `
    **Total Ranks:**\n ${resultRanks}
    **Players:**\n ${mentions.join('\n')}`
    );
};
