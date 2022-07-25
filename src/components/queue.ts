import { EmbedBuilder } from '@discordjs/builders';
import { User } from '../entities/user';
import { capitalize } from '../utils/utils';

type QueueCommand = 'show' | 'leave' | 'join';

const RANK_EMOJI: { [key in User['rank']]: string } = {
  IRON: '',
  BRONZE: '',
  SILVER: '',
  GOLD: '',
  PLATINUM: '<:platinum:1001133279761670235>',
  DIAMOND: '<:diamond:1001133450629218344>',
  MASTER: '',
  GRANDMASTER: '',
  CHALLENGER: ''
};

export const queueEmbed = (users: User[], command: QueueCommand, callerID: string) => {
  const plural = users.length === 1 ? '1 player is' : `${users.length} players are`;
  const embed = new EmbedBuilder().setTitle(`${plural} currently in the queue`).setTimestamp(new Date());
  switch (command) {
    case 'join':
      return embed.setDescription(`<@${callerID}> has joined the queue.`);
    case 'leave':
      return embed.setDescription(`<@${callerID}> has left the queue.`);
    case 'show':
      if (users.length === 0) {
        return embed;
      }

      const mentions = users.map((q) => `<@${q.id}>`);
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
        resultRanks += `${RANK_EMOJI[rank]} ${count}\n`;
      }

      return embed.addFields({ name: 'Ranks', value: resultRanks }, { name: 'Players', value: mentions.join('\n') });
  }
};
