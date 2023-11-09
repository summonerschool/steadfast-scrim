import type { User } from '@prisma/client';
import { EmbedBuilder } from 'discord.js';
import { getEstimatedRank, POSITION_EMOJI_TRANSLATION, RANK_IMAGE_TRANSLATION } from '../utils/utils';

export const ProfileEmbed = (user: User) => {
  const roles_to_image = [user.main, user.secondary].map((x) => {
    // return `![${x}](${POSITION_IMAGE_TRANSLATION[x]})`;
    return `${POSITION_EMOJI_TRANSLATION[x]}`;
  });
  const estimatedRank = getEstimatedRank(user.elo);

  return new EmbedBuilder({
    title: `Scrim Player Setup`,
    description: `<@${user.id}>`,
    color: 0x000,
    thumbnail: {
      url: `${RANK_IMAGE_TRANSLATION[estimatedRank]}`
    },
    fields: [
      {
        name: `League IGN`,
        value: `${user.leagueIGN}`,
        inline: false
      },
      {
        name: `Server`,
        value: `${user.region}`,
        inline: true
      },
      {
        name: `SoloQ Rank`,
        value: `${user.rank}`,
        inline: true
      },
      {
        name: `Roles`,
        value: `${roles_to_image.join(', ')}`,
        inline: true
      },
      {
        name: `Estimated Elo`,
        value: `${user.elo}`,
        inline: true
      },
      {
        name: `Estimated Rank`,
        value: estimatedRank,
        inline: true
      }
    ]
  });
};
