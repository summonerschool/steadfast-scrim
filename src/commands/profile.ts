import { Role } from '@prisma/client';
import { CommandContext, CommandOptionType, SlashCommand, SlashCreator } from 'slash-create';
import { ProfileEmbed } from '../components/setup-feedback';
import { userService } from '../services';
import { capitalize } from '../utils/utils';

class ProfileCommand extends SlashCommand {
  constructor(creator: SlashCreator) {
    super(creator, {
      name: 'profile',
      description: 'Show my profile',
      options: [
        {
          type: CommandOptionType.SUB_COMMAND,
          name: 'show',
          description: 'Show your own profile'
        }
      ]
    });

    this.filePath = __filename;
  }

  async run(ctx: CommandContext) {
    switch (ctx.subcommands[0]) {
      case 'show': {
        const user = await userService.getUserProfile(ctx.user.id);
        return { embeds: [ProfileEmbed(user)], ephemeral: true };
      }
    }
  }
}

export default ProfileCommand;
