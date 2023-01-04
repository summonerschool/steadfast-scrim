import { EmbedBuilder } from 'discord.js';
import { User } from '../entities/user';
import { POSITION_EMOJI_TRANSLATION, RANK_IMAGE_TRANSLATION } from '../utils/utils';

export const ProfileEmbed = (user: User) => {
  const roles_to_image = [user.main, user.secondary].map((x) => {
    // return `![${x}](${POSITION_IMAGE_TRANSLATION[x]})`;
    return `${POSITION_EMOJI_TRANSLATION[x]}`;
  });

  return new EmbedBuilder({
    title: `Scrim Player Setup`,
    description: `<@${user.id}>`,
    color: 0x000,
    thumbnail: {
      url: `${RANK_IMAGE_TRANSLATION[user.rank]}`
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
        name: `Rank`,
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
      }
      // {
      //   name: `OP.GG`,
      //   value: `[OP.GG](https://op.gg/summoners/${this.server}/${encodeURI(this.ign)})`,
      //   inline: true
      // }
    ]
  });
};
