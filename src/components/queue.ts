import type { Region, Role, User } from '@prisma/client';
import { EmbedBuilder } from 'discord.js';
import { capitalize, POSITION_EMOJI_TRANSLATION } from '../utils/utils';

type QueueCommand = 'show' | 'leave' | 'join';

export const queueEmbed = (
  users: User[],
  command: QueueCommand,
  callerID: string,
  region: Region,
  detailed = false
) => {
  const plural = users.length === 1 ? '1 player is' : `${users.length} players are`;
  const embed = new EmbedBuilder()
    .setTitle(`${plural} currently in the ${region} queue`)
    .setTimestamp(new Date())
    .setColor(region === 'EUW' || region === 'EUW_HIGH_ELO' ? [40, 99, 206] : [187, 26, 52]);

  switch (command) {
    case 'join':
      return embed.setDescription(`<@${callerID}> has joined the queue.`);
    case 'leave':
      return embed.setDescription(`<@${callerID}> has left the queue.`);
    case 'show': {
      if (users.length === 0) {
        return embed;
      }

      const mentions = users.map((q) => `<@${q.id}>`);
      const rankCount = new Map<User['rank'], number>();
      const mainCount = new Map<Role, number>();
      const secondaryCount = new Map<Role, number>();
      users.forEach((value) => {
        if (value.rank) {
          const count = rankCount.get(value.rank) || 0;
          rankCount.set(value.rank, count + 1);
        }
        const main = mainCount.get(value.main) || 0;
        const secondary = secondaryCount.get(value.secondary) || 0;
        mainCount.set(value.main, main + 1);
        secondaryCount.set(value.secondary, secondary + 1);
      });

      let resultRanks = '';
      for (const [rank, count] of rankCount.entries()) {
        // TODO: Add emoji rank translation
        resultRanks += `${capitalize(rank)}: ${count}\n`;
      }

      const msg = embed.addFields(
        { name: 'Ranks', value: resultRanks },
        { name: 'Players', value: mentions.join('\n') }
      );
      if (detailed) {
        msg.addFields(
          { name: 'Main roles', value: roleCountToText(mainCount), inline: true },
          { name: 'Secondary roles', value: roleCountToText(secondaryCount), inline: true }
        );
      }
      return msg;
    }
  }
};

const roleCountToText = (roleCount: Map<Role, number>) => {
  const roles: Role[] = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];
  let text = '';
  for (const role of roles) {
    const count = roleCount.get(role) || 0;
    text += `${POSITION_EMOJI_TRANSLATION[role]}: ${count}\n`;
  }
  return text;
};
